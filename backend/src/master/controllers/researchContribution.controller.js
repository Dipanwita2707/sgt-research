/**
 * Research Contribution Controller
 * Handles CRUD operations for research paper publications, books, conferences, and grant proposals
 * Flow: draft → submitted → under_review → [changes_required → resubmitted] → approved → completed
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper function to normalize quartile values from frontend to Prisma enum names
const normalizeQuartileValue = (quartile) => {
  if (!quartile) return null;
  
  const normalized = quartile.toLowerCase().trim();
  // Map to Prisma enum names (which use underscores), not database values
  const mapping = {
    'top1': 'Top_1_',
    'top 1': 'Top_1_',
    'top 1%': 'Top_1_',
    'top1%': 'Top_1_',
    'top_1_': 'Top_1_',
    'top5': 'Top_5_',
    'top 5': 'Top_5_',
    'top 5%': 'Top_5_',
    'top5%': 'Top_5_',
    'top_5_': 'Top_5_',
    'q1': 'Q1',
    'q2': 'Q2',
    'q3': 'Q3',
    'q4': 'Q4'
  };
  
  return mapping[normalized] || quartile;
};

// Application number generation
const generateApplicationNumber = async (publicationType) => {
  const typePrefix = {
    research_paper: 'RP',
    book: 'BK',
    book_chapter: 'BC',
    conference_paper: 'CP',
    grant_proposal: 'GP'
  };

  const prefix = typePrefix[publicationType] || 'RC';
  const year = new Date().getFullYear();
  
  // Get the latest application number for this type and year
  const latestApplication = await prisma.researchContribution.findFirst({
    where: {
      applicationNumber: {
        startsWith: `${prefix}-${year}-`
      }
    },
    orderBy: {
      applicationNumber: 'desc'
    }
  });

  let sequence = 1;
  if (latestApplication && latestApplication.applicationNumber) {
    const parts = latestApplication.applicationNumber.split('-');
    sequence = parseInt(parts[2]) + 1;
  }

  return `${prefix}-${year}-${sequence.toString().padStart(4, '0')}`;
};

// Calculate incentives based on publication type, author type, indexing, etc.
// Updated Rules:
// - External authors get ZERO incentives and ZERO points
// - Students get incentives but ZERO points (employees get both)
// - First Author gets their percentage (lost if external)
// - Corresponding Author gets their percentage (lost if external)
// - If same person is First + Corresponding, they get BOTH percentages combined (lost if external)
// - Co-Authors share the remainder (100% - first - corresponding) equally among INTERNAL co-authors only
// - External co-author shares are redistributed to internal co-authors (not lost)
// - Single internal author gets 100%
//
// Parameters:
// - isInternal: Whether the current author is internal (true) or external (false)
// - internalCoAuthorCount: Number of INTERNAL co-authors (for redistribution)
// - externalFirstCorrespondingPct: Percentage lost due to external first/corresponding authors

/**
 * Analyze author composition for incentive calculation
 * Returns counts and flags needed for proper distribution
 */
const analyzeAuthorComposition = (allAuthors, applicantAuthorType = null, applicantRole = null) => {
  let internalCount = 0;
  let externalCount = 0;
  let internalCoAuthorCount = 0;
  let externalCoAuthorCount = 0;
  let internalEmployeeCoAuthorCount = 0; // NEW: Count only internal employee co-authors (excludes students)
  let externalFirstCorrespondingPct = 0;
  
  // Default role percentages for calculating lost percentages
  const firstAuthorPct = 35;
  const correspondingAuthorPct = 30;

  // Include applicant if provided
  if (applicantAuthorType !== null) {
    const isApplicantInternal = applicantAuthorType?.startsWith('internal_') || false;
    const isApplicantStudent = applicantAuthorType === 'internal_student';
    if (isApplicantInternal) {
      internalCount++;
      if (applicantRole === 'co_author' || applicantRole === 'co') {
        internalCoAuthorCount++;
        // Only count employees (non-students) for point distribution
        if (!isApplicantStudent) {
          internalEmployeeCoAuthorCount++;
        }
      }
    } else {
      externalCount++;
      if (applicantRole === 'co_author' || applicantRole === 'co') {
        externalCoAuthorCount++;
      }
      // Check if applicant is external first/corresponding - their share is LOST
      if (applicantRole === 'first_and_corresponding_author' || applicantRole === 'first_and_corresponding') {
        externalFirstCorrespondingPct += firstAuthorPct + correspondingAuthorPct;
      } else if (applicantRole === 'first_author' || applicantRole === 'first') {
        externalFirstCorrespondingPct += firstAuthorPct;
      } else if (applicantRole === 'corresponding_author' || applicantRole === 'corresponding') {
        externalFirstCorrespondingPct += correspondingAuthorPct;
      }
    }
  }

  // Process all authors
  for (const author of allAuthors) {
    const isInternal = author.authorType?.startsWith('internal_') || 
                      author.isInternal === true ||
                      false;
    
    const isStudent = author.authorType === 'internal_student';
    const role = author.authorRole || author.authorType || 'co_author';
    
    if (isInternal) {
      internalCount++;
      if (role === 'co_author' || role === 'co') {
        internalCoAuthorCount++;
        // Only count employees (non-students) for point distribution
        if (!isStudent) {
          internalEmployeeCoAuthorCount++;
        }
      }
    } else {
      externalCount++;
      if (role === 'co_author' || role === 'co') {
        externalCoAuthorCount++;
      }
      // Check if external author is first/corresponding - their share is LOST
      if (role === 'first_and_corresponding_author' || role === 'first_and_corresponding') {
        externalFirstCorrespondingPct += firstAuthorPct + correspondingAuthorPct;
      } else if (role === 'first_author' || role === 'first') {
        externalFirstCorrespondingPct += firstAuthorPct;
      } else if (role === 'corresponding_author' || role === 'corresponding') {
        externalFirstCorrespondingPct += correspondingAuthorPct;
      }
    }
  }

  return {
    internalCount,
    externalCount,
    internalCoAuthorCount,
    externalCoAuthorCount,
    internalEmployeeCoAuthorCount, // NEW: For point distribution (excludes students)
    totalCount: internalCount + externalCount,
    externalFirstCorrespondingPct, // Percentage lost due to external first/corresponding authors
    hasExternalFirstOrCorresponding: externalFirstCorrespondingPct > 0
  };
};

