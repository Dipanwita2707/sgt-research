const prisma = require('../../config/database');

// Helper function to generate unique application number
const generateApplicationNumber = async (iprType) => {
  const currentYear = new Date().getFullYear();
  const typePrefix = {
    patent: 'PAT',
    copyright: 'CPY',
    trademark: 'TRM',
    design: 'DES'
  };
  
  const prefix = typePrefix[iprType] || 'IPR';
  
  // Count existing applications of this type in current year
  const count = await prisma.iprApplication.count({
    where: {
      iprType,
      createdAt: {
        gte: new Date(`${currentYear}-01-01`),
        lt: new Date(`${currentYear + 1}-01-01`)
      }
    }
  });
  
  // Generate number: PAT-2025-0001
  return `${prefix}-${currentYear}-${String(count + 1).padStart(4, '0')}`;
};

// Create new IPR application (Patent/Copyright/Trademark)
const createIprApplication = async (req, res) => {
  try {
    const {
      applicantType,
      iprType,
      projectType,
      filingType,
      title,
      description,
      remarks,
      schoolId,
      departmentId,
      sdgs, // Array of SDG codes
      applicantDetails, // Object with internal/external applicant details
      contributors, // Array of additional contributors
      annexureFilePath,
      supportingDocsFilePaths,
    } = req.body;

    const userId = req.user.id;
    
    // Generate unique application number
    const applicationNumber = await generateApplicationNumber(iprType);

    // Create IPR application
    const iprApplication = await prisma.iprApplication.create({
      data: {
        applicationNumber,
        applicantUser: {
          connect: { id: userId }
        },
        applicantType,
        iprType,
        projectType,
        filingType,
        title,
        description,
        remarks,
        ...(schoolId && { school: { connect: { id: schoolId } } }),
        ...(departmentId && { department: { connect: { id: departmentId } } }),
        status: 'draft',
        annexureFilePath: annexureFilePath || '',
        supportingDocsFilePaths: supportingDocsFilePaths || [],
        applicantDetails: applicantDetails
          ? {
              create: {
                employeeCategory: applicantDetails.employeeCategory || null,
                employeeType: applicantDetails.employeeType || null,
                uid: applicantDetails.uid || null,
                email: applicantDetails.email || null,
                phone: applicantDetails.phone || null,
                universityDeptName: applicantDetails.universityDeptName || null,
                // Student-specific fields
                mentorName: applicantDetails.mentorName || null,
                mentorUid: applicantDetails.mentorUid || null,
                // Inventor fields
                isInventor: applicantDetails.isInventor || false,
                inventorName: applicantDetails.inventorName || null,
                inventorUid: applicantDetails.inventorUid || null,
                inventorEmail: applicantDetails.inventorEmail || null,
                inventorPhone: applicantDetails.inventorPhone || null,
                // External applicant fields
                externalName: applicantDetails.externalName || null,
                externalOption: applicantDetails.externalOption || null,
                instituteType: applicantDetails.instituteType || null,
                companyUniversityName: applicantDetails.companyUniversityName || null,
                externalEmail: applicantDetails.externalEmail || null,
                externalPhone: applicantDetails.externalPhone || null,
                externalAddress: applicantDetails.externalAddress || null,
                // Store contributors in metadata
                metadata: {
                  contributors: contributors || [],
                  ...applicantDetails.metadata,
                },
              },
            }
          : undefined,
        sdgs: sdgs
          ? {
              create: sdgs.map((sdg) => ({
                sdgCode: sdg.code,
                sdgTitle: sdg.title,
              })),
            }
          : undefined,
      },
      include: {
        applicantDetails: true,
        sdgs: true,
        school: {
          select: {
            facultyName: true,
            facultyCode: true,
          },
        },
        department: {
          select: {
            departmentName: true,
            departmentCode: true,
          },
        },
      },
    });

    // Create status history entry
    await prisma.iprStatusHistory.create({
      data: {
        iprApplicationId: iprApplication.id,
        toStatus: 'draft',
        changedById: userId,
        comments: 'IPR application created',
      },
    });

    // Create contributor records for each contributor (so they can view the application)
    if (contributors && contributors.length > 0) {
      for (const contributor of contributors) {
        // Try to find the user by UID to link them
        let contributorUserId = null;
        if (contributor.uid) {
          const userLogin = await prisma.userLogin.findUnique({
            where: { uid: contributor.uid },
            select: { id: true }
          });
          if (userLogin) {
            contributorUserId = userLogin.id;
          }
        }

        await prisma.iprContributor.create({
          data: {
            iprApplicationId: iprApplication.id,
            userId: contributorUserId,
            uid: contributor.uid || null,
            name: contributor.name || 'Unknown',
            email: contributor.email || null,
            phone: contributor.phone || null,
            department: contributor.universityDeptName || null,
            employeeCategory: contributor.employeeCategory || null,
            employeeType: contributor.employeeType || null,
            role: 'inventor',
            canView: true,
            canEdit: false,
          },
        });

        // Create notification for internal contributors
        if (contributorUserId) {
          await prisma.notification.create({
            data: {
              userId: contributorUserId,
              type: 'ipr_contributor_added',
              title: 'Added as Inventor/Contributor',
              message: `You have been added as an inventor/contributor to IPR application: "${title}"`,
              metadata: {
                iprApplicationId: iprApplication.id,
                iprTitle: title,
                iprType: iprType,
                addedBy: userId,
              },
            },
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'IPR application created successfully',
      data: iprApplication,
    });
  } catch (error) {
    console.error('Create IPR application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create IPR application',
      error: error.message,
    });
  }
};

// Submit IPR application (move from draft to submitted)
const submitIprApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if application exists and belongs to user
    const iprApplication = await prisma.iprApplication.findFirst({
      where: {
        id,
        applicantUserId: userId,
        status: 'draft',
      },
      include: {
        applicantDetails: true,
        applicantUser: {
          select: {
            id: true,
            uid: true,
            employeeDetails: {
              select: {
                firstName: true,
                lastName: true,
              }
            }
          }
        }
      }
    });

    if (!iprApplication) {
      return res.status(404).json({
        success: false,
        message: 'IPR application not found or already submitted',
      });
    }

    // Update status to submitted
    const updated = await prisma.iprApplication.update({
      where: { id },
      data: {
        status: 'submitted',
        submittedAt: new Date(),
      },
      include: {
        applicantDetails: true,
        sdgs: true,
        school: true,
        department: true,
      },
    });

    // Create status history entry
    await prisma.iprStatusHistory.create({
      data: {
        iprApplicationId: id,
        fromStatus: 'draft',
        toStatus: 'submitted',
        changedById: userId,
        comments: 'Application submitted for DRD review',
      },
    });

    // Get applicant name
    const applicantName = iprApplication.applicantUser?.employeeDetails 
      ? `${iprApplication.applicantUser.employeeDetails.firstName} ${iprApplication.applicantUser.employeeDetails.lastName || ''}`.trim()
      : 'An applicant';

    // Get IPR type label
    const iprTypeLabels = {
      'patent': 'Patent',
      'copyright': 'Copyright',
      'trademark': 'Trademark',
      'design': 'Design'
    };
    const iprTypeLabel = iprTypeLabels[iprApplication.iprType] || iprApplication.iprType;

    // Notify contributors/inventors from metadata
    const contributors = iprApplication.applicantDetails?.metadata?.contributors || [];
    
    for (const contributor of contributors) {
      if (contributor.uid) {
        // Find user by UID
        const contributorUser = await prisma.userLogin.findFirst({
          where: { uid: contributor.uid }
        });

        if (contributorUser && contributorUser.id !== userId) {
          // Create notification for contributor
          await prisma.notification.create({
            data: {
              userId: contributorUser.id,
              type: 'ipr_contributor',
              title: `You've been added as an inventor/contributor`,
              message: `${applicantName} has submitted a ${iprTypeLabel} application titled "${iprApplication.title}" and listed you as an inventor/contributor. Application ID: ${id.substring(0, 8).toUpperCase()}`,
              referenceType: 'ipr_application',
              referenceId: id,
              metadata: {
                iprType: iprApplication.iprType,
                applicantUserId: userId,
                applicantName: applicantName,
                contributorRole: contributor.employeeType || 'contributor',
              }
            }
          });
          console.log(`Notification sent to contributor: ${contributor.uid}`);
        }
      }
    }

    res.json({
      success: true,
      message: 'IPR application submitted successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Submit IPR application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit IPR application',
      error: error.message,
    });
  }
};

