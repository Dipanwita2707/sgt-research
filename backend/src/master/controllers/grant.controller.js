/**
 * Grant Application Controller
 * Handles all CRUD operations for research grant applications
 */

const prisma = require('../../config/database');

/**
 * Generate unique application number for grants
 */
const generateApplicationNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `GRT-${year}`;
  
  const lastGrant = await prisma.grantApplication.findFirst({
    where: {
      applicationNumber: {
        startsWith: prefix
      }
    },
    orderBy: {
      applicationNumber: 'desc'
    }
  });
  
  let nextNumber = 1;
  if (lastGrant && lastGrant.applicationNumber) {
    const lastNumber = parseInt(lastGrant.applicationNumber.split('-').pop() || '0');
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}-${String(nextNumber).padStart(5, '0')}`;
};

/**
 * Create a new grant application
 */
exports.createGrantApplication = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const {
      title,
      agencyName,
      submittedAmount,
      sdgGoals,
      projectType,
      numberOfConsortiumOrgs,
      projectStatus,
      projectCategory,
      fundingAgencyType,
      fundingAgencyName,
      totalInvestigators,
      numberOfInternalPIs,
      numberOfInternalCoPIs,
      isPIExternal,
      myRole,
      dateOfSubmission,
      projectStartDate,
      projectEndDate,
      projectDurationMonths,
      schoolId,
      departmentId,
      status,
      consortiumOrganizations,
      investigators
    } = req.body;

    // Always create as draft first, then submit if requested
    // This ensures proper workflow tracking
    const createStatus = 'draft';
    const shouldSubmitImmediately = status === 'submitted';

    // Determine applicant type from user role
    const userLogin = await prisma.userLogin.findUnique({
      where: { id: userId },
      include: { employeeDetails: true, studentLogin: true }
    });

    let applicantType = 'internal_faculty';
    if (userLogin?.role === 'student') {
      applicantType = 'internal_student';
    } else if (userLogin?.role === 'staff') {
      applicantType = 'internal_staff';
    }

    // Create grant application with nested relations
    const grantApplication = await prisma.grantApplication.create({
      data: {
        applicationNumber: null, // Will be generated on submission
        applicantUserId: userId,
        applicantType,
        title,
        agencyName,
        submittedAmount: submittedAmount ? parseFloat(submittedAmount) : null,
        sdgGoals: sdgGoals || [],
        projectType: projectType || 'indian',
        numberOfConsortiumOrgs: numberOfConsortiumOrgs || 0,
        projectStatus: projectStatus || 'submitted',
        projectCategory: projectCategory || 'govt',
        fundingAgencyType: fundingAgencyType || null,
        fundingAgencyName: fundingAgencyName || null,
        totalInvestigators: totalInvestigators || 1,
        numberOfInternalPIs: numberOfInternalPIs || 1,
        numberOfInternalCoPIs: numberOfInternalCoPIs || 0,
        isPIExternal: isPIExternal || false,
        myRole: myRole || 'pi',
        dateOfSubmission: dateOfSubmission ? new Date(dateOfSubmission) : null,
        projectStartDate: projectStartDate ? new Date(projectStartDate) : null,
        projectEndDate: projectEndDate ? new Date(projectEndDate) : null,
        projectDurationMonths: projectDurationMonths ? parseInt(projectDurationMonths) : null,
        schoolId: schoolId || null,
        departmentId: departmentId || null,
        status: createStatus,
        submittedAt: null,
        // Create consortium organizations
        consortiumOrganizations: projectType === 'international' && consortiumOrganizations?.length > 0 ? {
          create: consortiumOrganizations.map((org, index) => ({
            organizationName: org.organizationName,
            country: org.country,
            numberOfMembers: org.numberOfMembers || 1,
            displayOrder: index
          }))
        } : undefined
      },
      include: {
        consortiumOrganizations: true,
        school: true,
        department: true
      }
    });

    // Add investigators if provided
    if (investigators && investigators.length > 0) {
      // First, get the created consortium org IDs
      const orgIdMap = {};
      if (grantApplication.consortiumOrganizations) {
        consortiumOrganizations?.forEach((inputOrg, index) => {
          const createdOrg = grantApplication.consortiumOrganizations[index];
          if (createdOrg) {
            orgIdMap[inputOrg.id] = createdOrg.id;
          }
        });
      }

      // Create investigators
      for (const inv of investigators) {
        await prisma.grantInvestigator.create({
          data: {
            grantApplicationId: grantApplication.id,
            userId: inv.userId || null,
            uid: inv.uid || null,
            name: inv.name,
            email: inv.email || null,
            phone: inv.phone || null,
            designation: inv.designation || null,
            affiliation: inv.affiliation || null,
            department: inv.department || null,
            roleType: inv.roleType || 'co_investigator',
            isInternal: inv.isInternal !== false,
            investigatorType: inv.investigatorType || 'Faculty',
            consortiumOrgId: inv.consortiumOrgId ? orgIdMap[inv.consortiumOrgId] : null,
            isTeamCoordinator: inv.isTeamCoordinator || false,
            displayOrder: inv.displayOrder || 0
          }
        });
      }
    }

    // Create status history entry
    await prisma.grantApplicationStatusHistory.create({
      data: {
        grantApplicationId: grantApplication.id,
        fromStatus: null,
        toStatus: createStatus,
        changedById: userId,
        comments: 'Draft created'
      }
    });

    // If user wants to submit immediately, do that now
    let finalGrant = grantApplication;
    if (shouldSubmitImmediately) {
      // Generate application number
      const applicationNumber = await generateApplicationNumber();
      
      // Update to submitted status
      finalGrant = await prisma.grantApplication.update({
        where: { id: grantApplication.id },
        data: {
          applicationNumber,
          status: 'submitted',
          submittedAt: new Date()
        }
      });

      // Create submission status history
      await prisma.grantApplicationStatusHistory.create({
        data: {
          grantApplicationId: grantApplication.id,
          fromStatus: 'draft',
          toStatus: 'submitted',
          changedById: userId,
          comments: 'Application submitted'
        }
      });
    }

    // Fetch complete grant with all relations
    const completeGrant = await prisma.grantApplication.findUnique({
      where: { id: grantApplication.id },
      include: {
        consortiumOrganizations: true,
        investigators: {
          include: {
            consortiumOrg: true
          },
          orderBy: { displayOrder: 'asc' }
        },
        school: true,
        department: true,
        applicantUser: {
          select: {
            id: true,
            uid: true,
            email: true,
            employeeDetails: {
              select: { firstName: true, lastName: true, displayName: true, designation: true }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: shouldSubmitImmediately ? 'Grant application submitted successfully' : 'Draft saved successfully',
      data: completeGrant
    });

  } catch (error) {
    console.error('Error creating grant application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create grant application',
      error: error.message
    });
  }
};

/**
 * Get all grant applications for current user
 */
exports.getMyGrantApplications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const grants = await prisma.grantApplication.findMany({
      where: {
        OR: [
          { applicantUserId: userId },
          { investigators: { some: { userId } } }
        ]
      },
      include: {
        school: true,
        department: true,
        consortiumOrganizations: true,
        investigators: {
          include: { consortiumOrg: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: grants
    });

  } catch (error) {
    console.error('Error fetching grant applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grant applications',
      error: error.message
    });
  }
};

/**
 * Get single grant application by ID
 */
exports.getGrantApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const grant = await prisma.grantApplication.findUnique({
      where: { id },
      include: {
        consortiumOrganizations: {
          orderBy: { displayOrder: 'asc' }
        },
        investigators: {
          include: { 
            consortiumOrg: true,
            user: {
              select: { uid: true, email: true }
            }
          },
          orderBy: { displayOrder: 'asc' }
        },
        school: true,
        department: true,
        applicantUser: {
          select: {
            id: true,
            uid: true,
            email: true,
            employeeDetails: {
              select: { firstName: true, lastName: true, displayName: true, designation: true }
            }
          }
        },
        reviews: {
          include: {
            reviewer: {
              select: { uid: true, email: true, employeeDetails: true }
            }
          }
        },
        statusHistory: {
          include: {
            changedBy: {
              select: { uid: true, email: true }
            }
          },
          orderBy: { changedAt: 'desc' }
        }
      }
    });

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: 'Grant application not found'
      });
    }

    res.json({
      success: true,
      data: grant
    });

  } catch (error) {
    console.error('Error fetching grant application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grant application',
      error: error.message
    });
  }
};

/**
 * Update grant application
 */
exports.updateGrantApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const existingGrant = await prisma.grantApplication.findUnique({
      where: { id },
      include: { consortiumOrganizations: true, investigators: true }
    });

    if (!existingGrant) {
      return res.status(404).json({
        success: false,
        message: 'Grant application not found'
      });
    }

    // Check if user can edit
    if (existingGrant.applicantUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this application'
      });
    }

    // Check if editable status
    if (!['draft', 'changes_required'].includes(existingGrant.status)) {
      return res.status(400).json({
        success: false,
        message: 'This application cannot be edited in its current status'
      });
    }

    const {
      title,
      agencyName,
      submittedAmount,
      sdgGoals,
      projectType,
      numberOfConsortiumOrgs,
      projectStatus,
      projectCategory,
      fundingAgencyType,
      fundingAgencyName,
      totalInvestigators,
      numberOfInternalPIs,
      numberOfInternalCoPIs,
      isPIExternal,
      myRole,
      dateOfSubmission,
      projectStartDate,
      projectEndDate,
      projectDurationMonths,
      schoolId,
      departmentId,
      consortiumOrganizations,
      investigators
    } = req.body;

    // Delete existing consortium orgs and investigators
    await prisma.grantInvestigator.deleteMany({
      where: { grantApplicationId: id }
    });
    await prisma.grantConsortiumOrganization.deleteMany({
      where: { grantApplicationId: id }
    });

    // Update grant application
    const updatedGrant = await prisma.grantApplication.update({
      where: { id },
      data: {
        title,
        agencyName,
        submittedAmount: submittedAmount ? parseFloat(submittedAmount) : null,
        sdgGoals: sdgGoals || [],
        projectType: projectType || 'indian',
        numberOfConsortiumOrgs: numberOfConsortiumOrgs || 0,
        projectStatus: projectStatus || 'submitted',
        projectCategory: projectCategory || 'govt',
        fundingAgencyType: fundingAgencyType || null,
        fundingAgencyName: fundingAgencyName || null,
        totalInvestigators: totalInvestigators || 1,
        numberOfInternalPIs: numberOfInternalPIs || 1,
        numberOfInternalCoPIs: numberOfInternalCoPIs || 0,
        isPIExternal: isPIExternal || false,
        myRole: myRole || 'pi',
        dateOfSubmission: dateOfSubmission ? new Date(dateOfSubmission) : null,
        projectStartDate: projectStartDate ? new Date(projectStartDate) : null,
        projectEndDate: projectEndDate ? new Date(projectEndDate) : null,
        projectDurationMonths: projectDurationMonths ? parseInt(projectDurationMonths) : null,
        schoolId: schoolId || null,
        departmentId: departmentId || null,
        // Recreate consortium organizations
        consortiumOrganizations: projectType === 'international' && consortiumOrganizations?.length > 0 ? {
          create: consortiumOrganizations.map((org, index) => ({
            organizationName: org.organizationName,
            country: org.country,
            numberOfMembers: org.numberOfMembers || 1,
            displayOrder: index
          }))
        } : undefined
      },
      include: {
        consortiumOrganizations: true
      }
    });

    // Add investigators
    if (investigators && investigators.length > 0) {
      const orgIdMap = {};
      if (updatedGrant.consortiumOrganizations) {
        consortiumOrganizations?.forEach((inputOrg, index) => {
          const createdOrg = updatedGrant.consortiumOrganizations[index];
          if (createdOrg) {
            orgIdMap[inputOrg.id] = createdOrg.id;
          }
        });
      }

      for (const inv of investigators) {
        await prisma.grantInvestigator.create({
          data: {
            grantApplicationId: id,
            userId: inv.userId || null,
            uid: inv.uid || null,
            name: inv.name,
            email: inv.email || null,
            designation: inv.designation || null,
            affiliation: inv.affiliation || null,
            department: inv.department || null,
            roleType: inv.roleType || 'co_investigator',
            isInternal: inv.isInternal !== false,
            investigatorType: inv.investigatorType || 'Faculty',
            consortiumOrgId: inv.consortiumOrgId ? orgIdMap[inv.consortiumOrgId] : null,
            isTeamCoordinator: inv.isTeamCoordinator || false,
            displayOrder: inv.displayOrder || 0
          }
        });
      }
    }

    // Fetch complete updated grant
    const completeGrant = await prisma.grantApplication.findUnique({
      where: { id },
      include: {
        consortiumOrganizations: true,
        investigators: {
          include: { consortiumOrg: true },
          orderBy: { displayOrder: 'asc' }
        },
        school: true,
        department: true
      }
    });

    res.json({
      success: true,
      message: 'Grant application updated successfully',
      data: completeGrant
    });

  } catch (error) {
    console.error('Error updating grant application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update grant application',
      error: error.message
    });
  }
};

/**
 * Submit grant application
 */
exports.submitGrantApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const grant = await prisma.grantApplication.findUnique({
      where: { id }
    });

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: 'Grant application not found'
      });
    }

    if (grant.applicantUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to submit this application'
      });
    }

    if (!['draft', 'changes_required'].includes(grant.status)) {
      return res.status(400).json({
        success: false,
        message: 'This application cannot be submitted in its current status'
      });
    }

    // Generate application number if not exists
    let applicationNumber = grant.applicationNumber;
    if (!applicationNumber) {
      applicationNumber = await generateApplicationNumber();
    }

    // Update status
    const updatedGrant = await prisma.grantApplication.update({
      where: { id },
      data: {
        applicationNumber,
        status: 'submitted',
        submittedAt: new Date(),
        revisionCount: grant.status === 'changes_required' ? grant.revisionCount + 1 : grant.revisionCount
      }
    });

    // Create status history
    await prisma.grantApplicationStatusHistory.create({
      data: {
        grantApplicationId: id,
        fromStatus: grant.status,
        toStatus: 'submitted',
        changedById: userId,
        comments: grant.status === 'changes_required' ? 'Resubmitted after changes' : 'Application submitted for review'
      }
    });

    res.json({
      success: true,
      message: 'Grant application submitted successfully',
      data: updatedGrant
    });

  } catch (error) {
    console.error('Error submitting grant application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit grant application',
      error: error.message
    });
  }
};

/**
 * Delete grant application (only drafts)
 */
exports.deleteGrantApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const grant = await prisma.grantApplication.findUnique({
      where: { id }
    });

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: 'Grant application not found'
      });
    }

    if (grant.applicantUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this application'
      });
    }

    if (grant.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft applications can be deleted'
      });
    }

    await prisma.grantApplication.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Grant application deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting grant application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete grant application',
      error: error.message
    });
  }
};

/**
 * Get pending grant applications for review (DRD)
 */
exports.getPendingGrantReviews = async (req, res) => {
  try {
    const userId = req.user?.id;

    // Check if user has DRD permissions
    const userDrdPermission = await prisma.centralDepartmentPermission.findFirst({
      where: {
        userId,
        isActive: true,
        centralDept: {
          OR: [
            { departmentCode: 'DRD' },
            { shortName: 'DRD' }
          ]
        }
      }
    });

    if (!userDrdPermission) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - No DRD permissions'
      });
    }

    const permissions = userDrdPermission.permissions || {};
    const hasReviewPerm = permissions.research_review === true || permissions.grant_review === true;
    const hasApprovePerm = permissions.research_approve === true || permissions.grant_approve === true;

    if (!hasReviewPerm && !hasApprovePerm) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - No grant review permissions'
      });
    }

    // Get assigned school IDs
    const assignedSchoolIds = userDrdPermission.assignedSchoolIds || 
                              userDrdPermission.assignedResearchSchoolIds || 
                              [];

    const whereClause = {
      status: {
        in: ['submitted', 'under_review', 'resubmitted']
      }
    };

    // Filter by assigned schools if not head
    if (!hasApprovePerm && assignedSchoolIds.length > 0) {
      whereClause.schoolId = { in: assignedSchoolIds };
    }

    const grants = await prisma.grantApplication.findMany({
      where: whereClause,
      include: {
        school: true,
        department: true,
        applicantUser: {
          select: {
            uid: true,
            email: true,
            employeeDetails: {
              select: { firstName: true, lastName: true, displayName: true }
            }
          }
        },
        consortiumOrganizations: true,
        investigators: true
      },
      orderBy: { submittedAt: 'asc' }
    });

    res.json({
      success: true,
      data: grants
    });

  } catch (error) {
    console.error('Error fetching pending grant reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending reviews',
      error: error.message
    });
  }
};

/**
 * Start reviewing a grant application
 */
exports.startReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const grant = await prisma.grantApplication.findUnique({
      where: { id }
    });

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: 'Grant application not found'
      });
    }

    if (!['submitted', 'resubmitted'].includes(grant.status)) {
      return res.status(400).json({
        success: false,
        message: 'Grant application cannot be reviewed in its current status'
      });
    }

    // Update status
    const updatedGrant = await prisma.grantApplication.update({
      where: { id },
      data: {
        status: 'under_review',
        currentReviewerId: userId
      }
    });

    // Create review record
    await prisma.grantApplicationReview.create({
      data: {
        grantApplicationId: id,
        reviewerId: userId,
        reviewerRole: 'reviewer',
        decision: 'reviewing',
        comments: 'Review started'
      }
    });

    // Create status history
    await prisma.grantApplicationStatusHistory.create({
      data: {
        grantApplicationId: id,
        fromStatus: grant.status,
        toStatus: 'under_review',
        changedById: userId,
        comments: 'Review process started'
      }
    });

    res.json({
      success: true,
      message: 'Review started successfully',
      data: updatedGrant
    });

  } catch (error) {
    console.error('Error starting grant review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start review',
      error: error.message
    });
  }
};

/**
 * Request changes on a grant application
 */
exports.requestChanges = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { comments, suggestions } = req.body;

    if (!comments) {
      return res.status(400).json({
        success: false,
        message: 'Comments are required when requesting changes'
      });
    }

    const grant = await prisma.grantApplication.findUnique({
      where: { id }
    });

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: 'Grant application not found'
      });
    }

    if (grant.status !== 'under_review') {
      return res.status(400).json({
        success: false,
        message: 'Changes can only be requested for applications under review'
      });
    }

    // Update status
    const updatedGrant = await prisma.grantApplication.update({
      where: { id },
      data: {
        status: 'changes_required',
        currentReviewerId: null
      }
    });

    // Create review record
    await prisma.grantApplicationReview.create({
      data: {
        grantApplicationId: id,
        reviewerId: userId,
        reviewerRole: 'reviewer',
        decision: 'changes_required',
        comments,
        reviewedAt: new Date()
      }
    });

    // Create status history
    await prisma.grantApplicationStatusHistory.create({
      data: {
        grantApplicationId: id,
        fromStatus: 'under_review',
        toStatus: 'changes_required',
        changedById: userId,
        comments
      }
    });

    res.json({
      success: true,
      message: 'Changes requested successfully',
      data: updatedGrant
    });

  } catch (error) {
    console.error('Error requesting changes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request changes',
      error: error.message
    });
  }
};

/**
 * Recommend grant application for approval
 */
exports.recommendForApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { comments } = req.body;

    const grant = await prisma.grantApplication.findUnique({
      where: { id }
    });

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: 'Grant application not found'
      });
    }

    if (grant.status !== 'under_review') {
      return res.status(400).json({
        success: false,
        message: 'Only applications under review can be recommended'
      });
    }

    // Keep status as under_review (waiting for DRD head approval)
    const updatedGrant = await prisma.grantApplication.update({
      where: { id },
      data: {
        currentReviewerId: null
      }
    });

    // Create review record
    await prisma.grantApplicationReview.create({
      data: {
        grantApplicationId: id,
        reviewerId: userId,
        reviewerRole: 'reviewer',
        decision: 'recommended',
        comments: comments || 'Recommended for approval',
        reviewedAt: new Date()
      }
    });

    // Create status history
    await prisma.grantApplicationStatusHistory.create({
      data: {
        grantApplicationId: id,
        fromStatus: 'under_review',
        toStatus: 'under_review',
        changedById: userId,
        comments: comments || 'Recommended for approval by reviewer'
      }
    });

    res.json({
      success: true,
      message: 'Grant application recommended for approval',
      data: updatedGrant
    });

  } catch (error) {
    console.error('Error recommending grant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recommend grant',
      error: error.message
    });
  }
};

/**
 * Approve grant application (DRD Head)
 */
exports.approveGrant = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { comments } = req.body;

    const grant = await prisma.grantApplication.findUnique({
      where: { id }
    });

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: 'Grant application not found'
      });
    }

    if (grant.status !== 'under_review') {
      return res.status(400).json({
        success: false,
        message: 'Only applications under review can be approved'
      });
    }

    // Update status to approved
    const updatedGrant = await prisma.grantApplication.update({
      where: { id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedById: userId,
        currentReviewerId: null
      }
    });

    // Create review record
    await prisma.grantApplicationReview.create({
      data: {
        grantApplicationId: id,
        reviewerId: userId,
        reviewerRole: 'approver',
        decision: 'approved',
        comments: comments || 'Grant application approved',
        reviewedAt: new Date()
      }
    });

    // Create status history
    await prisma.grantApplicationStatusHistory.create({
      data: {
        grantApplicationId: id,
        fromStatus: 'under_review',
        toStatus: 'approved',
        changedById: userId,
        comments: comments || 'Grant application approved by DRD'
      }
    });

    res.json({
      success: true,
      message: 'Grant application approved successfully',
      data: updatedGrant
    });

  } catch (error) {
    console.error('Error approving grant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve grant',
      error: error.message
    });
  }
};

/**
 * Reject grant application
 */
exports.rejectGrant = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { comments, reason } = req.body;

    if (!comments && !reason) {
      return res.status(400).json({
        success: false,
        message: 'Comments or reason required when rejecting'
      });
    }

    const grant = await prisma.grantApplication.findUnique({
      where: { id }
    });

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: 'Grant application not found'
      });
    }

    if (!['under_review', 'submitted', 'resubmitted'].includes(grant.status)) {
      return res.status(400).json({
        success: false,
        message: 'Grant application cannot be rejected in its current status'
      });
    }

    // Update status
    const updatedGrant = await prisma.grantApplication.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedById: userId,
        currentReviewerId: null
      }
    });

    // Create review record
    await prisma.grantApplicationReview.create({
      data: {
        grantApplicationId: id,
        reviewerId: userId,
        reviewerRole: 'approver',
        decision: 'rejected',
        comments: comments || reason || 'Grant application rejected',
        reviewedAt: new Date()
      }
    });

    // Create status history
    await prisma.grantApplicationStatusHistory.create({
      data: {
        grantApplicationId: id,
        fromStatus: grant.status,
        toStatus: 'rejected',
        changedById: userId,
        comments: comments || reason || 'Grant application rejected'
      }
    });

    res.json({
      success: true,
      message: 'Grant application rejected',
      data: updatedGrant
    });

  } catch (error) {
    console.error('Error rejecting grant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject grant',
      error: error.message
    });
  }
};

/**
 * Mark grant application as completed
 */
exports.markCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const grant = await prisma.grantApplication.findUnique({
      where: { id }
    });

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: 'Grant application not found'
      });
    }

    if (grant.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved grants can be marked as completed'
      });
    }

    // Update status
    const updatedGrant = await prisma.grantApplication.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });

    // Create status history
    await prisma.grantApplicationStatusHistory.create({
      data: {
        grantApplicationId: id,
        fromStatus: 'approved',
        toStatus: 'completed',
        changedById: userId,
        comments: 'Grant application marked as completed'
      }
    });

    res.json({
      success: true,
      message: 'Grant application marked as completed',
      data: updatedGrant
    });

  } catch (error) {
    console.error('Error marking grant as completed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark grant as completed',
      error: error.message
    });
  }
};