const calculateIncentives = async (
  contributionData, 
  publicationType, 
  authorRole, 
  isStudent = false, 
  sjrValue = 0, 
  coAuthorCount = 0, 
  totalAuthors = 1,
  isInternal = true,                    // NEW: Is this author internal?
  internalCoAuthorCount = 0,            // NEW: Count of internal co-authors only (for incentive distribution)
  externalFirstCorrespondingPct = 0,    // NEW: Percentage lost to external first/corresponding
  internalEmployeeCoAuthorCount = 0     // NEW: Count of internal employee co-authors only (for point distribution, excludes students)
) => {
  try {
    // RULE 1: External authors get ZERO incentives and points
    if (!isInternal) {
      return {
        incentiveAmount: 0,
        points: 0
      };
    }

    // Get active policy for this publication type based on publication date
    const publicationDate = contributionData.publicationDate ? new Date(contributionData.publicationDate) : new Date();
  
  console.log('[Policy Query] Looking for policy:', {
    publicationType,
    publicationDate: publicationDate.toISOString(),
  });
  
  // Check if this is a book/book_chapter/conference (use separate policies) or research paper (use ResearchIncentivePolicy)
  const isBook = publicationType === 'book';
  const isBookChapter = publicationType === 'book_chapter';
  const isConference = publicationType === 'conference_paper';
  const isBookType = isBook || isBookChapter;
  
  let policy = null;
  let bookPolicy = null;
  let bookChapterPolicy = null;
  let conferencePolicy = null;
  
  if (isBook) {
    // Use BookIncentivePolicy for books only
    bookPolicy = await prisma.bookIncentivePolicy.findFirst({
      where: {
        isActive: true,
        effectiveFrom: { lte: publicationDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: publicationDate } }
        ]
      },
      orderBy: { effectiveFrom: 'desc' }
    });
    
    console.log('[Book Policy Found]:', bookPolicy ? {
      id: bookPolicy.id,
      policyName: bookPolicy.policyName,
      effectiveFrom: bookPolicy.effectiveFrom,
      effectiveTo: bookPolicy.effectiveTo,
      authoredIncentiveAmount: bookPolicy.authoredIncentiveAmount,
      editedIncentiveAmount: bookPolicy.editedIncentiveAmount,
      splitPolicy: bookPolicy.splitPolicy
    } : 'No book policy found');
  } else if (isBookChapter) {
    // Use BookChapterIncentivePolicy for book chapters only
    bookChapterPolicy = await prisma.bookChapterIncentivePolicy.findFirst({
      where: {
        isActive: true,
        effectiveFrom: { lte: publicationDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: publicationDate } }
        ]
      },
      orderBy: { effectiveFrom: 'desc' }
    });
    
    console.log('[Book Chapter Policy Found]:', bookChapterPolicy ? {
      id: bookChapterPolicy.id,
      policyName: bookChapterPolicy.policyName,
      effectiveFrom: bookChapterPolicy.effectiveFrom,
      effectiveTo: bookChapterPolicy.effectiveTo,
      authoredIncentiveAmount: bookChapterPolicy.authoredIncentiveAmount,
      editedIncentiveAmount: bookChapterPolicy.editedIncentiveAmount,
      splitPolicy: bookChapterPolicy.splitPolicy
    } : 'No book chapter policy found');
  } else if (isConference) {
    // Use ConferenceIncentivePolicy for conference papers
    const conferenceSubType = contributionData.conferenceSubType;
    
    // Skip policy lookup if conferenceSubType is not provided (during draft saves)
    if (conferenceSubType) {
      conferencePolicy = await prisma.conferenceIncentivePolicy.findFirst({
        where: {
          conferenceSubType: conferenceSubType,
          isActive: true,
          effectiveFrom: { lte: publicationDate },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: publicationDate } }
          ]
        },
        orderBy: { effectiveFrom: 'desc' }
      });
    }
    
    console.log('[Conference Policy Found]:', conferenceSubType ? (conferencePolicy ? {
      id: conferencePolicy.id,
      policyName: conferencePolicy.policyName,
      conferenceSubType: conferencePolicy.conferenceSubType,
      effectiveFrom: conferencePolicy.effectiveFrom,
      effectiveTo: conferencePolicy.effectiveTo,
      hasQuartileIncentives: !!conferencePolicy.quartileIncentives,
      flatIncentiveAmount: conferencePolicy.flatIncentiveAmount,
      flatPoints: conferencePolicy.flatPoints
    } : 'No conference policy found') : 'Conference subtype not yet selected');
  } else {
    // Use ResearchIncentivePolicy for research papers, grants, etc.
    policy = await prisma.researchIncentivePolicy.findFirst({
      where: {
        publicationType: publicationType,
        isActive: true,
        effectiveFrom: { lte: publicationDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: publicationDate } }
        ]
      },
      orderBy: { effectiveFrom: 'desc' }
    });
    
    console.log('[Research Policy Found]:', policy ? {
      id: policy.id,
      policyName: policy.policyName,
      effectiveFrom: policy.effectiveFrom,
      effectiveTo: policy.effectiveTo,
      hasIndexingBonuses: !!policy.indexingBonuses,
      indexingBonusesKeys: policy.indexingBonuses ? Object.keys(policy.indexingBonuses) : []
    } : 'No policy found, using defaults');
  }

  // BOOK/BOOK CHAPTER POLICY CALCULATION - Different structure than research papers
  if (isBookType) {
    console.log('[Book/BookChapter Calculation] Starting incentive calculation', {
      isBook,
      isBookChapter,
      hasBookPolicy: !!bookPolicy,
      hasBookChapterPolicy: !!bookChapterPolicy,
      bookType: contributionData.bookType,
      totalAuthors,
      internalCoAuthorCount
    });

    // Use the correct policy based on publication type, or use default values
    const activePolicy = isBook ? bookPolicy : bookChapterPolicy;
    const policy = activePolicy || {
      authoredIncentiveAmount: 50000,
      authoredPoints: 50,
      editedIncentiveAmount: 40000,
      editedPoints: 40,
      splitPolicy: 'equal',
      indexingBonuses: {
        scopus_indexed: 10000,
        non_indexed: 0,
        sgt_publication_house: 2000
      },
      internationalBonus: 5000
    };

    // For books, we use authored/edited distinction instead of quartiles
    const isAuthored = contributionData.bookType === 'authored';
    const isEdited = contributionData.bookType === 'edited';
    
    let baseIncentive = 0;
    let basePoints = 0;
    
    if (isAuthored) {
      baseIncentive = policy.authoredIncentiveAmount || 50000;
      basePoints = policy.authoredPoints || 50;
    } else if (isEdited) {
      baseIncentive = policy.editedIncentiveAmount || 40000;
      basePoints = policy.editedPoints || 40;
    } else {
      // Default to authored if not specified
      baseIncentive = policy.authoredIncentiveAmount || 50000;
      basePoints = policy.authoredPoints || 50;
    }
    
    // Apply indexing bonuses if applicable
    const indexingBonuses = policy.indexingBonuses || {};
    if (contributionData.indexing === 'scopus_indexed') {
      baseIncentive += indexingBonuses.scopus_indexed || 0;
    } else if (contributionData.indexing === 'non_indexed') {
      baseIncentive += indexingBonuses.non_indexed || 0;
    } else if (contributionData.indexing === 'sgt_publication_house') {
      baseIncentive += indexingBonuses.sgt_publication_house || 0;
    }
    
    // Apply international bonus
    if (contributionData.isInternational) {
      baseIncentive += policy.internationalBonus || 0;
    }
    
    // Apply split policy - equal or weighted
    let authorShare = 0;
    let pointShare = 0;
    
    // For equal split, divide among all authors equally
    // totalAuthors is passed in as the actual author count
    const effectiveAuthorCount = Math.max(totalAuthors, 1);
    authorShare = baseIncentive / effectiveAuthorCount;
    pointShare = basePoints / effectiveAuthorCount;
    
    console.log('[Book Calculation] Result:', {
      baseIncentive,
      basePoints,
      effectiveAuthorCount,
      authorShare,
      pointShare,
      isStudent
    });
    
    // Students get incentives but no points
    if (isStudent) {
      return {
        incentiveAmount: Math.round(authorShare),
        points: 0
      };
    }
    
    return {
      incentiveAmount: Math.round(authorShare),
      points: Math.round(pointShare)
    };
  }

  // CONFERENCE PAPER POLICY CALCULATION
  if (isConference) {
    const conferenceSubType = contributionData.conferenceSubType;
    
    // If no conferenceSubType yet (draft save), return zeros
    if (!conferenceSubType) {
      console.log('[Conference Calculation] No conference subtype provided, returning zeros');
      return {
        incentiveAmount: 0,
        points: 0
      };
    }

    console.log('[Conference Calculation] Starting incentive calculation', {
      conferenceSubType,
      hasConferencePolicy: !!conferencePolicy,
      totalAuthors,
      internalCoAuthorCount
    });

    // For paper_indexed_scopus - use quartile-based calculation similar to research
    if (conferenceSubType === 'paper_indexed_scopus') {
      // Default quartile incentives for conference papers
      const defaultConferenceQuartileIncentives = [
        { quartile: 'Top 1%', incentiveAmount: 60000, points: 60 },
        { quartile: 'Top 5%', incentiveAmount: 50000, points: 50 },
        { quartile: 'Q1', incentiveAmount: 40000, points: 40 },
        { quartile: 'Q2', incentiveAmount: 25000, points: 25 },
        { quartile: 'Q3', incentiveAmount: 12000, points: 12 },
        { quartile: 'Q4', incentiveAmount: 5000, points: 5 },
      ];

      const defaultRolePercentages = [
        { role: 'first_author', percentage: 35 },
        { role: 'corresponding_author', percentage: 30 },
      ];

      // Get data from policy or use defaults
      const quartileIncentives = conferencePolicy?.quartileIncentives || defaultConferenceQuartileIncentives;
      const rolePercentages = conferencePolicy?.rolePercentages || defaultRolePercentages;
      
      // Get the total pool based on proceedings quartile
      let totalAmount = 0;
      let totalPoints = 0;
      
      // Helper to convert Prisma enum names to display names for matching
      const toDisplayQuartile = (q) => {
        if (!q) return '';
        const displayMapping = {
          'Top_1_': 'Top 1%',
          'Top_5_': 'Top 5%',
          'Q1': 'Q1', 'Q2': 'Q2', 'Q3': 'Q3', 'Q4': 'Q4'
        };
        return displayMapping[q] || q;
      };
      
      // Use proceedingsQuartile for conference papers
      const quartile = contributionData.proceedingsQuartile;
      if (quartile) {
        const displayQuartile = toDisplayQuartile(quartile);
        const quartileMatch = quartileIncentives.find(q => 
          q.quartile.toUpperCase() === displayQuartile.toUpperCase() ||
          q.quartile.toUpperCase() === quartile.toUpperCase()
        );
        if (quartileMatch) {
          totalAmount = Number(quartileMatch.incentiveAmount) || 0;
          totalPoints = Number(quartileMatch.points) || 0;
        }
      }
      
      // Apply international bonus - based on conference type (national/international)
      const isInternational = contributionData.conferenceType === 'international';
      if (isInternational && conferencePolicy?.internationalBonus) {
        totalAmount += Number(conferencePolicy.internationalBonus) || 0;
      }
      
      // Apply best paper award bonus - only if explicitly 'yes'
      if (contributionData.conferenceBestPaperAward === 'yes' && conferencePolicy?.bestPaperAwardBonus) {
        totalAmount += Number(conferencePolicy.bestPaperAwardBonus) || 0;
      }

      // Get role percentages from policy
      const firstAuthorPct = rolePercentages.find(rp => rp.role === 'first_author')?.percentage || 35;
      const correspondingAuthorPct = rolePercentages.find(rp => rp.role === 'corresponding_author')?.percentage || 30;
      const coAuthorTotalPct = 100 - firstAuthorPct - correspondingAuthorPct;

      // Calculate percentage based on role
      // Distribution Rules:
      // - Single author: 100%
      // - First author: 35% (from policy)
      // - Corresponding author: 30% (from policy)
      // - First + Corresponding: 65% (35% + 30%)
      // - Co-authors: Remaining 35% divided equally among internal co-authors
      let rolePercentage = 0;
      let calculationNote = '';
      
      if (totalAuthors === 1) {
        // Case 1: Single author gets 100%
        rolePercentage = 100 - externalFirstCorrespondingPct;
        calculationNote = `Single author: 100%`;
      } else if (totalAuthors === 2 && internalCoAuthorCount === 0 && coAuthorCount === 0) {
        // Case 2: Two authors, both first+corresponding (rare edge case)
        rolePercentage = 50;
        calculationNote = `Two authors special case: 50% each`;
      } else if (authorRole === 'first_and_corresponding_author' || authorRole === 'first_and_corresponding') {
        // Case 3: First + Corresponding author
        rolePercentage = firstAuthorPct + correspondingAuthorPct;
        calculationNote = `First + Corresponding: ${firstAuthorPct}% + ${correspondingAuthorPct}% = ${rolePercentage}%`;
      } else if (authorRole === 'first_author') {
        // Case 4: First author only
        rolePercentage = firstAuthorPct;
        calculationNote = `First author: ${firstAuthorPct}%`;
      } else if (authorRole === 'corresponding_author') {
        // Case 5: Corresponding author only
        rolePercentage = correspondingAuthorPct;
        calculationNote = `Corresponding author: ${correspondingAuthorPct}%`;
      } else if (authorRole === 'co_author') {
        // Case 6: Co-author (share remaining 35% among all internal co-authors)
        const effectiveInternalCoAuthorCount = Math.max(internalCoAuthorCount, 1);
        rolePercentage = coAuthorTotalPct / effectiveInternalCoAuthorCount;
        calculationNote = `Co-author: ${coAuthorTotalPct}% ÷ ${effectiveInternalCoAuthorCount} internal co-authors = ${rolePercentage.toFixed(2)}%`;
      } else {
        // Default: treat as co-author
        const effectiveInternalCoAuthorCount = Math.max(internalCoAuthorCount, 1);
        rolePercentage = coAuthorTotalPct / effectiveInternalCoAuthorCount;
        calculationNote = `Default co-author: ${coAuthorTotalPct}% ÷ ${effectiveInternalCoAuthorCount} = ${rolePercentage.toFixed(2)}%`;
      }

      console.log('[Conference Distribution Logic]:', {
        totalAuthors,
        authorRole,
        internalCoAuthorCount,
        firstAuthorPct,
        correspondingAuthorPct,
        coAuthorTotalPct,
        calculationNote
      });

      const authorIncentive = Math.round((totalAmount * rolePercentage) / 100);
      
      // For points: co-authors split points only among internal EMPLOYEES (excluding students)
      // BUT: Single authors should get 100%, not be treated as co-authors
      let pointPercentage = rolePercentage;
      let pointCalculationNote = calculationNote;
      if (authorRole === 'co_author' && totalAuthors > 1) {
        // Only recalculate for multi-author papers where this person is a co-author
        const effectiveEmployeeCoAuthorCount = Math.max(internalEmployeeCoAuthorCount, 1);
        pointPercentage = coAuthorTotalPct / effectiveEmployeeCoAuthorCount;
        pointCalculationNote = `Co-author points: ${coAuthorTotalPct}% ÷ ${effectiveEmployeeCoAuthorCount} employee co-authors = ${pointPercentage.toFixed(2)}%`;
      }
      
      const authorPoints = Math.round((totalPoints * pointPercentage) / 100);

      console.log('[Conference Scopus Calculation] Result:', {
        quartile,
        totalAmount,
        totalPoints,
        rolePercentage: `${rolePercentage.toFixed(2)}%`,
        pointPercentage: `${pointPercentage.toFixed(2)}%`,
        authorIncentive: `₹${authorIncentive}`,
        authorPoints,
        isStudent,
        incentiveNote: calculationNote,
        pointNote: pointCalculationNote
      });

      if (isStudent) {
        return {
          incentiveAmount: authorIncentive,
          points: 0
        };
      }

      return {
        incentiveAmount: authorIncentive,
        points: authorPoints
      };
    } else {
      // For other conference types (paper_not_indexed, keynote_speaker_invited_talks, organizer_coordinator_member)
      // Use flat incentive amount - no quartile categorization
      
      // Default incentives based on national vs international
      const defaultFlatIncentive = {
        'paper_not_indexed': {
          national: { incentiveAmount: 10000, points: 10 },
          international: { incentiveAmount: 15000, points: 15 }
        },
        'keynote_speaker_invited_talks': {
          national: { incentiveAmount: 10000, points: 10 },
          international: { incentiveAmount: 20000, points: 20 }
        },
        'organizer_coordinator_member': {
          national: { incentiveAmount: 5000, points: 5 },
          international: { incentiveAmount: 10000, points: 10 }
        }
      };

      let baseIncentive = 0;
      let basePoints = 0;

      // Check if conference is international based on multiple fields
      const isInternational = 
        contributionData.conferenceType === 'international' ||
        contributionData.nationalInternational === 'international' || 
        contributionData.conferenceHeldLocation === 'abroad';

      if (conferencePolicy) {
        baseIncentive = Number(conferencePolicy.flatIncentiveAmount) || 0;
        basePoints = Number(conferencePolicy.flatPoints) || 0;
        
        // Apply international bonus if from policy
        if (isInternational && conferencePolicy.internationalBonus) {
          baseIncentive += Number(conferencePolicy.internationalBonus) || 0;
        }
      } else {
        // Use defaults based on conference sub-type and national/international status
        const subTypeDefaults = defaultFlatIncentive[conferenceSubType];
        if (subTypeDefaults) {
          const levelDefaults = isInternational ? subTypeDefaults.international : subTypeDefaults.national;
          baseIncentive = levelDefaults.incentiveAmount;
          basePoints = levelDefaults.points;
        } else {
          // Fallback to paper_not_indexed defaults
          const levelDefaults = isInternational ? 
            defaultFlatIncentive['paper_not_indexed'].international : 
            defaultFlatIncentive['paper_not_indexed'].national;
          baseIncentive = levelDefaults.incentiveAmount;
          basePoints = levelDefaults.points;
        }
      }
      
      // Apply best paper award bonus (mainly for paper types)
      if (contributionData.conferenceBestPaperAward === 'yes' && conferencePolicy?.bestPaperAwardBonus) {
        baseIncentive += Number(conferencePolicy.bestPaperAwardBonus) || 0;
      }

      // For keynote speakers and organizers, typically single person gets full amount
      // For paper_not_indexed, split equally among authors
      let authorShare = 0;
      let pointShare = 0;
      
      if (conferenceSubType === 'keynote_speaker_invited_talks' || conferenceSubType === 'organizer_coordinator_member') {
        // Single presenter/organizer gets full amount (no split)
        authorShare = baseIncentive;
        pointShare = basePoints;
      } else {
        // paper_not_indexed and others: split equally among all authors
        const effectiveAuthorCount = Math.max(totalAuthors, 1);
        authorShare = baseIncentive / effectiveAuthorCount;
        pointShare = basePoints / effectiveAuthorCount;
      }

      console.log('[Conference Flat Calculation] Result:', {
        conferenceSubType,
        isInternational,
        baseIncentive,
        basePoints,
        totalAuthors,
        authorShare,
        pointShare,
        isStudent,
        splitLogic: (conferenceSubType === 'keynote_speaker_invited_talks' || conferenceSubType === 'organizer_coordinator_member') 
          ? 'Full amount to single person' 
          : `Split equally among ${totalAuthors} authors`
      });

      if (isStudent) {
        return {
          incentiveAmount: Math.round(authorShare),
          points: 0
        };
      }

      return {
        incentiveAmount: Math.round(authorShare),
        points: Math.round(pointShare)
      };
    }
  }

  // RESEARCH PAPER POLICY CALCULATION (original logic below)
  // Default quartile incentives
  const defaultQuartileIncentives = [
    { quartile: 'Top 1%', incentiveAmount: 75000, points: 75 },  // Higher tier for Top 1%
    { quartile: 'Top 5%', incentiveAmount: 60000, points: 60 },  // Higher tier for Top 5%
    { quartile: 'Q1', incentiveAmount: 50000, points: 50 },
    { quartile: 'Q2', incentiveAmount: 30000, points: 30 },
    { quartile: 'Q3', incentiveAmount: 15000, points: 15 },
    { quartile: 'Q4', incentiveAmount: 5000, points: 5 },
  ];

  // Default SJR ranges (optional override)
  const defaultSJRRanges = [
    { minSJR: 2.0, maxSJR: 999, incentiveAmount: 50000, points: 50 },
    { minSJR: 1.0, maxSJR: 1.99, incentiveAmount: 30000, points: 30 },
    { minSJR: 0.5, maxSJR: 0.99, incentiveAmount: 15000, points: 15 },
    { minSJR: 0.0, maxSJR: 0.49, incentiveAmount: 5000, points: 5 },
  ];

  // Default role percentages (only first_author and corresponding_author defined)
  // Co-author percentage is auto-calculated as: 100 - first - corresponding
  const defaultRolePercentages = [
    { role: 'first_author', percentage: 35 },
    { role: 'corresponding_author', percentage: 30 },
  ];

  // Get data from policy or use defaults
  const quartileIncentives = policy?.indexingBonuses?.quartileIncentives || defaultQuartileIncentives;
  const sjrRanges = policy?.indexingBonuses?.sjrRanges || [];
  const rolePercentages = policy?.indexingBonuses?.rolePercentages || defaultRolePercentages;
  
  console.log('[Policy Data]:', {
    usingPolicy: !!policy,
    quartileIncentivesCount: quartileIncentives.length,
    sjrRangesCount: sjrRanges.length,
    rolePercentagesCount: rolePercentages.length,
    quartileIncentives: quartileIncentives,
    rolePercentages: rolePercentages
  });
  
  // Get the total pool based on quartile first, then check SJR override
  let totalAmount = 0;
  let totalPoints = 0;
  
  // Helper to convert Prisma enum names to display names for matching
  const toDisplayQuartile = (q) => {
    if (!q) return '';
    const displayMapping = {
      'Top_1_': 'Top 1%',
      'Top_5_': 'Top 5%',
      'Q1': 'Q1', 'Q2': 'Q2', 'Q3': 'Q3', 'Q4': 'Q4'
    };
    return displayMapping[q] || q;
  };
  
  // First try quartile-based incentives (primary/mandatory)
  let quartile = contributionData.quartile;
  if (quartile) {
    // Convert Prisma enum name to display name for matching with policy
    const displayQuartile = toDisplayQuartile(quartile);
    const quartileMatch = quartileIncentives.find(q => 
      q.quartile.toUpperCase() === displayQuartile.toUpperCase() ||
      q.quartile.toUpperCase() === quartile.toUpperCase()
    );
    if (quartileMatch) {
      totalAmount = Number(quartileMatch.incentiveAmount) || 0;
      totalPoints = Number(quartileMatch.points) || 0;
    }
  }
  
  // If SJR ranges are defined and we have SJR value, check for override
  const sjrVal = Number(sjrValue) || 0;
  if (sjrRanges.length > 0 && sjrVal > 0) {
    const matchingRange = sjrRanges.find(range => sjrVal >= range.minSJR && sjrVal <= range.maxSJR);
    if (matchingRange) {
      totalAmount = Number(matchingRange.incentiveAmount) || totalAmount;
      totalPoints = Number(matchingRange.points) || totalPoints;
    }
  }
  
  // Fallback to default SJR ranges if no quartile and no policy-defined ranges matched
  if (totalAmount === 0) {
    const fallbackRange = defaultSJRRanges.find(range => sjrVal >= range.minSJR && sjrVal <= range.maxSJR)
      || defaultSJRRanges[defaultSJRRanges.length - 1];
    totalAmount = Number(fallbackRange.incentiveAmount) || 0;
    totalPoints = Number(fallbackRange.points) || 0;
  }

  // Get role percentages from policy
  const firstAuthorPct = rolePercentages.find(rp => rp.role === 'first_author')?.percentage || 35;
  const correspondingAuthorPct = rolePercentages.find(rp => rp.role === 'corresponding_author')?.percentage || 30;
  const coAuthorTotalPct = 100 - firstAuthorPct - correspondingAuthorPct;

  // Calculate percentage based on role
  let rolePercentage = 0;
  
  // Single internal author gets 100% (minus any lost external first/corresponding share)
  if (totalAuthors === 1) {
    rolePercentage = 100 - externalFirstCorrespondingPct;
  }
  // Special case: Exactly 2 authors with NO co-authors (one first, one corresponding)
  // They split 50-50 regardless of policy percentages
  else if (totalAuthors === 2 && internalCoAuthorCount === 0 && coAuthorCount === 0) {
    rolePercentage = 50;
  }
  // First and Corresponding author (same person) gets BOTH percentages combined
  else if (authorRole === 'first_and_corresponding_author' || authorRole === 'first_and_corresponding') {
    rolePercentage = firstAuthorPct + correspondingAuthorPct;
  }
  // First author gets their percentage
  else if (authorRole === 'first_author') {
    rolePercentage = firstAuthorPct;
  }
  // Corresponding author gets their percentage
  else if (authorRole === 'corresponding_author') {
    rolePercentage = correspondingAuthorPct;
  }
  // Co-authors split the remainder equally among INTERNAL co-authors only
  else if (authorRole === 'co_author') {
    // Use internal co-author count for redistribution (external co-author shares go to internal)
    const effectiveInternalCoAuthorCount = Math.max(internalCoAuthorCount, 1);
    // Co-author pool is NOT reduced - external co-author shares are redistributed to internal co-authors
    rolePercentage = coAuthorTotalPct / effectiveInternalCoAuthorCount;
  }
  // Default fallback
  else {
    const effectiveInternalCoAuthorCount = Math.max(internalCoAuthorCount, 1);
    rolePercentage = coAuthorTotalPct / effectiveInternalCoAuthorCount;
  }

  // Calculate this author's share based on role percentage
  const authorIncentive = Math.round((totalAmount * rolePercentage) / 100);
  
  // POINTS CALCULATION: Separate logic to exclude students from denominator
  // For co-authors: points are divided only among EMPLOYEES (not students)
  let pointPercentage = rolePercentage;
  if (authorRole === 'co_author') {
    // Use employee co-author count for point distribution (excludes students)
    const effectiveEmployeeCoAuthorCount = Math.max(internalEmployeeCoAuthorCount, 1);
    pointPercentage = coAuthorTotalPct / effectiveEmployeeCoAuthorCount;
  }
  
  const authorPoints = Math.round((totalPoints * pointPercentage) / 100);

  // RULE 2: Students get only incentives, no points (employees get both)
  if (isStudent) {
    return {
      incentiveAmount: authorIncentive,
      points: 0
    };
  }

  return {
    incentiveAmount: authorIncentive,
    points: authorPoints
  };
  } catch (error) {
    console.error('[calculateIncentives] Error:', error);
    console.error('[calculateIncentives] Context:', {
      publicationType,
      authorRole,
      isStudent,
      contributionTitle: contributionData?.title
    });
    // Return zero incentives on error rather than breaking the approval
    return {
      incentiveAmount: 0,
      points: 0
    };
  }
};