// Get all IPR applications (with filters)
const getAllIprApplications = async (req, res) => {
  try {
    const {
      status,
      iprType,
      schoolId,
      departmentId,
      applicantUserId,
      page = 1,
      limit = 10,
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (iprType) where.iprType = iprType;
    if (schoolId) where.schoolId = schoolId;
    if (departmentId) where.departmentId = departmentId;
    if (applicantUserId) where.applicantUserId = applicantUserId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [applications, total] = await Promise.all([
      prisma.iprApplication.findMany({
        where,
        skip,
        take,
        include: {
          applicantUser: {
            select: {
              uid: true,
              email: true,
              employeeDetails: {
                select: {
                  firstName: true,
                  lastName: true,
                  displayName: true,
                },
              },
            },
          },
          applicantDetails: true,
          sdgs: true,
          school: {
            select: {
              facultyName: true,
              facultyCode: true,
            },
          },
          department: {
            select: {
              departmentName: true,
              departmentCode: true,
            },
          },
          reviews: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.iprApplication.count({ where }),
    ]);

    res.json({
      success: true,
      data: applications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get IPR applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch IPR applications',
      error: error.message,
    });
  }
};

// Get IPR application by ID
const getIprApplicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await prisma.iprApplication.findUnique({
      where: { id },
      include: {
        applicantUser: {
          select: {
            uid: true,
            email: true,
            employeeDetails: {
              select: {
                firstName: true,
                lastName: true,
                displayName: true,
                empId: true,
              },
            },
          },
        },
        applicantDetails: true,
        sdgs: true,
        school: {
          select: {
            facultyName: true,
            facultyCode: true,
            shortName: true,
          },
        },
        department: {
          select: {
            departmentName: true,
            departmentCode: true,
            shortName: true,
          },
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                uid: true,
                email: true,
                employeeDetails: {
                  select: {
                    firstName: true,
                    lastName: true,
                    displayName: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        statusHistory: {
          include: {
            changedBy: {
              select: {
                uid: true,
                employeeDetails: {
                  select: {
                    displayName: true,
                  },
                },
              },
            },
          },
          orderBy: {
            changedAt: 'desc',
          },
        },
        contributors: {
          select: {
            id: true,
            uid: true,
            name: true,
            email: true,
            phone: true,
            department: true,
            employeeCategory: true,
            employeeType: true,
            role: true,
          },
        },
        financeRecords: {
          include: {
            financeReviewer: {
              select: {
                uid: true,
                employeeDetails: {
                  select: {
                    displayName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'IPR application not found',
      });
    }

    res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    console.error('Get IPR application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch IPR application',
      error: error.message,
    });
  }
};

// Update IPR application (only in draft status)
const updateIprApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      iprType,
      projectType,
      filingType,
      title,
      description,
      remarks,
      schoolId,
      departmentId,
      sdgs,
      applicantDetails,
      annexureS3Key,
      supportingDocsS3Keys,
    } = req.body;

    // Check if application exists and is in draft status
    const existing = await prisma.iprApplication.findFirst({
      where: {
        id,
        applicantUserId: userId,
        status: 'draft',
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'IPR application not found or cannot be edited',
      });
    }

    // Update application
    const updated = await prisma.iprApplication.update({
      where: { id },
      data: {
        iprType,
        projectType,
        filingType,
        title,
        description,
        remarks,
        schoolId,
        departmentId,
        annexureS3Key,
        supportingDocsS3Keys,
      },
      include: {
        applicantDetails: true,
        sdgs: true,
        school: true,
        department: true,
      },
    });

    // Update applicant details if provided
    if (applicantDetails) {
      await prisma.iprApplicantDetails.upsert({
        where: { iprApplicationId: id },
        update: applicantDetails,
        create: {
          iprApplicationId: id,
          ...applicantDetails,
        },
      });
    }

    // Update SDGs if provided
    if (sdgs) {
      // Delete existing SDGs
      await prisma.iprSdg.deleteMany({
        where: { iprApplicationId: id },
      });
      // Create new SDGs
      await prisma.iprSdg.createMany({
        data: sdgs.map((sdgCode) => ({
          iprApplicationId: id,
          sdgCode,
          sdgTitle: `SDG ${sdgCode.replace('SDG', '')}`,
        })),
      });
    }

    res.json({
      success: true,
      message: 'IPR application updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Update IPR application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update IPR application',
      error: error.message,
    });
  }
};

// Delete IPR application (only in draft status)
const deleteIprApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if application exists and is in draft status
    const existing = await prisma.iprApplication.findFirst({
      where: {
        id,
        applicantUserId: userId,
        status: 'draft',
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'IPR application not found or cannot be deleted',
      });
    }

    // Delete application (cascade will handle related records)
    await prisma.iprApplication.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'IPR application deleted successfully',
    });
  } catch (error) {
    console.error('Delete IPR application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete IPR application',
      error: error.message,
    });
  }
};

// Get my IPR applications (for applicant)
const getMyIprApplications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, iprType } = req.query;

    const where = { applicantUserId: userId };
    if (status) where.status = status;
    if (iprType) where.iprType = iprType;

    const applications = await prisma.iprApplication.findMany({
      where,
      include: {
        applicantUser: {
          select: {
            uid: true,
            employeeDetails: {
              select: {
                firstName: true,
                lastName: true,
              }
            }
          }
        },
        applicantDetails: true,
        contributors: {
          select: {
            id: true,
            uid: true,
            name: true,
            email: true,
            department: true,
            role: true,
          }
        },
        sdgs: true,
        school: {
          select: {
            facultyName: true,
          },
        },
        department: {
          select: {
            departmentName: true,
          },
        },
        reviews: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group applications by status
    const grouped = {
      draft: applications.filter((app) => app.status === 'draft'),
      submitted: applications.filter((app) => app.status === 'submitted'),
      under_review: applications.filter((app) => 
        ['under_drd_review', 'recommended_to_head', 'under_finance_review'].includes(app.status)
      ),
      changes_required: applications.filter((app) => app.status === 'changes_required'),
      approved: applications.filter((app) => 
        ['drd_head_approved', 'finance_approved', 'completed', 'submitted_to_govt', 'govt_application_filed', 'published'].includes(app.status)
      ),
      rejected: applications.filter((app) => 
        ['drd_rejected', 'finance_rejected', 'cancelled'].includes(app.status)
      ),
    };

    // Calculate statistics
    const stats = {
      total: applications.length,
      draft: grouped.draft.length,
      submitted: grouped.submitted.length,
      under_review: grouped.under_review.length,
      changes_required: grouped.changes_required.length,
      approved: grouped.approved.length,
      rejected: grouped.rejected.length,
    };

    res.json({
      success: true,
      data: applications,
      grouped,
      stats,
    });
  } catch (error) {
    console.error('Get my IPR applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your IPR applications',
      error: error.message,
    });
  }
};

// Get IPR statistics (for dashboard)
const getIprStatistics = async (req, res) => {
  try {
    const { schoolId, departmentId, userId } = req.query;

    const where = {};
    if (schoolId) where.schoolId = schoolId;
    if (departmentId) where.departmentId = departmentId;
    if (userId) where.applicantUserId = userId;

    const [
      totalApplications,
      submittedApplications,
      underReviewApplications,
      approvedApplications,
      rejectedApplications,
      completedApplications,
      byType,
      byStatus,
    ] = await Promise.all([
      prisma.iprApplication.count({ where }),
      prisma.iprApplication.count({ where: { ...where, status: 'submitted' } }),
      prisma.iprApplication.count({
        where: {
          ...where,
          status: { in: ['under_drd_review', 'recommended_to_head', 'under_finance_review'] },
        },
      }),
      prisma.iprApplication.count({
        where: {
          ...where,
          status: { in: ['drd_head_approved', 'finance_approved', 'submitted_to_govt', 'govt_application_filed', 'published'] },
        },
      }),
      prisma.iprApplication.count({
        where: {
          ...where,
          status: { in: ['drd_rejected', 'finance_rejected', 'cancelled'] },
        },
      }),
      prisma.iprApplication.count({ where: { ...where, status: 'completed' } }),
      prisma.iprApplication.groupBy({
        by: ['iprType'],
        where,
        _count: true,
      }),
      prisma.iprApplication.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
    ]);

    // For dashboard consistency, also get user's own applications if userId provided
    let myApplications = 0;
    if (userId) {
      myApplications = await prisma.iprApplication.count({ 
        where: { applicantUserId: userId } 
      });
    }

    res.json({
      success: true,
      data: {
        total: totalApplications,
        pending: submittedApplications,
        underReview: underReviewApplications,
        approved: approvedApplications,
        rejected: rejectedApplications,
        completed: completedApplications,
        myApplications,
        submitted: submittedApplications,
        byType,
        byStatus,
      },
    });
  } catch (error) {
    console.error('Get IPR statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch IPR statistics',
      error: error.message,
    });
  }
};

