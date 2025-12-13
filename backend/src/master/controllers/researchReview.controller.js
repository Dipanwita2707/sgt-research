/**
 * Research Review Controller
 * Handles DRD review workflow for research contributions
 * Flow: submitted → under_review → [changes_required → resubmitted] → approved → completed
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get pending research contributions for review
 * Filters by assigned schools based on user's permissions
 */
exports.getPendingReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, publicationType, schoolId } = req.query;

    // Get user's DRD permissions and assigned schools
    let userDrdPermission = null;
    try {
      const drdDept = await prisma.centralDepartment.findFirst({
        where: {
          OR: [
            { departmentCode: 'DRD' },
            { departmentCode: 'drd' },
            { shortName: 'DRD' }
          ]
        }
      });

      if (drdDept) {
        userDrdPermission = await prisma.centralDepartmentPermission.findFirst({
          where: {
            userId,
            isActive: true,
            centralDeptId: drdDept.id
          },
          select: {
            permissions: true,
            assignedResearchSchoolIds: true
          }
        });
      }
    } catch (permError) {
      console.log('Note: Error fetching DRD permissions:', permError.message);
    }

    const permissions = userDrdPermission?.permissions || {};
    const assignedSchoolIds = userDrdPermission?.assignedResearchSchoolIds || [];

    const hasApprovePermission = permissions.research_approve === true;
    const hasReviewPermission = permissions.research_review === true;

    if (!hasApprovePermission && !hasReviewPermission) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - No research review or approve permissions'
      });
    }

    // Build status filter based on permissions
    const pendingStatuses = ['submitted', 'under_review', 'resubmitted', 'changes_required'];
    let whereClause = {};

    if (hasApprovePermission && !hasReviewPermission) {
      // ONLY approve permission: Show only recommended contributions (awaiting final approval)
      // Get IDs of contributions with recommended reviews
      const recommendedContributions = await prisma.researchContributionReview.findMany({
        where: {
          decision: 'recommended'
        },
        select: {
          researchContributionId: true
        },
        distinct: ['researchContributionId']
      });

      const recommendedIds = recommendedContributions.map(r => r.researchContributionId);

      whereClause = {
        AND: [
          {
            id: { in: recommendedIds.length > 0 ? recommendedIds : ['none'] }
          },
          {
            status: 'under_review'
          }
        ]
      };
    } else if (hasReviewPermission && !hasApprovePermission) {
      // ONLY review permission: Show based on assigned schools
      if (assignedSchoolIds.length > 0) {
        whereClause = {
          AND: [
            {
              status: {
                in: status ? [status] : pendingStatuses
              }
            },
            {
              OR: [
                { schoolId: { in: assignedSchoolIds } },
                { schoolId: null }
              ]
            }
          ]
        };
      } else {
        // No assigned schools - can see all pending
        whereClause = {
          status: {
            in: status ? [status] : pendingStatuses
          }
        };
      }
    } else {
      // BOTH permissions: Show school-based reviews + all recommended contributions
      const recommendedContributions = await prisma.researchContributionReview.findMany({
        where: {
          decision: 'recommended'
        },
        select: {
          researchContributionId: true
        },
        distinct: ['researchContributionId']
      });

      const recommendedIds = recommendedContributions.map(r => r.researchContributionId);

      if (assignedSchoolIds.length > 0) {
        // Show: assigned schools + all recommended
        whereClause = {
          AND: [
            {
              status: {
                in: status ? [status] : [...pendingStatuses, 'approved']
              }
            },
            {
              OR: [
                { schoolId: { in: assignedSchoolIds } },
                { schoolId: null },
                { id: { in: recommendedIds.length > 0 ? recommendedIds : [] } }
              ]
            }
          ]
        };
      } else {
        // No assigned schools - show all
        whereClause = {
          status: {
            in: status ? [status] : [...pendingStatuses, 'approved']
          }
        };
      }
    }

    // Add publication type filter (merge into existing AND clause if present)
    if (publicationType) {
      if (whereClause.AND) {
        whereClause.AND.push({ publicationType });
      } else {
        whereClause.publicationType = publicationType;
      }
    }

    // Add school filter (merge into existing AND clause if present)
    if (schoolId) {
      if (whereClause.AND) {
        whereClause.AND.push({ schoolId });
      } else {
        whereClause.schoolId = schoolId;
      }
    }

    const contributions = await prisma.researchContribution.findMany({
      where: whereClause,
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
        applicantDetails: true,
        authors: true,
        school: {
          select: {
            id: true,
            facultyName: true,
            shortName: true
          }
        },
        department: {
          select: {
            id: true,
            departmentName: true,
            shortName: true
          }
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: {
            reviewer: {
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
        },
        editSuggestions: {
          where: { status: 'pending' }
        }
      },
      orderBy: { submittedAt: 'asc' }
    });

    // Get statistics
    const stats = {
      submitted: contributions.filter(c => c.status === 'submitted').length,
      underReview: contributions.filter(c => c.status === 'under_review').length,
      changesRequired: contributions.filter(c => c.status === 'changes_required').length,
      resubmitted: contributions.filter(c => c.status === 'resubmitted').length,
      approved: contributions.filter(c => c.status === 'approved').length,
      total: contributions.length
    };

    // Add recommendation status to each contribution
    const enrichedContributions = contributions.map(contrib => {
      const latestReview = contrib.reviews?.[0];
      const isRecommended = latestReview?.decision === 'recommended';
      
      return {
        ...contrib,
        isRecommended,
        awaitingFinalApproval: isRecommended && contrib.status === 'under_review'
      };
    });

    res.status(200).json({
      success: true,
      data: {
        contributions: enrichedContributions,
        stats,
        userPermissions: {
          hasApprovePermission,
          hasReviewPermission,
          assignedSchoolIds,
          canReview: hasReviewPermission,
          canApprove: hasApprovePermission
        }
      }
    });
  } catch (error) {
    console.error('Get pending reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending reviews',
      error: error.message
    });
  }
};