/**
 * Create a new research contribution
 */
exports.createResearchContribution = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    console.log('[createResearchContribution] Request body conference fields:', {
      publicationType: req.body.publicationType,
      conferenceSubType: req.body.conferenceSubType,
      proceedingsQuartile: req.body.proceedingsQuartile,
      conferenceName: req.body.conferenceName
    });

    const {
      publicationType,
      title,
      abstract,
      keywords,
      schoolId,
      departmentId,
      // Research paper fields
      targetedResearchType,
      internationalAuthor,
      foreignCollaborationsCount,
      impactFactor,
      quartile,
      sjr,
      interdisciplinaryFromSgt,
      studentsFromSgt,
      journalName,
      totalAuthors,
      sgtAffiliatedAuthors,
      internalCoAuthors,
      issue,
      pageNumbers,
      doi,
      issn,
      publisherName,
      // Book/Chapter fields
      isbn,
      edition,
      chapterNumber,
      bookTitle,
      editors,
      publisherLocation,
      nationalInternational,
      bookPublicationType,
      bookIndexingType,
      bookLetter,
      communicatedWithOfficialId,
      personalEmail,
      facultyRemarks,
      // Conference fields
      conferenceName,
      conferenceLocation,
      conferenceDate,
      proceedingsTitle,
      // Conference Extended fields
      conferenceSubType,
      proceedingsQuartile,
      totalPresenters,
      isPresenter,
      virtualConference,
      fullPaper,
      conferenceHeldAtSgt,
      conferenceBestPaperAward,
      industryCollaboration,
      centralFacilityUsed,
      issnIsbnIssueNo,
      paperDoi,
      weblink,
      paperweblink,
      priorityFundingArea,
      conferenceRole,
      indexedIn,
      conferenceHeldLocation,
      venue,
      topic,
      attendedVirtual,
      eventCategory,
      organizerRole,
      conferenceType,
      // Grant fields
      fundingAgency,
      proposalType,
      requestedAmount,
      sanctionedAmount,
      projectDurationMonths,
      projectStartDate,
      projectEndDate,
      // Common fields
      publicationDate,
      publicationStatus,
      manuscriptFilePath,
      supportingDocsFilePaths,
      indexingDetails,
      sdgGoals,
      // Applicant details
      applicantDetails,
      // Authors
      authors,
      // Author type of the applicant
      authorType
    } = req.body;
    
    // Ensure sdgGoals is an array, not null
    const sanitizedSdgGoals = sdgGoals === null || sdgGoals === undefined ? [] : sdgGoals;

    // Determine applicant type
    let applicantType = 'internal_faculty';
    const isStudent = userRole === 'student';
    if (isStudent) {
      applicantType = 'internal_student';
    } else if (userRole === 'staff') {
      applicantType = 'internal_staff';
    }

    // Generate application number
    const applicationNumber = await generateApplicationNumber(publicationType);

    // Count total authors and co-authors for incentive calculation
    const authorsList = authors || [];
    const totalAuthorCount = authorsList.length || 1;
    
    // Get applicant's author role from the first author (which should be the applicant)
    const applicantAuthorRole = authorsList.length > 0 ? authorsList[0].authorRole : 'co_author';
    
    // For single author, treat as first_and_corresponding to get 100% share
    const effectiveApplicantRole = (totalAuthorCount === 1 && authorsList.length === 0) 
      ? 'first_and_corresponding_author' 
      : applicantAuthorRole || 'co_author';
    
    // Analyze author composition for proper incentive distribution
    // Includes applicant as part of the analysis
    const authorComposition = analyzeAuthorComposition(
      authorsList, 
      applicantType, 
      effectiveApplicantRole
    );

    // Determine if applicant is internal (always true for staff/student/faculty)
    const isApplicantInternal = applicantType?.startsWith('internal_') || true;

    // Calculate pre-determined incentives based on quartile/SJR and author role percentage
    // Students get only incentives, no points
    // External authors get nothing
    const sjrValue = Number(sjr) || 0;
    const incentiveCalculation = await calculateIncentives(
      { 
        publicationDate, 
        quartile,
        conferenceSubType,
        proceedingsQuartile
      },
      publicationType,
      effectiveApplicantRole,
      isStudent,
      sjrValue,
      authorComposition.internalCoAuthorCount + authorComposition.externalCoAuthorCount, // total co-authors for reference
      totalAuthorCount,
      isApplicantInternal,                           // NEW: is this author internal
      authorComposition.internalCoAuthorCount,       // NEW: internal co-author count for redistribution
      authorComposition.externalFirstCorrespondingPct, // NEW: percentage lost to external first/corresponding
      authorComposition.internalEmployeeCoAuthorCount // NEW: employee co-authors for point division
    );

    // Resolve and validate school/department references to avoid FK violations
    let resolvedSchoolId = schoolId || null;
    let resolvedDepartmentId = departmentId || null;

    // Validate provided department and derive school if missing
    if (resolvedDepartmentId) {
      const departmentRecord = await prisma.department.findUnique({
        where: { id: resolvedDepartmentId },
        select: { id: true, facultyId: true }
      });

      if (!departmentRecord) {
        console.warn('Invalid departmentId provided for research contribution. Falling back to applicant defaults.', {
          departmentId: resolvedDepartmentId,
          userId
        });
        resolvedDepartmentId = null;
      } else if (!resolvedSchoolId && departmentRecord.facultyId) {
        resolvedSchoolId = departmentRecord.facultyId;
      }
    }

    // Validate provided school
    if (resolvedSchoolId) {
      const schoolRecord = await prisma.facultySchoolList.findUnique({
        where: { id: resolvedSchoolId },
        select: { id: true }
      });

      if (!schoolRecord) {
        console.warn('Invalid schoolId provided for research contribution. Falling back to applicant defaults.', {
          schoolId: resolvedSchoolId,
          userId
        });
        resolvedSchoolId = null;
      }
    }

    // If either school or department missing/invalid, fall back to applicant's primary mapping
    if (!resolvedSchoolId || !resolvedDepartmentId) {
      const applicantEmployee = await prisma.employeeDetails.findFirst({
        where: { userLoginId: userId },
        select: {
          primaryDepartmentId: true,
          primaryDepartment: {
            select: {
              id: true,
              facultyId: true
            }
          }
        }
      });

      if (!resolvedDepartmentId && applicantEmployee?.primaryDepartmentId) {
        resolvedDepartmentId = applicantEmployee.primaryDepartmentId;
      }

      if (!resolvedSchoolId) {
        resolvedSchoolId = applicantEmployee?.primaryDepartment?.facultyId || null;
      }
    }

    // Truncate string fields to match database column limits
    const truncateField = (value, maxLength) => {
      if (!value) return value;
      return String(value).substring(0, maxLength);
    };

    console.log('[createResearchContribution] Before saving - conferenceSubType value:', {
      conferenceSubType,
      type: typeof conferenceSubType,
      truncated: truncateField(conferenceSubType, 64),
      isEmpty: !conferenceSubType,
      isEmptyString: conferenceSubType === ''
    });

    // Create the research contribution
    const contribution = await prisma.researchContribution.create({
      data: {
        applicationNumber,
        applicantUser: {
          connect: { id: userId }
        },
        applicantType,
        publicationType,
        title: truncateField(title, 512),
        abstract,
        keywords: truncateField(keywords, 512),
        ...(resolvedSchoolId && {
          school: {
            connect: { id: resolvedSchoolId }
          }
        }),
        ...(resolvedDepartmentId && {
          department: {
            connect: { id: resolvedDepartmentId }
          }
        }),
        status: 'draft',
        // Research paper fields
        targetedResearchType,
        internationalAuthor: internationalAuthor || false,
        foreignCollaborationsCount: foreignCollaborationsCount || 0,
        impactFactor: impactFactor ? Number(impactFactor) : null,
        quartile: normalizeQuartileValue(quartile),
        sjr: sjr ? Number(sjr) : null,
        interdisciplinaryFromSgt: interdisciplinaryFromSgt || false,
        studentsFromSgt: studentsFromSgt || false,
        journalName: truncateField(journalName, 512),
        totalAuthors: totalAuthors || 1,
        sgtAffiliatedAuthors: sgtAffiliatedAuthors || 1,
        internalCoAuthors: internalCoAuthors || 0,
        issue: truncateField(issue, 64),
        pageNumbers: truncateField(pageNumbers, 64),
        doi: truncateField(doi, 256),
        issn: truncateField(issn, 32),
        publisherName: truncateField(publisherName, 256),
        // Book/Chapter fields
        isbn: truncateField(isbn, 32),
        edition: truncateField(edition, 64),
        chapterNumber: truncateField(chapterNumber, 32),
        bookTitle: truncateField(bookTitle, 512),
        editors: truncateField(editors, 512),
        publisherLocation: truncateField(publisherLocation, 256),
        nationalInternational: truncateField(nationalInternational, 32),
        bookPublicationType: truncateField(bookPublicationType, 32),
        bookIndexingType: truncateField(bookIndexingType, 32),
        bookLetter: truncateField(bookLetter, 8),
        communicatedWithOfficialId: communicatedWithOfficialId === 'yes' || communicatedWithOfficialId === true,
        personalEmail: truncateField(personalEmail, 256),
        facultyRemarks,
        // Conference fields
        conferenceName: truncateField(conferenceName, 512),
        conferenceLocation: truncateField(conferenceLocation, 256),
        conferenceDate: conferenceDate ? new Date(conferenceDate) : null,
        proceedingsTitle: truncateField(proceedingsTitle, 512),
        // Conference Extended fields
        conferenceSubType: truncateField(conferenceSubType, 64),
        proceedingsQuartile: truncateField(proceedingsQuartile, 16),
        totalPresenters: totalPresenters ? Number(totalPresenters) : 1,
        isPresenter: isPresenter === 'yes' || isPresenter === true,
        virtualConference: virtualConference === 'yes' || virtualConference === true,
        fullPaper: fullPaper === 'yes' || fullPaper === true,
        conferenceHeldAtSgt: conferenceHeldAtSgt === 'yes' || conferenceHeldAtSgt === true,
        conferenceBestPaperAward: conferenceBestPaperAward === 'yes' || conferenceBestPaperAward === true,
        industryCollaboration: industryCollaboration === 'yes' || industryCollaboration === true,
        centralFacilityUsed: centralFacilityUsed === 'yes' || centralFacilityUsed === true,
        issnIsbnIssueNo: truncateField(issnIsbnIssueNo, 64),
        paperDoi: truncateField(paperDoi, 256),
        weblink: truncateField(weblink, 512),
        paperweblink: truncateField(paperweblink, 512),
        priorityFundingArea: truncateField(priorityFundingArea, 256),
        conferenceRole: truncateField(conferenceRole, 64),
        indexedIn: truncateField(indexedIn, 32),
        conferenceHeldLocation: truncateField(conferenceHeldLocation, 32),
        venue: truncateField(venue, 512),
        topic: truncateField(topic, 512),
        attendedVirtual: attendedVirtual === 'yes' || attendedVirtual === true,
        eventCategory: truncateField(eventCategory, 32),
        organizerRole: truncateField(organizerRole, 64),
        conferenceType: truncateField(conferenceType, 32),
        // Grant fields
        fundingAgency: truncateField(fundingAgency, 256),
        proposalType: truncateField(proposalType, 64),
        requestedAmount: requestedAmount ? Number(requestedAmount) : null,
        sanctionedAmount: sanctionedAmount ? Number(sanctionedAmount) : null,
        projectDurationMonths,
        projectStartDate: projectStartDate ? new Date(projectStartDate) : null,
        projectEndDate: projectEndDate ? new Date(projectEndDate) : null,
        // Common fields
        publicationDate: publicationDate ? new Date(publicationDate) : null,
        publicationStatus: truncateField(publicationStatus, 64),
        manuscriptFilePath: truncateField(manuscriptFilePath, 512),
        supportingDocsFilePaths,
        indexingDetails,
        sdg_goals: sanitizedSdgGoals,
        // Pre-calculated incentives
        calculatedIncentiveAmount: incentiveCalculation.incentiveAmount,
        calculatedPoints: incentiveCalculation.points
      }
    });

    // Create applicant details
    if (applicantDetails) {
      await prisma.researchContributionApplicantDetails.create({
        data: {
          researchContributionId: contribution.id,
          employeeCategory: truncateField(applicantDetails.employeeCategory, 64),
          employeeType: truncateField(applicantDetails.employeeType, 64),
          uid: truncateField(applicantDetails.uid, 64),
          email: truncateField(applicantDetails.email, 256),
          phone: truncateField(applicantDetails.phone, 20),
          universityDeptName: truncateField(applicantDetails.universityDeptName, 256),
          mentorName: truncateField(applicantDetails.mentorName, 256),
          mentorUid: truncateField(applicantDetails.mentorUid, 64),
          isPhdWork: applicantDetails.isPhdWork || false,
          phdTitle: truncateField(applicantDetails.phdTitle, 512),
          phdObjectives: applicantDetails.phdObjectives,
          coveredObjectives: truncateField(applicantDetails.coveredObjectives, 256),
          addressesSocietal: applicantDetails.addressesSocietal || false,
          addressesGovernment: applicantDetails.addressesGovernment || false,
          addressesEnvironmental: applicantDetails.addressesEnvironmental || false,
          addressesIndustrial: applicantDetails.addressesIndustrial || false,
          addressesBusiness: applicantDetails.addressesBusiness || false,
          addressesConceptual: applicantDetails.addressesConceptual || false,
          enrichesDiscipline: applicantDetails.enrichesDiscipline || false,
          isNewsworthy: applicantDetails.isNewsworthy || false,
          metadata: applicantDetails.metadata || {}
        }
      });
    }

    // Create authors/co-authors
    if (authors && authors.length > 0) {
      for (const author of authors) {
        // Try to find user by registration number or UID
        let authorUserId = null;
        if (author.registrationNumber || author.uid) {
          const user = await prisma.userLogin.findFirst({
            where: {
              uid: author.registrationNumber || author.uid
            }
          });
          if (user) {
            authorUserId = user.id;
          }
        }

        // Map authorRole to the correct enum value for authorType
        // Frontend sends: first_author, corresponding_author, co_author, first_and_corresponding, etc.
        // Schema expects: first_author, corresponding_author, co_author, first_and_corresponding_author
        let mappedAuthorType = 'co_author';
        if (author.authorRole === 'first_and_corresponding' || author.authorRole === 'first_and_corresponding_author') {
          mappedAuthorType = 'first_and_corresponding_author';
        } else if ((author.authorRole === 'first_author' || author.authorRole === 'first') && author.isCorresponding) {
          // If marked as first_author AND isCorresponding flag is true, it's first_and_corresponding_author
          mappedAuthorType = 'first_and_corresponding_author';
        } else if (author.authorRole === 'first_author' || author.authorRole === 'first') {
          mappedAuthorType = 'first_author';
        } else if (author.authorRole === 'corresponding_author' || author.authorRole === 'corresponding') {
          mappedAuthorType = 'corresponding_author';
        } else if (author.authorRole === 'co_author' || author.authorRole === 'co') {
          mappedAuthorType = 'co_author';
        }

        // Determine if author is internal (SGT affiliated)
        const isInternalAuthor = author.authorType?.startsWith('internal_') || 
                                author.affiliation?.toLowerCase().includes('sgt') ||
                                author.affiliation?.toLowerCase().includes('university') ||
                                false;

        // Extract author category (faculty, student, etc.) from authorType
        let authorCategory = null;
        let authorIsStudent = false;
        if (author.authorType === 'internal_faculty') {
          authorCategory = 'faculty';
        } else if (author.authorType === 'internal_student') {
          authorCategory = 'student';
          authorIsStudent = true;
        } else if (author.authorType === 'external_academic') {
          authorCategory = 'academic';
        } else if (author.authorType === 'external_industry') {
          authorCategory = 'industry';
        } else if (author.authorType === 'external_other') {
          authorCategory = 'other';
        }

        // Calculate author's incentive share based on quartile/SJR and role percentage
        // External authors get ZERO incentives and points
        // Students get only incentives, no points
        const sjrValue = Number(sjr) || 0;
        const authorIncentive = await calculateIncentives(
          { 
            publicationDate, 
            quartile,
            conferenceSubType,
            proceedingsQuartile
          },
          publicationType,
          mappedAuthorType,
          authorIsStudent,
          sjrValue,
          authorComposition.internalCoAuthorCount + authorComposition.externalCoAuthorCount, // total co-authors
          totalAuthorCount,
          isInternalAuthor,                              // NEW: is this author internal
          authorComposition.internalCoAuthorCount,       // NEW: internal co-author count
          authorComposition.externalFirstCorrespondingPct, // NEW: percentage lost to external first/corresponding
          authorComposition.internalEmployeeCoAuthorCount // NEW: employee co-authors for point division
        );

        await prisma.researchContributionAuthor.create({
          data: {
            researchContributionId: contribution.id,
            userId: authorUserId,
            uid: truncateField(author.uid, 64),
            registrationNo: truncateField(author.registrationNumber, 64),
            name: truncateField(author.name, 256),
            email: truncateField(author.email, 256),
            phone: truncateField(author.phone, 20),
            affiliation: truncateField(author.affiliation, 256),
            department: truncateField(author.department, 256),
            designation: truncateField(author.designation, 256),
            isInternational: author.isInternational || false,
            authorOrder: author.orderNumber || 1,
            isCorresponding: author.isCorresponding || false,
            authorType: mappedAuthorType,
            isInternal: isInternalAuthor,
            authorCategory: truncateField(authorCategory, 64),
            isPhdWork: author.isPhdWork || false,
            phdTitle: truncateField(author.phdTitle, 512),
            phdObjectives: author.phdObjectives,
            coveredObjectives: truncateField(author.coveredObjectives, 256),
            addressesSocietal: author.addressesSocietal || false,
            addressesGovernment: author.addressesGovernment || false,
            addressesEnvironmental: author.addressesEnvironmental || false,
            addressesIndustrial: author.addressesIndustrial || false,
            addressesBusiness: author.addressesBusiness || false,
            addressesConceptual: author.addressesConceptual || false,
            isNewsworthy: author.isNewsworthy || false,
            incentiveShare: authorIncentive.incentiveAmount,
            pointsShare: authorIncentive.points,
            canView: true,
            canEdit: false
          }
        });
        
        // Notify co-authors/corresponding authors when they're added (not the applicant)
        if (authorUserId && authorUserId !== userId) {
          await prisma.notification.create({
            data: {
              userId: authorUserId,
              type: 'research_author_added',
              title: 'Added to Research Contribution',
              message: `You have been added as ${mappedAuthorType.replace(/_/g, ' ')} to the research contribution "${title}".`,
              referenceType: 'research_contribution',
              referenceId: contribution.id,
              metadata: {
                authorRole: mappedAuthorType,
                contributionTitle: title,
                estimatedIncentive: authorIncentive.incentiveAmount,
                estimatedPoints: authorIncentive.points
              }
            }
          });
        }
      }
    }

    // Create status history
    await prisma.researchContributionStatusHistory.create({
      data: {
        researchContributionId: contribution.id,
        fromStatus: null,
        toStatus: 'draft',
        changedById: userId,
        comments: 'Research contribution created'
      }
    });

    // Fetch the complete contribution with relations
    const fullContribution = await prisma.researchContribution.findUnique({
      where: { id: contribution.id },
      include: {
        applicantDetails: true,
        authors: true,
        statusHistory: {
          orderBy: { changedAt: 'desc' }
        },
        school: true,
        department: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Research contribution created successfully',
      data: fullContribution
    });
  } catch (error) {
    console.error('Create research contribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create research contribution',
      error: error.message
    });
  }
};