// Resubmit IPR application after changes
const resubmitIprApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get the application
    const application = await prisma.iprApplication.findUnique({
      where: { id },
      include: { applicantUser: true }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'IPR application not found'
      });
    }

    // Check if user owns this application
    if (application.applicantUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to resubmit this application'
      });
    }

    // Check if application can be resubmitted
    if (application.status !== 'changes_required') {
      return res.status(400).json({
        success: false,
        message: 'Application cannot be resubmitted in its current status'
      });
    }

    // Update application status and increment revision count
    // Keep the same currentReviewerId so it goes back to the same DRD member
    const updatedApplication = await prisma.iprApplication.update({
      where: { id },
      data: {
        status: 'resubmitted',
        submittedAt: new Date(),
        revisionCount: { increment: 1 }  // Increment revision loop count
      },
      include: {
        applicantUser: {
          include: {
            employeeDetails: true,
            permissions: true
          }
        },
        applicantDetails: true,
        sdgs: true,
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
              include: {
                employeeDetails: true
              }
            }
          },
          orderBy: { changedAt: 'desc' }
        },
        financeRecords: {
          include: {
            financeReviewer: {
              include: {
                employeeDetails: true
              }
            }
          }
        }
      }
    });

    // Create status history entry
    await prisma.iprStatusHistory.create({
      data: {
        iprApplicationId: id,
        fromStatus: 'changes_required',
        toStatus: 'resubmitted',
        changedById: userId,
        comments: 'Application resubmitted after making requested changes'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Application resubmitted successfully',
      data: updatedApplication
    });

  } catch (error) {
    console.error('Error resubmitting IPR application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resubmit IPR application',
      error: error.message
    });
  }
};

