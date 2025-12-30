/**
 * Research Contribution Controller
 * Handles CRUD operations for research paper publications, books, conferences, and grant proposals
 * Flow: draft → submitted → under_review → [changes_required → resubmitted] → approved → completed
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
// Note: Students get only incentives (no points), employees get both
// Updated logic:
// - First Author gets their percentage
// - Corresponding Author gets their percentage  
// - If same person is First + Corresponding, they get BOTH percentages combined
// - Co-Authors share the remainder (100% - first - corresponding) equally
// - Single author gets 100%
const calculateIncentives = async (contributionData, publicationType, authorRole, isStudent = false, sjrValue = 0, coAuthorCount = 0, totalAuthors = 1) => {
  // Get active policy for this publication type based on publication date
  const publicationDate = contributionData.publicationDate ? new Date(contributionData.publicationDate) : new Date();
  
  const policy = await prisma.researchIncentivePolicy.findFirst({
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

  // Default quartile incentives
  const defaultQuartileIncentives = [
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
  
  // Get the total pool based on quartile first, then check SJR override
  let totalAmount = 0;
  let totalPoints = 0;
  
  // First try quartile-based incentives (primary/mandatory)
  const quartile = contributionData.quartile;
  if (quartile) {
    const quartileMatch = quartileIncentives.find(q => q.quartile === quartile);
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
  
  // Single author gets 100%
  if (totalAuthors === 1) {
    rolePercentage = 100;
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
  // Co-authors split the remainder equally
  else if (authorRole === 'co_author') {
    // Split co-author total percentage among all co-authors
    const effectiveCoAuthorCount = Math.max(coAuthorCount, 1);
    rolePercentage = coAuthorTotalPct / effectiveCoAuthorCount;
  }
  // Default fallback
  else {
    rolePercentage = coAuthorTotalPct / Math.max(coAuthorCount, 1);
  }

  // Calculate this author's share based on role percentage
  const authorIncentive = Math.round((totalAmount * rolePercentage) / 100);
  const authorPoints = Math.round((totalPoints * rolePercentage) / 100);

  // Students get only incentives, no points
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
};

/**
 * Create a new research contribution
 */