/**
 * Start review - move to under_review status
 */
exports.startReview = async (req, res) => {
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

    if (!['submitted', 'resubmitted'].includes(contribution.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot start review for contribution in status: ${contribution.status}`
      });
    }

    const updated = await prisma.researchContribution.update({
      where: { id },
      data: {
        status: 'under_review',
        currentReviewerId: userId
      }
    });

    await prisma.researchContributionStatusHistory.create({
      data: {
        researchContributionId: id,
        fromStatus: contribution.status,
        toStatus: 'under_review',
        changedById: userId,
        comments: 'Review started'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Review started',
      data: updated
    });
  } catch (error) {
    console.error('Start review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start review',
      error: error.message
    });
  }
};

/**
 * Request changes from applicant
 */
exports.requestChanges = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { comments, suggestions } = req.body;

    const contribution = await prisma.researchContribution.findUnique({
      where: { id }
    });

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Research contribution not found'
      });
    }

    if (!['submitted', 'under_review', 'resubmitted'].includes(contribution.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot request changes for contribution in status: ${contribution.status}`
      });
    }

    // Create review record
    await prisma.researchContributionReview.create({
      data: {
        researchContributionId: id,
        reviewerId: userId,
        reviewerRole: 'drd_reviewer',
        comments,
        decision: 'changes_required',
        hasSuggestions: suggestions && suggestions.length > 0,
        suggestionsCount: suggestions?.length || 0,
        pendingSuggestionsCount: suggestions?.length || 0,
        reviewedAt: new Date()
      }
    });

    // Create edit suggestions if provided
    if (suggestions && suggestions.length > 0) {
      for (const suggestion of suggestions) {
        await prisma.researchContributionEditSuggestion.create({
          data: {
            researchContributionId: id,
            reviewerId: userId,
            fieldName: suggestion.fieldName,
            fieldPath: suggestion.fieldPath,
            originalValue: suggestion.originalValue,
            suggestedValue: suggestion.suggestedValue,
            suggestionNote: suggestion.note,
            status: 'pending'
          }
        });
      }
    }

    // Update status
    const updated = await prisma.researchContribution.update({
      where: { id },
      data: {
        status: 'changes_required'
      }
    });

    // Create status history
    await prisma.researchContributionStatusHistory.create({
      data: {
        researchContributionId: id,
        fromStatus: contribution.status,
        toStatus: 'changes_required',
        changedById: userId,
        comments: comments || 'Changes requested by DRD reviewer'
      }
    });

    // Notify applicant
    if (contribution.applicantUserId) {
      await prisma.notification.create({
        data: {
          userId: contribution.applicantUserId,
          type: 'research_changes_required',
          title: 'Changes Requested',
          message: `Your research contribution "${contribution.title}" requires changes. Please review the feedback.`,
          referenceType: 'research_contribution',
          referenceId: id
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Changes requested successfully',
      data: updated
    });
  } catch (error) {
    console.error('Request changes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request changes',
      error: error.message
    });
  }
};

/**
 * Recommend contribution for approval (Reviewer with research_review permission)
 * Updates status to indicate it's ready for final approval
 */