/**
 * Get my research contributions (as applicant)
 */
exports.getMyResearchContributions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, publicationType } = req.query;

    const where = {
      applicantUserId: userId
    };

    if (status) {
      where.status = status;
    }

    if (publicationType) {
      where.publicationType = publicationType;
    }

    // Get contributions where user is the primary applicant
    const myContributions = await prisma.researchContribution.findMany({
      where,
      include: {
        applicantDetails: true,
        authors: true,
        school: true,
        department: true,
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          take: 5
        },
        editSuggestions: {
          where: { status: 'pending' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Also get contributions where user is a co-author
    const coAuthorContributions = await prisma.researchContribution.findMany({
      where: {
        authors: {
          some: {
            userId: userId
          }
        },
        applicantUserId: { not: userId } // Exclude contributions where user is already the applicant
      },
      include: {
        applicantDetails: true,
        authors: true,
        school: true,
        department: true,
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          take: 5
        },
        editSuggestions: {
          where: { status: 'pending' }
        },
        applicantUser: {
          select: {
            id: true,
            email: true,
            uid: true,
            employeeDetails: {
              select: {
                displayName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Combine both lists
    const allContributions = [...myContributions, ...coAuthorContributions];

    // Calculate totals
    const totalIncentives = allContributions
      .filter(c => c.status === 'completed' && c.incentiveAmount)
      .reduce((sum, c) => sum + Number(c.incentiveAmount), 0);

    const totalPoints = allContributions
      .filter(c => c.status === 'completed' && c.pointsAwarded)
      .reduce((sum, c) => sum + c.pointsAwarded, 0);

    res.status(200).json({
      success: true,
      data: {
        contributions: allContributions,
        myContributions: myContributions,
        coAuthorContributions: coAuthorContributions,
        summary: {
          total: allContributions.length,
          asApplicant: myContributions.length,
          asCoAuthor: coAuthorContributions.length,
          draft: allContributions.filter(c => c.status === 'draft').length,
          pending: allContributions.filter(c => ['submitted', 'under_review', 'resubmitted'].includes(c.status)).length,
          approved: allContributions.filter(c => c.status === 'approved').length,
          completed: allContributions.filter(c => c.status === 'completed').length,
          rejected: allContributions.filter(c => c.status === 'rejected').length,
          totalIncentives,
          totalPoints
        }
      }
    });
  } catch (error) {
    console.error('Get my research contributions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get research contributions',
      error: error.message
    });
  }
};

/**
 * Get pending mentor approvals (for faculty who are mentors)
 */
exports.getPendingMentorApprovals = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const mentorUid = req.user.uid;

    // Find contributions pending mentor approval where this user is the mentor
    const contributions = await prisma.researchContribution.findMany({
      where: {
        status: 'pending_mentor_approval',
        applicantDetails: {
          mentorUid: mentorUid
        }
      },
      include: {
        applicantDetails: true,
        authors: true,
        school: true,
        department: true,
        applicantUser: {
          select: {
            id: true,
            uid: true,
            email: true,
            firstName: true,
            lastName: true,
            studentProfile: {
              select: {
                displayName: true,
                registrationNumber: true
              }
            }
          }
        },
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          take: 3
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: contributions,
      count: contributions.length
    });
  } catch (error) {
    console.error('Get pending mentor approvals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending mentor approvals',
      error: error.message
    });
  }
};

/**
 * Get contributed research (as co-author)
 */
exports.getContributedResearch = async (req, res) => {
  try {
    const userId = req.user.id;
    const userUid = req.user.uid;

    // Find contributions where user is an author but not the applicant
    const authorRecords = await prisma.researchContributionAuthor.findMany({
      where: {
        OR: [
          { userId: userId },
          { uid: userUid },
          { registrationNo: userUid }
        ]
      },
      include: {
        researchContribution: {
          include: {
            applicantDetails: true,
            authors: true,
            school: true,
            department: true,
            applicantUser: {
              select: {
                id: true,
                uid: true,
                email: true,
                employeeDetails: {
                  select: {
                    firstName: true,
                    lastName: true,
                    displayName: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Filter out contributions where user is the applicant
    const contributions = authorRecords
      .filter(ar => ar.researchContribution.applicantUserId !== userId)
      .map(ar => ({
        ...ar.researchContribution,
        myAuthorRole: ar.authorType,
        myIncentiveShare: ar.incentiveShare,
        myPointsShare: ar.pointsShare
      }));

    // Calculate totals for co-authored work
    const totalIncentives = authorRecords
      .filter(ar => ar.researchContribution.status === 'completed' && ar.incentiveShare)
      .reduce((sum, ar) => sum + Number(ar.incentiveShare), 0);

    const totalPoints = authorRecords
      .filter(ar => ar.researchContribution.status === 'completed' && ar.pointsShare)
      .reduce((sum, ar) => sum + ar.pointsShare, 0);

    res.status(200).json({
      success: true,
      data: {
        contributions,
        summary: {
          total: contributions.length,
          completed: contributions.filter(c => c.status === 'completed').length,
          totalIncentives,
          totalPoints
        }
      }
    });
  } catch (error) {
    console.error('Get contributed research error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contributed research',
      error: error.message
    });
  }
};

/**
 * Get single research contribution by ID
 */
exports.getResearchContributionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Try to find as research contribution first
    let contribution = await prisma.researchContribution.findUnique({
      where: { id },
      include: {
        applicantDetails: true,
        authors: true,
        school: true,
        department: true,
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                uid: true,
                employeeDetails: {
                  select: {
                    firstName: true,
                    lastName: true,
                    displayName: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        statusHistory: {
          include: {
            changedBy: {
              select: {
                id: true,
                uid: true,
                employeeDetails: {
                  select: {
                    firstName: true,
                    lastName: true,
                    displayName: true
                  }
                }
              }
            }
          },
          orderBy: { changedAt: 'desc' }
        },
        editSuggestions: {
          include: {
            reviewer: {
              select: {
                id: true,
                uid: true,
                employeeDetails: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        applicantUser: {
          select: {
            id: true,
            uid: true,
            email: true,
            employeeDetails: {
              select: {
                firstName: true,
                lastName: true,
                displayName: true,
                designation: true
              }
            }
          }
        }
      }
    });

    let isGrant = false;

    // If not found, try as grant
    if (!contribution) {
      contribution = await prisma.grantApplication.findUnique({
        where: { id },
        include: {
          applicantUser: {
            select: {
              id: true,
              uid: true,
              email: true,
              employeeDetails: {
                select: {
                  firstName: true,
                  lastName: true,
                  displayName: true,
                  designation: true
                }
              }
            }
          },
          school: true,
          investigators: true,
          reviews: true,
          statusHistory: {
            include: {
              changedBy: {
                select: {
                  id: true,
                  uid: true,
                  employeeDetails: {
                    select: {
                      firstName: true,
                      lastName: true,
                      displayName: true
                    }
                  }
                }
              }
            },
            orderBy: { changedAt: 'desc' }
          }
        }
      });
      isGrant = true;
    }

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Research contribution or grant not found'
      });
    }

    // Check if user has access
    const isApplicant = contribution.applicantUserId === userId;
    
    let isAuthor = false;
    if (!isGrant) {
      isAuthor = contribution.authors?.some(
        a => a.userId === userId || a.uid === req.user.uid || a.registrationNo === req.user.uid
      );
    } else {
      // For grants, check investigators
      isAuthor = contribution.investigators?.some(
        inv => inv.userId === userId || inv.uid === req.user.uid
      );
    }

    // For now, allow access if user is applicant, author, or has review/approve permissions
    // Permission check will be handled by middleware

    res.status(200).json({
      success: true,
      data: {
        ...contribution,
        isApplicant,
        isAuthor,
        isGrant,
        publicationType: isGrant ? 'grant' : contribution.publicationType,
        hasPendingSuggestions: contribution.editSuggestions?.some(s => s.status === 'pending') || false
      }
    });
  } catch (error) {
    console.error('Get research contribution by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get research contribution',
      error: error.message
    });
  }
};

/**
 * Update research contribution
 */
exports.updateResearchContribution = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    console.log('[updateResearchContribution] Request body conference fields:', {
      conferenceSubType: req.body.conferenceSubType,
      proceedingsQuartile: req.body.proceedingsQuartile,
      conferenceName: req.body.conferenceName,
      conferenceType: req.body.conferenceType
    });

    // Get current contribution
    const contribution = await prisma.researchContribution.findUnique({
      where: { id },
      include: {
        applicantDetails: true,
        authors: true
      }
    });

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Research contribution not found'
      });
    }

    // Check if user is the applicant
    if (contribution.applicantUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the applicant can update this contribution'
      });
    }

    // Check if contribution is editable
    const editableStatuses = ['draft', 'changes_required', 'resubmitted'];
    if (!editableStatuses.includes(contribution.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit contribution in status: ${contribution.status}`
      });
    }

    // Extract authors from update data and handle separately
    // Also extract mentorUid and add it to applicantDetails if present
    const { authors, applicantDetails, mentorUid, ...contributionData } = updateData;
    
    // Convert string boolean fields to actual booleans
    const booleanFields = [
      'communicatedWithOfficialId', 'isPresenter', 'virtualConference', 'fullPaper',
      'conferenceHeldAtSgt', 'conferenceBestPaperAward', 'industryCollaboration',
      'centralFacilityUsed', 'attendedVirtual', 'internationalAuthor',
      'interdisciplinaryFromSgt', 'studentsFromSgt'
    ];
    
    booleanFields.forEach(field => {
      if (contributionData[field] !== undefined) {
        contributionData[field] = contributionData[field] === 'yes' || contributionData[field] === true;
      }
    });
    
    // Ensure sdgGoals is handled correctly and mapped to sdg_goals
    if (contributionData.sdgGoals !== undefined) {
      // Map sdgGoals to sdg_goals (database field name)
      contributionData.sdg_goals = contributionData.sdgGoals || [];
      delete contributionData.sdgGoals;
    }
    
    // If mentorUid is provided, add it to applicantDetails
    const updatedApplicantDetails = applicantDetails || {};
    if (mentorUid !== undefined) {
      updatedApplicantDetails.mentorUid = mentorUid;
    }

    // Recalculate incentives if relevant fields changed
    // Check if applicant is a student
    const applicantIsStudent = contribution.applicantType === 'internal_student';
    const isApplicantInternal = contribution.applicantType?.startsWith('internal_') || true;
    const sjrValue = Number(contributionData.sjr) || Number(contribution.sjr) || 0;
    const quartileValue = normalizeQuartileValue(contributionData.quartile || contribution.quartile);
    
    // Count co-authors for distribution
    const authorsList = authors || contribution.authors || [];
    const totalAuthorCount = authorsList.length || 1;
    
    // For single author, treat as first_and_corresponding to get 100% share
    let effectiveAuthorRole = contributionData.authorRole || contribution.authorRole || 'co_author';
    if (totalAuthorCount === 1 && authorsList.length === 0) {
      effectiveAuthorRole = 'first_and_corresponding_author';
    }
    
    // Analyze author composition for proper incentive distribution
    const authorComposition = analyzeAuthorComposition(
      authorsList,
      contribution.applicantType,
      effectiveAuthorRole
    );
    
    let incentiveUpdate = {};
    if (contributionData.sjr || contributionData.quartile || contributionData.authorRole || contributionData.publicationDate || contributionData.conferenceSubType || contributionData.proceedingsQuartile) {
      const incentiveCalculation = await calculateIncentives(
        {
          publicationDate: contributionData.publicationDate || contribution.publicationDate,
          quartile: quartileValue,
          conferenceSubType: contributionData.conferenceSubType || contribution.conferenceSubType,
          proceedingsQuartile: contributionData.proceedingsQuartile || contribution.proceedingsQuartile
        },
        contribution.publicationType,
        effectiveAuthorRole,
        applicantIsStudent,
        sjrValue,
        authorComposition.internalCoAuthorCount + authorComposition.externalCoAuthorCount, // total co-authors
        totalAuthorCount,
        isApplicantInternal,                           // NEW: is applicant internal
        authorComposition.internalCoAuthorCount,       // NEW: internal co-author count
        authorComposition.externalFirstCorrespondingPct, // NEW: percentage lost to external first/corresponding
        authorComposition.internalEmployeeCoAuthorCount // NEW: employee co-authors for point division
      );
      incentiveUpdate = {
        calculatedIncentiveAmount: incentiveCalculation.incentiveAmount,
        calculatedPoints: incentiveCalculation.points
      };
    }

    // Validate and resolve school/department IDs
    let resolvedSchoolId = contributionData.schoolId || contribution.schoolId;
    let resolvedDepartmentId = contributionData.departmentId || contribution.departmentId;

    if (resolvedDepartmentId && resolvedDepartmentId !== contribution.departmentId) {
      const departmentRecord = await prisma.department.findUnique({
        where: { id: resolvedDepartmentId },
        select: { id: true, facultyId: true }
      });

      if (!departmentRecord) {
        resolvedDepartmentId = contribution.departmentId;
      } else if (!resolvedSchoolId && departmentRecord.facultyId) {
        resolvedSchoolId = departmentRecord.facultyId;
      }
    }

    if (resolvedSchoolId && resolvedSchoolId !== contribution.schoolId) {
      const schoolRecord = await prisma.facultySchoolList.findUnique({
        where: { id: resolvedSchoolId },
        select: { id: true }
      });

      if (!schoolRecord) {
        resolvedSchoolId = contribution.schoolId;
      }
    }

    // Normalize quartile value before update
    if (contributionData.quartile) {
      contributionData.quartile = normalizeQuartileValue(contributionData.quartile);
    }

    // Remove schoolId and departmentId from contributionData as we'll handle them with nested operations
    const { schoolId: _schoolId, departmentId: _departmentId, ...cleanContributionData } = contributionData;

    // Prepare school and department nested operations
    let schoolOperation = {};
    let departmentOperation = {};

    if (resolvedSchoolId !== contribution.schoolId) {
      if (resolvedSchoolId) {
        schoolOperation = { school: { connect: { id: resolvedSchoolId } } };
      } else {
        schoolOperation = { school: { disconnect: true } };
      }
    }

    if (resolvedDepartmentId !== contribution.departmentId) {
      if (resolvedDepartmentId) {
        departmentOperation = { department: { connect: { id: resolvedDepartmentId } } };
      } else {
        departmentOperation = { department: { disconnect: true } };
      }
    }

    // Update the contribution (without authors)
    console.log('[updateResearchContribution] Before Prisma update - conferenceSubType:', {
      inCleanData: cleanContributionData.conferenceSubType,
      inOriginalData: contributionData.conferenceSubType,
      inReqBody: req.body.conferenceSubType,
      type: typeof cleanContributionData.conferenceSubType,
      JSON: JSON.stringify(cleanContributionData.conferenceSubType)
    });

    const updated = await prisma.researchContribution.update({
      where: { id },
      data: {
        ...cleanContributionData,
        ...schoolOperation,
        ...departmentOperation,
        ...incentiveUpdate,
        updatedAt: new Date()
      },
      include: {
        applicantDetails: true,
        authors: true,
        school: true,
        department: true
      }
    });

    console.log('[updateResearchContribution] After Prisma update - database has:', {
      conferenceSubType: updated.conferenceSubType,
      proceedingsQuartile: updated.proceedingsQuartile,
      calculatedIncentiveAmount: updated.calculatedIncentiveAmount,
      calculatedPoints: updated.calculatedPoints
    });

    // Update applicant details if provided or if mentorUid was sent
    if ((updatedApplicantDetails && Object.keys(updatedApplicantDetails).length > 0) && contribution.applicantDetails) {
      await prisma.researchContributionApplicantDetails.update({
        where: { id: contribution.applicantDetails.id },
        data: updatedApplicantDetails
      });
    }

    // Handle authors if provided
    if (authors && Array.isArray(authors)) {
      // Delete existing authors
      await prisma.researchContributionAuthor.deleteMany({
        where: { researchContributionId: id }
      });

      // Create new authors
      for (const author of authors) {
        // Try to find user by registration number or UID
        let authorUserId = author.userId || null;
        if (!authorUserId && (author.registrationNumber || author.uid)) {
          const user = await prisma.userLogin.findFirst({
            where: {
              uid: author.registrationNumber || author.uid
            }
          });
          if (user) {
            authorUserId = user.id;
          }
        }

        // Map authorRole to the correct enum value
        let mappedAuthorType = 'co_author';
        if (author.authorRole === 'first_and_corresponding' || author.authorRole === 'first_and_corresponding_author') {
          mappedAuthorType = 'first_and_corresponding_author';
        } else if ((author.authorRole === 'first_author' || author.authorRole === 'first') && author.isCorresponding) {
          // If marked as first_author AND isCorresponding flag is true, it's first_and_corresponding_author
          mappedAuthorType = 'first_and_corresponding_author';
        } else if (author.authorRole === 'first_author' || author.authorRole === 'first') {
          mappedAuthorType = 'first_author';
        } else if (author.authorRole === 'corresponding_author' || author.authorRole === 'corresponding') {
          mappedAuthorType = 'corresponding_author';
        } else if (author.authorRole === 'co_author' || author.authorRole === 'co') {
          mappedAuthorType = 'co_author';
        }

        // Determine if author is internal
        const isInternalAuthor = author.authorType?.startsWith('internal_') || 
                                author.affiliation?.toLowerCase().includes('sgt') ||
                                false;

        // Extract author category
        let authorCategory = null;
        let authorIsStudent = false;
        if (author.authorType === 'internal_faculty') {
          authorCategory = 'faculty';
        } else if (author.authorType === 'internal_student') {
          authorCategory = 'student';
          authorIsStudent = true;
        } else if (author.authorType === 'external_academic') {
          authorCategory = 'academic';
        } else if (author.authorType === 'external_industry') {
          authorCategory = 'industry';
        } else if (author.authorType === 'external_other') {
          authorCategory = 'other';
        }

        // Calculate author's incentive share based on quartile/SJR and role percentage
        // External authors get ZERO incentives and points
        // Students get only incentives, no points
        const authorIncentive = await calculateIncentives(
          { 
            publicationDate: contributionData.publicationDate || contribution.publicationDate,
            quartile: quartileValue
          },
          contribution.publicationType,
          mappedAuthorType,
          authorIsStudent,
          sjrValue,
          authorComposition.internalCoAuthorCount + authorComposition.externalCoAuthorCount, // total co-authors
          totalAuthorCount,
          isInternalAuthor,                              // NEW: is this author internal
          authorComposition.internalCoAuthorCount,       // NEW: internal co-author count
          authorComposition.externalFirstCorrespondingPct, // NEW: percentage lost to external first/corresponding
          authorComposition.internalEmployeeCoAuthorCount // NEW: employee co-authors for point division
        );

        await prisma.researchContributionAuthor.create({
          data: {
            researchContributionId: id,
            userId: authorUserId,
            uid: author.uid,
            registrationNo: author.registrationNumber,
            name: author.name,
            email: author.email,
            phone: author.phone,
            affiliation: author.affiliation,
            department: author.department,
            designation: author.designation || null,
            isInternational: author.isInternational || false,
            authorOrder: author.orderNumber || 1,
            isCorresponding: author.isCorresponding || false,
            authorType: mappedAuthorType,
            isInternal: isInternalAuthor,
            authorCategory: authorCategory,
            isPhdWork: author.isPhdWork || false,
            phdTitle: author.phdTitle,
            phdObjectives: author.phdObjectives,
            coveredObjectives: author.coveredObjectives,
            addressesSocietal: author.addressesSocietal || false,
            addressesGovernment: author.addressesGovernment || false,
            addressesEnvironmental: author.addressesEnvironmental || false,
            addressesIndustrial: author.addressesIndustrial || false,
            addressesBusiness: author.addressesBusiness || false,
            addressesConceptual: author.addressesConceptual || false,
            isNewsworthy: author.isNewsworthy || false,
            incentiveShare: authorIncentive.incentiveAmount,
            pointsShare: authorIncentive.points,
            canView: true,
            canEdit: false
          }
        });
        
        // Notify co-authors/corresponding authors when they're added (not the applicant)
        if (authorUserId && authorUserId !== userId) {
          await prisma.notification.create({
            data: {
              userId: authorUserId,
              type: 'research_author_added',
              title: 'Added to Research Contribution',
              message: `You have been added as ${mappedAuthorType.replace(/_/g, ' ')} to the research contribution "${contribution.title}".`,
              referenceType: 'research_contribution',
              referenceId: id,
              metadata: {
                authorRole: mappedAuthorType,
                contributionTitle: contribution.title,
                estimatedIncentive: authorIncentive.incentiveAmount,
                estimatedPoints: authorIncentive.points
              }
            }
          });
        }
      }
    }

    // Fetch the updated contribution with all relations
    const finalContribution = await prisma.researchContribution.findUnique({
      where: { id },
      include: {
        applicantDetails: true,
        authors: {
          orderBy: { authorOrder: 'asc' }
        },
        school: true,
        department: true
      }
    });

    res.status(200).json({
      success: true,
      message: 'Research contribution updated successfully',
      data: finalContribution
    });
  } catch (error) {
    console.error('Update research contribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update research contribution',
      error: error.message
    });
  }
};

/**
 * Submit research contribution for review
 * Teacher flow: file → DRD member → DRD head → incentive
 * Student flow: file → mentor (if selected) → DRD member → DRD head → incentive
 */
exports.submitResearchContribution = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const contribution = await prisma.researchContribution.findUnique({
      where: { id },
      include: {
        applicantDetails: true,
        applicantUser: {
          select: {
            id: true,
            uid: true,
            role: { select: { name: true } },
            studentLogin: { select: { id: true } }
          }
        }
      }
    });

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Research contribution not found'
      });
    }

    if (contribution.applicantUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the applicant can submit this contribution'
      });
    }

    if (contribution.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Cannot submit contribution in status: ${contribution.status}`
      });
    }

    // Determine if this is a student submission with a mentor
    const isStudent = contribution.applicantUser?.studentLogin?.id || 
                      contribution.applicantUser?.role?.name?.toLowerCase() === 'student';
    const hasMentor = contribution.applicantDetails?.mentorUid || contribution.applicantDetails?.mentorName;
    
    let newStatus = 'submitted';
    let statusMessage = 'Submitted for DRD review';
    let mentorId = null;
    
    // Student flow: if student has a mentor, send to mentor first
    if (isStudent && hasMentor) {
      newStatus = 'pending_mentor_approval';
      statusMessage = 'Submitted for mentor approval';
      
      // Find mentor user by UID
      if (contribution.applicantDetails?.mentorUid) {
        const mentor = await prisma.userLogin.findFirst({
          where: { uid: contribution.applicantDetails.mentorUid }
        });
        if (mentor) {
          mentorId = mentor.id;
        }
      }
    }

    // Update status and mentor
    const updated = await prisma.researchContribution.update({
      where: { id },
      data: {
        status: newStatus,
        submittedAt: new Date(),
        ...(mentorId && { mentorId })
      }
    });

    // Create status history
    await prisma.researchContributionStatusHistory.create({
      data: {
        researchContributionId: id,
        fromStatus: 'draft',
        toStatus: newStatus,
        changedById: userId,
        comments: statusMessage
      }
    });

    // Create notification for mentor or DRD reviewers
    if (newStatus === 'pending_mentor_approval' && contribution.applicantDetails?.mentorUid) {
      // Find mentor user
      const mentor = await prisma.userLogin.findFirst({
        where: { uid: contribution.applicantDetails.mentorUid }
      });
      
      if (mentor) {
        await prisma.notification.create({
          data: {
            userId: mentor.id,
            type: 'research_mentor_review',
            title: 'Research Paper Pending Your Approval',
            message: `Student submitted "${contribution.title}" for your review.`,
            metadata: {
              contributionId: id,
              applicationType: 'research_contribution',
              applicationNumber: contribution.applicationNumber
            }
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      message: isStudent && hasMentor 
        ? 'Research contribution submitted to mentor for approval' 
        : 'Research contribution submitted for DRD review',
      data: updated
    });
  } catch (error) {
    console.error('Submit research contribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit research contribution',
      error: error.message
    });
  }
};

/**
 * Mentor approves student's research contribution
 */
exports.mentorApproveContribution = async (req, res) => {
  try {
    const { id } = req.params;
    const mentorId = req.user.id;
    const { comments } = req.body;

    const contribution = await prisma.researchContribution.findUnique({
      where: { id },
      include: {
        applicantDetails: true
      }
    });

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Research contribution not found'
      });
    }

    if (contribution.status !== 'pending_mentor_approval') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve contribution in status: ${contribution.status}`
      });
    }

    // Verify mentor
    const mentor = await prisma.userLogin.findUnique({
      where: { id: mentorId }
    });

    if (!mentor || mentor.uid !== contribution.applicantDetails?.mentorUid) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned mentor can approve this contribution'
      });
    }

    // Update status to submitted (for DRD review)
    const updated = await prisma.researchContribution.update({
      where: { id },
      data: {
        status: 'submitted',
        mentorApprovedAt: new Date(),
        mentorRemarks: comments || 'Approved by mentor'
      }
    });

    // Create status history
    await prisma.researchContributionStatusHistory.create({
      data: {
        researchContributionId: id,
        fromStatus: 'pending_mentor_approval',
        toStatus: 'submitted',
        changedById: mentorId,
        comments: comments || 'Approved by mentor, forwarded to DRD'
      }
    });

    // Notify applicant
    const publicationTypeLabel = {
      'research_paper': 'Research Paper',
      'book': 'Book',
      'book_chapter': 'Book Chapter',
      'conference_paper': 'Conference Paper',
      'grant': 'Grant'
    }[contribution.publicationType] || 'Publication';
    
    await prisma.notification.create({
      data: {
        userId: contribution.applicantUserId,
        type: 'research_mentor_approved',
        title: `Mentor Approved Your ${publicationTypeLabel}`,
        message: `Your mentor approved "${contribution.title}". It has been forwarded to DRD for review.`,
        metadata: {
          contributionId: id,
          applicationType: 'research_contribution',
          publicationType: contribution.publicationType
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Research contribution approved and forwarded to DRD',
      data: updated
    });
  } catch (error) {
    console.error('Mentor approve contribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve contribution',
      error: error.message
    });
  }
};

/**
 * Mentor rejects student's research contribution
 */
exports.mentorRejectContribution = async (req, res) => {
  try {
    const { id } = req.params;
    const mentorId = req.user.id;
    const { comments } = req.body;

    if (!comments || !comments.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comments are required for rejection'
      });
    }

    const contribution = await prisma.researchContribution.findUnique({
      where: { id },
      include: {
        applicantDetails: true
      }
    });

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Research contribution not found'
      });
    }

    if (contribution.status !== 'pending_mentor_approval') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject contribution in status: ${contribution.status}`
      });
    }

    // Verify mentor
    const mentor = await prisma.userLogin.findUnique({
      where: { id: mentorId }
    });

    if (!mentor || mentor.uid !== contribution.applicantDetails?.mentorUid) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned mentor can reject this contribution'
      });
    }

    // Update status back to changes_required
    const updated = await prisma.researchContribution.update({
      where: { id },
      data: {
        status: 'changes_required',
        mentorRemarks: comments
      }
    });

    // Create status history
    await prisma.researchContributionStatusHistory.create({
      data: {
        researchContributionId: id,
        fromStatus: 'pending_mentor_approval',
        toStatus: 'changes_required',
        changedById: mentorId,
        comments: comments
      }
    });

    // Notify applicant
    await prisma.notification.create({
      data: {
        userId: contribution.applicantUserId,
        type: 'research_mentor_changes_required',
        title: 'Mentor Requested Changes',
        message: `Your mentor requested changes to "${contribution.title}". Please review and resubmit.`,
        metadata: {
          contributionId: id,
          applicationType: 'research_contribution',
          comments: comments
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Contribution sent back to student with comments',
      data: updated
    });
  } catch (error) {
    console.error('Mentor reject contribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject contribution',
      error: error.message
    });
  }
};