exports.createResearchContribution = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
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
      volume,
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
      // Conference fields
      conferenceName,
      conferenceLocation,
      conferenceDate,
      proceedingsTitle,
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
      // Applicant details
      applicantDetails,
      // Authors
      authors,
      // Author type of the applicant
      authorType
    } = req.body;

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
    const coAuthorCount = authorsList.filter(a => 
      a.authorRole === 'co_author' || a.authorRole === 'co'
    ).length;

    // Calculate pre-determined incentives based on quartile/SJR and author role percentage
    // Students get only incentives, no points
    const sjrValue = Number(sjr) || 0;
    const incentiveCalculation = await calculateIncentives(
      { publicationDate, quartile },
      publicationType,
      authorRole || 'co_author',
      isStudent,
      sjrValue,
      coAuthorCount,
      totalAuthorCount
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

    // Create the research contribution
    const contribution = await prisma.researchContribution.create({
      data: {
        applicationNumber,
        applicantUserId: userId,
        applicantType,
        publicationType,
        title,
        abstract,
        keywords,
        schoolId: resolvedSchoolId,
        departmentId: resolvedDepartmentId,
        status: 'draft',
        // Research paper fields
        targetedResearchType,
        internationalAuthor: internationalAuthor || false,
        foreignCollaborationsCount: foreignCollaborationsCount || 0,
        impactFactor: impactFactor ? Number(impactFactor) : null,
        quartile: quartile || null,
        sjr: sjr ? Number(sjr) : null,
        interdisciplinaryFromSgt: interdisciplinaryFromSgt || false,
        studentsFromSgt: studentsFromSgt || false,
        journalName,
        totalAuthors: totalAuthors || 1,
        sgtAffiliatedAuthors: sgtAffiliatedAuthors || 1,
        internalCoAuthors: internalCoAuthors || 0,
        volume,
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
        // Conference fields
        conferenceName,
        conferenceLocation,
        conferenceDate: conferenceDate ? new Date(conferenceDate) : null,
        proceedingsTitle,
        // Grant fields
        fundingAgency,
        proposalType,
        requestedAmount: requestedAmount ? Number(requestedAmount) : null,
        sanctionedAmount: sanctionedAmount ? Number(sanctionedAmount) : null,
        projectDurationMonths,
        projectStartDate: projectStartDate ? new Date(projectStartDate) : null,
        projectEndDate: projectEndDate ? new Date(projectEndDate) : null,
        // Common fields
        publicationDate: publicationDate ? new Date(publicationDate) : null,
        publicationStatus,
        manuscriptFilePath,
        supportingDocsFilePaths,
        indexingDetails,
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
          employeeCategory: applicantDetails.employeeCategory,
          employeeType: applicantDetails.employeeType,
          uid: applicantDetails.uid,
          email: applicantDetails.email,
          phone: applicantDetails.phone,
          universityDeptName: applicantDetails.universityDeptName,
          mentorName: applicantDetails.mentorName,
          mentorUid: applicantDetails.mentorUid,
          isPhdWork: applicantDetails.isPhdWork || false,
          phdTitle: applicantDetails.phdTitle,
          phdObjectives: applicantDetails.phdObjectives,
          coveredObjectives: applicantDetails.coveredObjectives,
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
        // Students get only incentives, no points
        const sjrValue = Number(sjr) || 0;
        const authorIncentive = await calculateIncentives(
          { publicationDate, quartile },
          publicationType,
          mappedAuthorType,
          authorIsStudent,
          sjrValue,
          coAuthorCount,
          totalAuthorCount
        );

        await prisma.researchContributionAuthor.create({
          data: {
            researchContributionId: contribution.id,
            userId: authorUserId,
            uid: author.uid,
            registrationNo: author.registrationNumber,
            name: author.name,
            email: author.email,
            phone: author.phone,
            affiliation: author.affiliation,
            department: author.department,
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

    const contribution = await prisma.researchContribution.findUnique({
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

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Research contribution not found'
      });
    }

    // Check if user has access
    const isApplicant = contribution.applicantUserId === userId;
    const isAuthor = contribution.authors.some(
      a => a.userId === userId || a.uid === req.user.uid || a.registrationNo === req.user.uid
    );

    // For now, allow access if user is applicant, author, or has review/approve permissions
    // Permission check will be handled by middleware

    res.status(200).json({
      success: true,
      data: {
        ...contribution,
        isApplicant,
        isAuthor,
        hasPendingSuggestions: contribution.editSuggestions.some(s => s.status === 'pending')
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
    
    // If mentorUid is provided, add it to applicantDetails
    const updatedApplicantDetails = applicantDetails || {};
    if (mentorUid !== undefined) {
      updatedApplicantDetails.mentorUid = mentorUid;
    }

    // Recalculate incentives if relevant fields changed
    // Check if applicant is a student
    const applicantIsStudent = contribution.applicantType === 'internal_student';
    const sjrValue = Number(contributionData.sjr) || Number(contribution.sjr) || 0;
    const quartileValue = contributionData.quartile || contribution.quartile;
    
    // Count co-authors for distribution
    const authorsList = authors || contribution.authors || [];
    const totalAuthorCount = authorsList.length || 1;
    const coAuthorCount = authorsList.filter(a => 
      a.authorRole === 'co_author' || a.authorRole === 'co' || a.authorType === 'co_author'
    ).length;
    
    let incentiveUpdate = {};
    if (contributionData.sjr || contributionData.quartile || contributionData.authorRole || contributionData.publicationDate) {
      const incentiveCalculation = await calculateIncentives(
        {
          publicationDate: contributionData.publicationDate || contribution.publicationDate,
          quartile: quartileValue
        },
        contribution.publicationType,
        contributionData.authorRole || contribution.authorRole || 'co_author',
        applicantIsStudent,
        sjrValue,
        coAuthorCount,
        totalAuthorCount
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
          coAuthorCount,
          totalAuthorCount
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
    await prisma.notification.create({
      data: {
        userId: contribution.applicantUserId,
        type: 'research_mentor_approved',
        title: 'Mentor Approved Your Research Paper',
        message: `Your mentor approved "${contribution.title}". It has been forwarded to DRD for review.`,
        metadata: {
          contributionId: id,
          applicationType: 'research_contribution'
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
      select: { authorType: true }
    });
    const totalAuthorCount = existingAuthors.length + 2; // +1 for new author, +1 for applicant
    const coAuthorCount = existingAuthors.filter(a => a.authorType === 'co_author').length 
                        + (authorData.authorRole === 'co_author' || authorData.authorRole === 'co' ? 1 : 0);

    // Calculate author's incentive share based on quartile/SJR and role percentage
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
      coAuthorCount,
      totalAuthorCount
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

module.exports = exports;