// Get IPR applications where user is a contributor (view-only access)
const getContributedIprApplications = async (req, res) => {
  try {
    const userId = req.user.id;
    const userUid = req.user.uid;

    // Find all applications where user is a contributor
    const contributions = await prisma.iprContributor.findMany({
      where: {
        OR: [
          { userId: userId },
          { uid: userUid }
        ]
      },
      include: {
        iprApplication: {
          include: {
            applicantUser: {
              select: {
                uid: true,
                employeeDetails: {
                  select: {
                    firstName: true,
                    lastName: true,
                  }
                }
              }
            },
            applicantDetails: true,
            contributors: true,
            sdgs: true,
            school: {
              select: {
                facultyName: true,
                facultyCode: true,
              }
            },
            department: {
              select: {
                departmentName: true,
                departmentCode: true,
              }
            },
            statusHistory: {
              orderBy: { changedAt: 'desc' },
              take: 5,
              include: {
                changedBy: {
                  select: {
                    uid: true,
                    employeeDetails: {
                      select: {
                        firstName: true,
                        lastName: true,
                      }
                    }
                  }
                }
              }
            },
            reviews: {
              orderBy: { createdAt: 'desc' },
              take: 3,
              select: {
                id: true,
                decision: true,
                comments: true,
                reviewerRole: true,
                reviewedAt: true,
                createdAt: true,
              }
            },
            editSuggestions: {
              where: {
                status: { in: ['pending', 'accepted', 'rejected'] }
              },
              orderBy: { createdAt: 'desc' },
              take: 10,
              select: {
                id: true,
                fieldName: true,
                originalValue: true,
                suggestedValue: true,
                status: true,
                createdAt: true,
              }
            }
          }
        }
      }
    });

    // Transform to return applications with contributor's role info
    const applications = contributions.map(contribution => ({
      ...contribution.iprApplication,
      contributorRole: contribution.role,
      contributorCanView: contribution.canView,
      contributorCanEdit: contribution.canEdit,
      isContributor: true,
      isApplicant: false,
    }));

    res.status(200).json({
      success: true,
      message: 'Contributed IPR applications retrieved successfully',
      data: applications,
      count: applications.length,
    });
  } catch (error) {
    console.error('Get contributed IPR applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contributed IPR applications',
      error: error.message,
    });
  }
};

