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
const calculateIncentives = async (contributionData, publicationType, authorType) => {
  // Get active policy for this publication type
  const policy = await prisma.researchIncentivePolicy.findFirst({
    where: {
      publicationType: publicationType,
      isActive: true
    }
  });

  // Default values if no policy found
  const defaults = {
    research_paper: { baseAmount: 15000, basePoints: 30 },
    book: { baseAmount: 25000, basePoints: 50 },
    book_chapter: { baseAmount: 10000, basePoints: 20 },
    conference_paper: { baseAmount: 7500, basePoints: 15 },
    grant_proposal: { baseAmount: 5000, basePoints: 10 }
  };

  const base = policy ? {
    baseAmount: Number(policy.baseIncentiveAmount),
    basePoints: policy.basePoints
  } : defaults[publicationType] || { baseAmount: 10000, basePoints: 20 };

  let totalAmount = base.baseAmount;
  let totalPoints = base.basePoints;

  // Author type multipliers
  const authorMultipliers = policy?.authorTypeMultipliers || {
    first_author: 1.0,
    corresponding_author: 0.8,
    co_author: 0.5,
    first_and_corresponding_author: 1.2
  };

  const multiplier = authorMultipliers[authorType] || 0.5;
  totalAmount = totalAmount * multiplier;
  totalPoints = Math.round(totalPoints * multiplier);

  // Indexing bonuses (for research papers and conference papers)
  if (['research_paper', 'conference_paper'].includes(publicationType)) {
    const indexingBonuses = policy?.indexingBonuses || {
      scopus: 5000,
      wos: 7500,
      both: 10000,
      ugc: 2500
    };

    const targetedType = contributionData.targetedResearchType;
    if (targetedType && indexingBonuses[targetedType]) {
      totalAmount += indexingBonuses[targetedType];
    }

    // Impact factor tiers
    if (contributionData.impactFactor) {
      const impactFactorTiers = policy?.impactFactorTiers || [
        { min: 0, max: 1, bonus: 0 },
        { min: 1, max: 3, bonus: 5000 },
        { min: 3, max: 5, bonus: 10000 },
        { min: 5, max: 100, bonus: 20000 }
      ];

      const impactFactor = Number(contributionData.impactFactor);
      for (const tier of impactFactorTiers) {
        if (impactFactor >= tier.min && impactFactor < tier.max) {
          totalAmount += tier.bonus;
          break;
        }
      }
    }
  }

  return {
    incentiveAmount: totalAmount,
    points: totalPoints
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
    if (userRole === 'student') {
      applicantType = 'internal_student';
    } else if (userRole === 'staff') {
      applicantType = 'internal_staff';
    }

    // Generate application number
    const applicationNumber = await generateApplicationNumber(publicationType);

    // Calculate pre-determined incentives based on author type
    const incentiveCalculation = await calculateIncentives(
      { targetedResearchType, impactFactor, sjr },
      publicationType,
      authorType || 'co_author'
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
          primarySchoolId: true,
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
        resolvedSchoolId = applicantEmployee?.primarySchoolId || applicantEmployee?.primaryDepartment?.facultyId || null;
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
        if (author.authorType === 'internal_faculty') {
          authorCategory = 'faculty';
        } else if (author.authorType === 'internal_student') {
          authorCategory = 'student';
        } else if (author.authorType === 'external_academic') {
          authorCategory = 'academic';
        } else if (author.authorType === 'external_industry') {
          authorCategory = 'industry';
        } else if (author.authorType === 'external_other') {
          authorCategory = 'other';
        }

        // Calculate author's incentive share
        const authorIncentive = await calculateIncentives(
          { targetedResearchType, impactFactor, sjr },
          publicationType,
          mappedAuthorType
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
    let incentiveUpdate = {};
    if (contributionData.targetedResearchType || contributionData.impactFactor || contributionData.authorType) {
      const incentiveCalculation = await calculateIncentives(
        {
          targetedResearchType: contributionData.targetedResearchType || contribution.targetedResearchType,
          impactFactor: contributionData.impactFactor || contribution.impactFactor
        },
        contribution.publicationType,
        contributionData.authorType || 'co_author'
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
        if (author.authorType === 'internal_faculty') {
          authorCategory = 'faculty';
        } else if (author.authorType === 'internal_student') {
          authorCategory = 'student';
        } else if (author.authorType === 'external_academic') {
          authorCategory = 'academic';
        } else if (author.authorType === 'external_industry') {
          authorCategory = 'industry';
        } else if (author.authorType === 'external_other') {
          authorCategory = 'other';
        }

        // Calculate author's incentive share
        const authorIncentive = await calculateIncentives(
          { 
            targetedResearchType: contributionData.targetedResearchType || contribution.targetedResearchType,
            impactFactor: contributionData.impactFactor || contribution.impactFactor,
            sjr: contributionData.sjr || contribution.sjr
          },
          contribution.publicationType,
          mappedAuthorType
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

    // Calculate author's incentive share
    const authorIncentive = await calculateIncentives(
      {
        targetedResearchType: contribution.targetedResearchType,
        impactFactor: contribution.impactFactor
      },
      contribution.publicationType,
      authorData.authorType || 'co_author'
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
            primarySchool: {
              select: { facultyName: true }
            },
            primaryDepartment: {
              select: { departmentName: true }
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

module.exports = exports;