/**
 * Resubmit research contribution after changes
 */
exports.resubmitResearchContribution = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { comments } = req.body;

    const contribution = await prisma.researchContribution.findUnique({
      where: { id }
    });

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Research contribution not found'
      });
    }

    if (contribution.applicantUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the applicant can resubmit this contribution'
      });
    }

    if (contribution.status !== 'changes_required') {
      return res.status(400).json({
        success: false,
        message: `Cannot resubmit contribution in status: ${contribution.status}`
      });
    }

    // Update status to resubmitted
    const updated = await prisma.researchContribution.update({
      where: { id },
      data: {
        status: 'resubmitted',
        revisionCount: contribution.revisionCount + 1
      }
    });

    // Create status history
    await prisma.researchContributionStatusHistory.create({
      data: {
        researchContributionId: id,
        fromStatus: 'changes_required',
        toStatus: 'resubmitted',
        changedById: userId,
        comments: comments || 'Resubmitted after making requested changes'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Research contribution resubmitted successfully',
      data: updated
    });
  } catch (error) {
    console.error('Resubmit research contribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resubmit research contribution',
      error: error.message
    });
  }
};

/**
 * Delete research contribution (only draft)
 */
exports.deleteResearchContribution = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const contribution = await prisma.researchContribution.findUnique({
      where: { id }
    });

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Research contribution not found'
      });
    }

    if (contribution.applicantUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the applicant can delete this contribution'
      });
    }

    if (contribution.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete draft contributions'
      });
    }

    // Delete the contribution (cascades to related records)
    await prisma.researchContribution.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Research contribution deleted successfully'
    });
  } catch (error) {
    console.error('Delete research contribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete research contribution',
      error: error.message
    });
  }
};