// Get single IPR application for contributor (view-only)
const getContributedIprApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userUid = req.user.uid;

    // Check if user is a contributor to this application
    const contribution = await prisma.iprContributor.findFirst({
      where: {
        iprApplicationId: id,
        OR: [
          { userId: userId },
          { uid: userUid }
        ]
      }
    });

    if (!contribution) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to view this application',
      });
    }

    const application = await prisma.iprApplication.findUnique({
      where: { id },
      include: {
        applicantUser: {
          select: {
            uid: true,
            email: true,
            employeeDetails: {
              select: {
                firstName: true,
                lastName: true,
                designation: true,
              }
            }
          }
        },
        applicantDetails: true,
        contributors: true,
        sdgs: true,
        school: {
          select: {
            facultyName: true,
            facultyCode: true,
          }
        },
        department: {
          select: {
            departmentName: true,
            departmentCode: true,
          }
        },
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          include: {
            changedBy: {
              select: {
                uid: true,
                employeeDetails: {
                  select: {
                    firstName: true,
                    lastName: true,
                  }
                }
              }
            }
          }
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: {
            reviewer: {
              select: {
                uid: true,
                employeeDetails: {
                  select: {
                    firstName: true,
                    lastName: true,
                  }
                }
              }
            }
          }
        },
        editSuggestions: {
          orderBy: { createdAt: 'desc' },
          include: {
            reviewer: {
              select: {
                uid: true,
                employeeDetails: {
                  select: {
                    firstName: true,
                    lastName: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'IPR application not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...application,
        contributorRole: contribution.role,
        contributorCanView: contribution.canView,
        contributorCanEdit: contribution.canEdit,
        isContributor: true,
        isApplicant: false,
      }
    });
  } catch (error) {
    console.error('Get contributed IPR application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get IPR application',
      error: error.message,
    });
  }
};

module.exports = {
  createIprApplication,
  submitIprApplication,
  resubmitIprApplication,
  getAllIprApplications,
  getIprApplicationById,
  updateIprApplication,
  deleteIprApplication,
  getMyIprApplications,
  getIprStatistics,
  getContributedIprApplications,
  getContributedIprApplicationById,
};