exports.recommendForApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { comments } = req.body;

    const contribution = await prisma.researchContribution.findUnique({
      where: { id },
      include: {
        applicantUser: true
      }
    });

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Research contribution not found'
      });
    }

    if (!['submitted', 'under_review', 'resubmitted'].includes(contribution.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot recommend contribution in status: ${contribution.status}`
      });
    }

    // Update status to recommended (uses under_review with a review entry)
    const updated = await prisma.researchContribution.update({
      where: { id },
      data: {
        status: 'under_review',
        currentReviewerId: userId,
        reviews: {
          create: {
            reviewerId: userId,
            reviewerRole: req.user.role || 'reviewer',
            decision: 'recommended',
            comments: comments || 'Recommended for final approval',
            reviewedAt: new Date()
          }
        },
        statusHistory: {
          create: {
            fromStatus: contribution.status,
            toStatus: 'under_review',
            changedById: userId,
            comments: comments || 'Recommended for final approval by reviewer',
            metadata: {
              action: 'recommended_for_approval',
              decision: 'recommended'
            }
          }
        }
      },
      include: {
        authors: true,
        applicantUser: true,
        school: true,
        department: true,
        reviews: {
          include: {
            reviewer: {
              include: {
                employeeDetails: true
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
        }
      }
    });

    // Create notification for approvers
    try {
      // Get users with research_approve permission
      const approvers = await prisma.centralDepartmentMember.findMany({
        where: {
          centralDepartmentId: contribution.assignedDeptId,
          permissions: {
            path: ['research_approve'],
            equals: true
          }
        },
        include: {
          employee: true
        }
      });

      for (const approver of approvers) {
        await prisma.notification.create({
          data: {
            userId: approver.employeeId,
            type: 'research_recommended',
            title: 'Research Contribution Recommended',
            message: `${updated.title} has been recommended for approval by a reviewer.`,
            referenceType: 'research_contribution',
            referenceId: id
          }
        });
      }
    } catch (notifError) {
      console.error('Failed to send notifications:', notifError);
      // Continue even if notification fails
    }

    res.status(200).json({
      success: true,
      message: 'Contribution recommended for approval successfully',
      data: updated
    });
  } catch (error) {
    console.error('Recommend for approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recommend contribution',
      error: error.message
    });
  }
};

/**
 * Approve research contribution (DRD Head only)
 * Credits incentives to all authors based on their roles
 */
exports.approveContribution = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { comments } = req.body;

    const contribution = await prisma.researchContribution.findUnique({
      where: { id },
      include: {
        authors: true,
        applicantUser: true
      }
    });

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Research contribution not found'
      });
    }

    if (!['submitted', 'under_review', 'resubmitted'].includes(contribution.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot approve contribution in status: ${contribution.status}`
      });
    }

    // Get active research policy for this publication type
    let policy = await prisma.researchIncentivePolicy.findFirst({
      where: {
        publicationType: contribution.publicationType,
        isActive: true
      }
    });

    // Default policy if none found
    const defaultAuthorMultipliers = {
      first_and_corresponding: 1.0,
      first_author: 0.7,
      corresponding_author: 0.7,
      co_author: 0.3,
      senior_author: 0.4
    };

    const defaultIndexingBonuses = {
      scopus: 10000,
      wos: 15000,
      sci: 20000,
      ugc: 5000
    };

    const baseAmount = policy ? Number(policy.baseIncentiveAmount) : 30000;
    const basePoints = policy ? policy.basePoints : 30;
    const authorMultipliers = policy?.authorTypeMultipliers || defaultAuthorMultipliers;
    const indexingBonuses = policy?.indexingBonuses || defaultIndexingBonuses;

    // Credit incentives to all authors based on their roles
    const now = new Date();
    let totalIncentiveAwarded = 0;
    let totalPointsAwarded = 0;

    for (const author of contribution.authors) {
      // Calculate incentive based on author role
      const authorRole = author.authorType || 'co_author';
      const roleMultiplier = authorMultipliers[authorRole] || authorMultipliers.co_author || 0.3;
      
      let authorIncentive = baseAmount * roleMultiplier;
      let authorPoints = Math.round(basePoints * roleMultiplier);

      // Add indexing bonus if applicable
      if (contribution.targetedResearchType && indexingBonuses[contribution.targetedResearchType]) {
        const indexingBonus = indexingBonuses[contribution.targetedResearchType] * roleMultiplier;
        authorIncentive += indexingBonus;
      }

      // Add quartile bonus if applicable
      if (contribution.quartile && indexingBonuses.quartileBonuses) {
        const quartileBonus = (indexingBonuses.quartileBonuses[contribution.quartile] || 0) * roleMultiplier;
        authorIncentive += quartileBonus;
      }

      // Update author with calculated incentive
      await prisma.researchContributionAuthor.update({
        where: { id: author.id },
        data: {
          incentiveShare: Math.round(authorIncentive),
          pointsShare: authorPoints
        }
      });

      totalIncentiveAwarded += Math.round(authorIncentive);
      totalPointsAwarded += authorPoints;

      if (author.userId) {
        // Create notification for each internal author
        await prisma.notification.create({
          data: {
            userId: author.userId,
            type: 'research_incentive_credited',
            title: 'Research Incentive Credited',
            message: `You have been credited ₹${Math.round(authorIncentive).toLocaleString()} and ${authorPoints} points for "${contribution.title}" as ${authorRole.replace(/_/g, ' ')}.`,
            referenceType: 'research_contribution',
            referenceId: id,
            metadata: {
              incentiveAmount: Math.round(authorIncentive),
              points: authorPoints,
              authorType: authorRole,
              roleMultiplier: roleMultiplier
            }
          }
        });
      }
    }

    // Notify applicant
    if (contribution.applicantUserId) {
      await prisma.notification.create({
        data: {
          userId: contribution.applicantUserId,
          type: 'research_approved',
          title: 'Research Contribution Approved',
          message: `Your research contribution "${contribution.title}" has been approved. Total incentives credited: ₹${totalIncentiveAwarded.toLocaleString()}.`,
          referenceType: 'research_contribution',
          referenceId: id,
          metadata: {
            incentiveAmount: totalIncentiveAwarded,
            points: totalPointsAwarded
          }
        }
      });
    }

    // Create review record
    await prisma.researchContributionReview.create({
      data: {
        researchContributionId: id,
        reviewerId: userId,
        reviewerRole: 'drd_head',
        comments,
        decision: 'approved',
        reviewedAt: now
      }
    });

    // Update contribution status and credit incentives
    const updated = await prisma.researchContribution.update({
      where: { id },
      data: {
        status: 'approved',
        incentiveAmount: totalIncentiveAwarded,
        pointsAwarded: totalPointsAwarded,
        creditedAt: now,
        completedAt: now
      }
    });

    // Create status history
    await prisma.researchContributionStatusHistory.create({
      data: {
        researchContributionId: id,
        fromStatus: contribution.status,
        toStatus: 'approved',
        changedById: userId,
        comments: comments || 'Approved by DRD Head - Incentives credited based on author roles'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Research contribution approved and incentives credited based on author roles',
      data: {
        ...updated,
        incentiveBreakdown: {
          totalIncentiveAwarded,
          totalPointsAwarded,
          authorCount: contribution.authors.length,
          policyUsed: policy ? policy.policyName : 'Default Policy'
        }
      }
    });
  } catch (error) {
    console.error('Approve contribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve contribution',
      error: error.message
    });
  }
};