/**
 * Add author to research contribution
 */
exports.addAuthor = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const authorData = req.body;

    const contribution = await prisma.researchContribution.findUnique({
      where: { id }
    });

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Research contribution not found'
      });
    }

    if (contribution.applicantUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the applicant can add authors'
      });
    }

    // Try to find user by registration number or UID
    let authorUserId = null;
    if (authorData.registrationNo || authorData.uid) {
      const user = await prisma.userLogin.findFirst({
        where: {
          uid: authorData.registrationNo || authorData.uid
        }
      });
      if (user) {
        authorUserId = user.id;
      }
    }

    // Count existing authors for incentive calculation
    const existingAuthors = await prisma.researchContributionAuthor.findMany({
      where: { researchContributionId: id },
      select: { authorType: true, isInternal: true, authorRole: true }
    });
    
    // Include the new author in the composition analysis
    const allAuthorsForAnalysis = [
      ...existingAuthors.map(a => ({
        authorType: a.isInternal ? 'internal_faculty' : 'external_academic',
        authorRole: a.authorType, // authorType field stores the role
        isInternal: a.isInternal
      })),
      {
        authorType: authorData.authorType || 'internal_faculty',
        authorRole: authorData.authorRole || 'co_author',
        isInternal: authorData.authorType?.startsWith('internal_') || authorData.isInternal !== false
      }
    ];
    
    const totalAuthorCount = existingAuthors.length + 2; // +1 for new author, +1 for applicant
    
    // Analyze author composition for proper incentive distribution
    const authorComposition = analyzeAuthorComposition(
      allAuthorsForAnalysis,
      contribution.applicantType,
      contribution.authorRole || 'co_author'
    );

    // Determine if new author is internal
    const isInternalAuthor = authorData.authorType?.startsWith('internal_') || 
                            authorData.isInternal !== false;

    // Calculate author's incentive share based on quartile/SJR and role percentage
    // External authors get ZERO incentives and points
    // Check if author is a student based on authorData
    const authorIsStudent = authorData.authorType === 'internal_student' || 
                           (authorData.authorCategory && authorData.authorCategory.toLowerCase() === 'student');
    const sjrValueForAdd = Number(contribution.sjr) || 0;
    const authorIncentive = await calculateIncentives(
      {
        publicationDate: contribution.publicationDate,
        quartile: contribution.quartile
      },
      contribution.publicationType,
      authorData.authorRole || 'co_author',
      authorIsStudent,
      sjrValueForAdd,
      authorComposition.internalCoAuthorCount + authorComposition.externalCoAuthorCount, // total co-authors
      totalAuthorCount,
      isInternalAuthor,                              // NEW: is this author internal
      authorComposition.internalCoAuthorCount,       // NEW: internal co-author count
      authorComposition.externalFirstCorrespondingPct, // NEW: percentage lost to external first/corresponding
      authorComposition.internalEmployeeCoAuthorCount // NEW: employee co-authors for point division
    );

    const author = await prisma.researchContributionAuthor.create({
      data: {
        researchContributionId: id,
        userId: authorUserId,
        uid: authorData.uid,
        registrationNo: authorData.registrationNo,
        name: authorData.name,
        email: authorData.email,
        phone: authorData.phone,
        affiliation: authorData.affiliation,
        department: authorData.department,
        authorOrder: authorData.authorOrder || 1,
        isCorresponding: authorData.isCorresponding || false,
        authorType: authorData.authorType || 'co_author',
        isInternal: authorData.isInternal !== false,
        authorCategory: authorData.authorCategory,
        isPhdWork: authorData.isPhdWork || false,
        phdTitle: authorData.phdTitle,
        phdObjectives: authorData.phdObjectives,
        coveredObjectives: authorData.coveredObjectives,
        addressesSocietal: authorData.addressesSocietal || false,
        addressesGovernment: authorData.addressesGovernment || false,
        addressesEnvironmental: authorData.addressesEnvironmental || false,
        addressesIndustrial: authorData.addressesIndustrial || false,
        addressesBusiness: authorData.addressesBusiness || false,
        addressesConceptual: authorData.addressesConceptual || false,
        isNewsworthy: authorData.isNewsworthy || false,
        incentiveShare: authorIncentive.incentiveAmount,
        pointsShare: authorIncentive.points,
        canView: true,
        canEdit: false
      }
    });

    // Update total authors count
    const authorCount = await prisma.researchContributionAuthor.count({
      where: { researchContributionId: id }
    });

    await prisma.researchContribution.update({
      where: { id },
      data: { totalAuthors: authorCount + 1 } // +1 for the applicant
    });

    // Create notification for the author if internal
    if (authorUserId) {
      await prisma.notification.create({
        data: {
          userId: authorUserId,
          type: 'research_author_added',
          title: 'Added as Author',
          message: `You have been added as a ${authorData.authorType || 'co-author'} to research contribution: ${contribution.title}`,
          referenceType: 'research_contribution',
          referenceId: id
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Author added successfully',
      data: author
    });
  } catch (error) {
    console.error('Add author error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add author',
      error: error.message
    });
  }
};

/**
 * Update author in research contribution
 */
exports.updateAuthor = async (req, res) => {
  try {
    const { id, authorId } = req.params;
    const userId = req.user.id;

    // Check contribution ownership
    const contribution = await prisma.researchContribution.findFirst({
      where: {
        id,
        applicantUserId: userId,
        status: { in: ['draft', 'changes_required'] }
      }
    });

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Contribution not found or cannot be edited'
      });
    }

    // Update the author
    const updatedAuthor = await prisma.researchContributionAuthor.update({
      where: { id: authorId },
      data: req.body
    });

    res.status(200).json({
      success: true,
      message: 'Author updated successfully',
      data: updatedAuthor
    });
  } catch (error) {
    console.error('Update author error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update author',
      error: error.message
    });
  }
};

/**
 * Remove author from research contribution
 */
exports.removeAuthor = async (req, res) => {
  try {
    const { id, authorId } = req.params;
    const userId = req.user.id;

    const contribution = await prisma.researchContribution.findUnique({
      where: { id }
    });

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Research contribution not found'
      });
    }

    if (contribution.applicantUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the applicant can remove authors'
      });
    }

    // Delete the author
    await prisma.researchContributionAuthor.delete({
      where: { id: authorId }
    });

    // Update total authors count
    const authorCount = await prisma.researchContributionAuthor.count({
      where: { researchContributionId: id }
    });

    await prisma.researchContribution.update({
      where: { id },
      data: { totalAuthors: authorCount + 1 } // +1 for the applicant
    });

    res.status(200).json({
      success: true,
      message: 'Author removed successfully'
    });
  } catch (error) {
    console.error('Remove author error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove author',
      error: error.message
    });
  }
};