/**
 * Reject research contribution
 */
exports.rejectContribution = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { comments, reason } = req.body;

    const contribution = await prisma.researchContribution.findUnique({
      where: { id }
    });

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Research contribution not found'
      });
    }

    // Create review record
    await prisma.researchContributionReview.create({
      data: {
        researchContributionId: id,
        reviewerId: userId,
        reviewerRole: 'drd_head',
        comments: comments || reason,
        decision: 'rejected',
        reviewedAt: new Date()
      }
    });

    // Update status
    const updated = await prisma.researchContribution.update({
      where: { id },
      data: {
        status: 'rejected'
      }
    });

    // Create status history
    await prisma.researchContributionStatusHistory.create({
      data: {
        researchContributionId: id,
        fromStatus: contribution.status,
        toStatus: 'rejected',
        changedById: userId,
        comments: comments || reason || 'Rejected by DRD'
      }
    });

    // Notify applicant
    if (contribution.applicantUserId) {
      await prisma.notification.create({
        data: {
          userId: contribution.applicantUserId,
          type: 'research_rejected',
          title: 'Research Contribution Rejected',
          message: `Your research contribution "${contribution.title}" has been rejected. Reason: ${reason || comments || 'Not specified'}`,
          referenceType: 'research_contribution',
          referenceId: id
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Research contribution rejected',
      data: updated
    });
  } catch (error) {
    console.error('Reject contribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject contribution',
      error: error.message
    });
  }
};