/**
 * Lookup user by registration number
 */
exports.lookupByRegistration = async (req, res) => {
  try {
    const { registrationNumber } = req.params;
    const lookupValue = registrationNumber?.trim();

    if (!lookupValue) {
      return res.status(400).json({
        success: false,
        message: 'Registration number or UID is required'
      });
    }

    // Search in UserLogin and related details
    const user = await prisma.userLogin.findFirst({
      where: {
        uid: lookupValue
      },
      select: {
        uid: true,
        email: true,
        phone: true,
        role: true,
        employeeDetails: {
          select: {
            firstName: true,
            lastName: true,
            displayName: true,
            email: true,
            phoneNumber: true,
            designation: true,
            primaryDepartment: {
              select: { 
                departmentName: true,
                faculty: {
                  select: { facultyName: true }
                }
              }
            }
          }
        },
        studentLogin: {
          select: {
            firstName: true,
            lastName: true,
            displayName: true,
            email: true,
            phone: true,
            currentSemester: true,
            program: {
              select: {
                programName: true,
                department: {
                  select: { departmentName: true }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this registration number'
      });
    }

    // Extract email with proper fallback chain
    let userEmail = user.email || '';
    if (!userEmail && user.employeeDetails) {
      userEmail = user.employeeDetails.email || '';
    }
    if (!userEmail && user.studentLogin) {
      userEmail = user.studentLogin.email || '';
    }

    // Extract phone with proper fallback chain
    let userPhone = user.phone || '';
    if (!userPhone && user.employeeDetails) {
      userPhone = user.employeeDetails.phoneNumber || '';
    }
    if (!userPhone && user.studentLogin) {
      userPhone = user.studentLogin.phone || '';
    }

    // Determine name
    const name = user.employeeDetails?.displayName ||
           user.studentLogin?.displayName || 
           `${user.employeeDetails?.firstName || user.studentLogin?.firstName || ''} ${user.employeeDetails?.lastName || user.studentLogin?.lastName || ''}`.trim() ||
           user.uid;

    // Determine user type from role
    const userType = user.role === 'student' ? 'student' : user.role;

    res.status(200).json({
      success: true,
      data: {
        uid: user.uid,
        name,
        displayName: name,
        email: userEmail,
        phone: userPhone,
        designation: user.employeeDetails?.designation,
        department: user.employeeDetails?.primaryDepartment?.departmentName || user.studentLogin?.program?.department?.departmentName,
        school: user.employeeDetails?.primarySchool?.facultyName,
        course: user.studentLogin?.program?.programName,
        semester: user.studentLogin?.currentSemester,
        role: user.role,
        userType: userType,
        employeeDetails: user.employeeDetails,
        studentProfile: user.studentLogin
      }
    });
  } catch (error) {
    console.error('Lookup by registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lookup user',
      error: error.message
    });
  }
};

/**
 * Get incentive policies for research contributions
 * Used to display incentive information to users when filing
 */
exports.getIncentivePolicies = async (req, res) => {
  try {
    const policies = await prisma.researchIncentivePolicy.findMany({
      orderBy: [
        { publicationType: 'asc' },
        { authorType: 'asc' }
      ]
    });

    res.status(200).json({
      success: true,
      data: policies
    });
  } catch (error) {
    console.error('Get incentive policies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incentive policies',
      error: error.message
    });
  }
};

/**
 * Upload documents for a research contribution
 * Allows uploading research document and supporting documents
 */
exports.uploadDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if contribution exists and user has access
    const contribution = await prisma.researchContribution.findUnique({
      where: { id }
    });

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Research contribution not found'
      });
    }

    // Check if user is the applicant
    if (contribution.applicantUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only upload documents for your own contributions'
      });
    }

    // Process uploaded files
    const uploadedFiles = {
      researchDocument: null,
      supportingDocuments: []
    };

    if (req.files) {
      // Handle research document
      if (req.files.researchDocument && req.files.researchDocument[0]) {
        const file = req.files.researchDocument[0];
        uploadedFiles.researchDocument = {
          filename: file.filename,
          originalName: file.originalname,
          path: `/uploads/research/${file.filename}`,
          size: file.size,
          mimetype: file.mimetype
        };
      }

      // Handle supporting documents
      if (req.files.supportingDocuments) {
        uploadedFiles.supportingDocuments = req.files.supportingDocuments.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          path: `/uploads/research/${file.filename}`,
          size: file.size,
          mimetype: file.mimetype
        }));
      }
    }

    // Update contribution with document paths
    const updateData = {};
    
    if (uploadedFiles.researchDocument) {
      updateData.manuscriptFilePath = uploadedFiles.researchDocument.path;
    }

    if (uploadedFiles.supportingDocuments.length > 0) {
      // Merge with existing supporting documents if any
      const existingSupportingDocs = contribution.supportingDocsFilePaths || { files: [] };
      const allSupportingDocs = [
        ...(existingSupportingDocs.files || []),
        ...uploadedFiles.supportingDocuments.map(doc => ({
          path: doc.path,
          name: doc.originalName,
          size: doc.size,
          mimetype: doc.mimetype,
          uploadedAt: new Date().toISOString()
        }))
      ];
      
      updateData.supportingDocsFilePaths = {
        files: allSupportingDocs
      };
    }

    const updatedContribution = await prisma.researchContribution.update({
      where: { id },
      data: updateData
    });

    res.status(200).json({
      success: true,
      message: 'Documents uploaded successfully',
      data: {
        researchDocument: uploadedFiles.researchDocument,
        supportingDocuments: uploadedFiles.supportingDocuments,
        contribution: {
          id: updatedContribution.id,
          manuscriptFilePath: updatedContribution.manuscriptFilePath,
          supportingDocsFilePaths: updatedContribution.supportingDocsFilePaths
        }
      }
    });
  } catch (error) {
    console.error('Upload documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload documents',
      error: error.message
    });
  }
};

// Export the calculateIncentives function for use in other controllers
exports.calculateIncentives = calculateIncentives;

module.exports = exports;