/**
 * Mark as completed (after approval)
 */
exports.markCompleted = async (req, res) => {
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

    if (contribution.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Can only mark approved contributions as completed'
      });
    }

    const updated = await prisma.researchContribution.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });

    await prisma.researchContributionStatusHistory.create({
      data: {
        researchContributionId: id,
        fromStatus: 'approved',
        toStatus: 'completed',
        changedById: userId,
        comments: 'Process completed'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Research contribution marked as completed',
      data: updated
    });
  } catch (error) {
    console.error('Mark completed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark as completed',
      error: error.message
    });
  }
};

/**
 * Get review statistics
 */
exports.getReviewStatistics = async (req, res) => {
  try {
    const { schoolId, publicationType, startDate, endDate } = req.query;

    const whereClause = {};

    if (schoolId) {
      whereClause.schoolId = schoolId;
    }

    if (publicationType) {
      whereClause.publicationType = publicationType;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    // Count by status
    const statusCounts = await prisma.researchContribution.groupBy({
      by: ['status'],
      where: whereClause,
      _count: {
        id: true
      }
    });

    // Count by publication type
    const typeCounts = await prisma.researchContribution.groupBy({
      by: ['publicationType'],
      where: whereClause,
      _count: {
        id: true
      }
    });

    // Total incentives and points
    const totals = await prisma.researchContribution.aggregate({
      where: {
        ...whereClause,
        status: { in: ['approved', 'completed'] }
      },
      _sum: {
        incentiveAmount: true,
        pointsAwarded: true
      },
      _count: {
        id: true
      }
    });

    // By school
    const schoolCounts = await prisma.researchContribution.groupBy({
      by: ['schoolId'],
      where: whereClause,
      _count: {
        id: true
      }
    });

    res.status(200).json({
      success: true,
      data: {
        byStatus: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        }, {}),
        byPublicationType: typeCounts.reduce((acc, item) => {
          acc[item.publicationType] = item._count.id;
          return acc;
        }, {}),
        totals: {
          approved: totals._count.id,
          totalIncentives: totals._sum.incentiveAmount || 0,
          totalPoints: totals._sum.pointsAwarded || 0
        },
        bySchool: schoolCounts
      }
    });
  } catch (error) {
    console.error('Get review statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message
    });
  }
};

/**
 * Respond to edit suggestion (by applicant)
 */
exports.respondToSuggestion = async (req, res) => {
  try {
    const { suggestionId } = req.params;
    const userId = req.user.id;
    const { accept, response } = req.body;

    const suggestion = await prisma.researchContributionEditSuggestion.findUnique({
      where: { id: suggestionId },
      include: {
        researchContribution: true
      }
    });

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: 'Suggestion not found'
      });
    }

    if (suggestion.researchContribution.applicantUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the applicant can respond to suggestions'
      });
    }

    // Update suggestion
    await prisma.researchContributionEditSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: accept ? 'accepted' : 'rejected',
        applicantResponse: response,
        respondedAt: new Date()
      }
    });

    // If accepted, apply the change
    if (accept && suggestion.fieldName && suggestion.suggestedValue) {
      const updateData = {};
      updateData[suggestion.fieldName] = suggestion.suggestedValue;
      
      await prisma.researchContribution.update({
        where: { id: suggestion.researchContributionId },
        data: updateData
      });
    }

    // Update pending suggestions count in review
    const pendingCount = await prisma.researchContributionEditSuggestion.count({
      where: {
        researchContributionId: suggestion.researchContributionId,
        status: 'pending'
      }
    });

    // Update the latest review record
    await prisma.researchContributionReview.updateMany({
      where: {
        researchContributionId: suggestion.researchContributionId
      },
      data: {
        pendingSuggestionsCount: pendingCount
      }
    });

    res.status(200).json({
      success: true,
      message: `Suggestion ${accept ? 'accepted' : 'rejected'} successfully`
    });
  } catch (error) {
    console.error('Respond to suggestion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to suggestion',
      error: error.message
    });
  }
};

/**
 * Get all schools for filtering
 */
exports.getSchoolsForFilter = async (req, res) => {
  try {
    const schools = await prisma.facultySchoolList.findMany({
      where: { isActive: true },
      select: {
        id: true,
        facultyCode: true,
        facultyName: true,
        shortName: true
      },
      orderBy: { facultyName: 'asc' }
    });

    res.status(200).json({
      success: true,
      data: schools
    });
  } catch (error) {
    console.error('Get schools error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get schools',
      error: error.message
    });
  }
};

module.exports = exports;
