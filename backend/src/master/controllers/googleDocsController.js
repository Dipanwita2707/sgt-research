const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get document with all changes
const getDocument = async (req, res) => {
  try {
    const { iprApplicationId, fieldName } = req.params;
    const userId = req.user.id;

    // Get the original application data
    const application = await prisma.iprApplication.findUnique({
      where: { id: iprApplicationId },
      select: {
        id: true,
        title: true,
        description: true,
        remarks: true,
        iprType: true,
        projectType: true,
        filingType: true,
        userId: true
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'IPR application not found'
      });
    }

    // Get all changes for this field
    const changes = await prisma.documentChange.findMany({
      where: {
        iprApplicationId,
        fieldName
      },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Get current content (original + accepted changes)
    const originalContent = application[fieldName] || '';
    let currentContent = originalContent;

    // Apply accepted changes to get current content
    const acceptedChanges = changes.filter(c => c.status === 'accepted');
    for (const change of acceptedChanges) {
      if (change.type === 'replace') {
        currentContent = change.newText;
      }
    }

    const documentVersion = {
      id: `${iprApplicationId}-${fieldName}`,
      iprApplicationId,
      fieldName,
      originalContent,
      currentContent,
      version: acceptedChanges.length + 1,
      changes: changes.map(change => ({
        ...change,
        reviewerName: `${change.reviewer.firstName} ${change.reviewer.lastName}`
      })),
      lastModifiedBy: userId,
      lastModifiedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: documentVersion
    });

  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get document',
      error: error.message
    });
  }
};

// Submit a new change
const submitChange = async (req, res) => {
  try {
    const { 
      iprApplicationId, 
      fieldName, 
      originalText, 
      newText, 
      comment, 
      type, 
      position 
    } = req.body;
    const reviewerId = req.user.id;

    // Validate required fields
    if (!iprApplicationId || !fieldName || !newText) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if application exists
    const application = await prisma.iprApplication.findUnique({
      where: { id: iprApplicationId }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'IPR application not found'
      });
    }

    // Create the change record
    const change = await prisma.documentChange.create({
      data: {
        iprApplicationId,
        fieldName,
        type: type || 'replace',
        originalText: originalText || '',
        newText,
        position: position || 0,
        reviewerId,
        comment,
        status: 'pending'
      },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Update application status if not already in changes_required
    if (application.status !== 'changes_required') {
      await prisma.iprApplication.update({
        where: { id: iprApplicationId },
        data: { status: 'changes_required' }
      });

      // Create status history
      await prisma.iprStatusHistory.create({
        data: {
          iprApplicationId,
          fromStatus: application.status,
          toStatus: 'changes_required',
          changedById: reviewerId,
          comments: `Collaborative changes suggested for ${fieldName}`
        }
      });
    }

    res.json({
      success: true,
      data: {
        ...change,
        reviewerName: `${change.reviewer.firstName} ${change.reviewer.lastName}`
      },
      message: 'Change submitted successfully'
    });

  } catch (error) {
    console.error('Submit change error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit change',
      error: error.message
    });
  }
};

// Accept a change (by applicant)
const acceptChange = async (req, res) => {
  try {
    const { changeId } = req.params;
    const userId = req.user.id;

    // Find the change
    const change = await prisma.documentChange.findUnique({
      where: { id: changeId },
      include: {
        iprApplication: true
      }
    });

    if (!change) {
      return res.status(404).json({
        success: false,
        message: 'Change not found'
      });
    }

    // Check if user is the applicant
    if (change.iprApplication.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the applicant can accept/reject changes'
      });
    }

    // Update change status
    const updatedChange = await prisma.documentChange.update({
      where: { id: changeId },
      data: { 
        status: 'accepted',
        updatedAt: new Date()
      },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Apply the change to the actual application field
    const updateData = {};
    updateData[change.fieldName] = change.newText;
    
    await prisma.iprApplication.update({
      where: { id: change.iprApplicationId },
      data: updateData
    });

    // Check if all changes are resolved
    const pendingChanges = await prisma.documentChange.count({
      where: {
        iprApplicationId: change.iprApplicationId,
        status: 'pending'
      }
    });

    // If all changes are resolved, update status back to under_drd_review
    if (pendingChanges === 0) {
      await prisma.iprApplication.update({
        where: { id: change.iprApplicationId },
        data: { status: 'under_drd_review' }
      });

      await prisma.iprStatusHistory.create({
        data: {
          iprApplicationId: change.iprApplicationId,
          fromStatus: 'changes_required',
          toStatus: 'under_drd_review',
          changedById: userId,
          comments: 'All collaborative changes resolved - back to review'
        }
      });
    }

    res.json({
      success: true,
      data: {
        ...updatedChange,
        reviewerName: `${updatedChange.reviewer.firstName} ${updatedChange.reviewer.lastName}`
      },
      message: 'Change accepted successfully'
    });

  } catch (error) {
    console.error('Accept change error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept change',
      error: error.message
    });
  }
};

// Reject a change (by applicant)
const rejectChange = async (req, res) => {
  try {
    const { changeId } = req.params;
    const userId = req.user.id;

    // Find the change
    const change = await prisma.documentChange.findUnique({
      where: { id: changeId },
      include: {
        iprApplication: true
      }
    });

    if (!change) {
      return res.status(404).json({
        success: false,
        message: 'Change not found'
      });
    }

    // Check if user is the applicant
    if (change.iprApplication.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the applicant can accept/reject changes'
      });
    }

    // Update change status
    const updatedChange = await prisma.documentChange.update({
      where: { id: changeId },
      data: { 
        status: 'rejected',
        updatedAt: new Date()
      },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        ...updatedChange,
        reviewerName: `${updatedChange.reviewer.firstName} ${updatedChange.reviewer.lastName}`
      },
      message: 'Change rejected successfully'
    });

  } catch (error) {
    console.error('Reject change error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject change',
      error: error.message
    });
  }
};

// Get pending changes for an application
const getPendingChanges = async (req, res) => {
  try {
    const { iprApplicationId } = req.params;
    const userId = req.user.id;

    // Get the application
    const application = await prisma.iprApplication.findUnique({
      where: { id: iprApplicationId }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'IPR application not found'
      });
    }

    // Get pending changes
    const changes = await prisma.documentChange.findMany({
      where: {
        iprApplicationId,
        status: 'pending'
      },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedChanges = changes.map(change => ({
      ...change,
      reviewerName: `${change.reviewer.firstName} ${change.reviewer.lastName}`
    }));

    res.json({
      success: true,
      data: formattedChanges
    });

  } catch (error) {
    console.error('Get pending changes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending changes',
      error: error.message
    });
  }
};

// Auto-save draft (for real-time collaboration)
const saveDraft = async (req, res) => {
  try {
    const { iprApplicationId, fieldName, content } = req.body;
    const userId = req.user.id;

    // This could be implemented with Redis for real-time drafts
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Draft saved successfully'
    });

  } catch (error) {
    console.error('Save draft error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save draft',
      error: error.message
    });
  }
};

// Get document status
const getDocumentStatus = async (req, res) => {
  try {
    const { iprApplicationId } = req.params;

    // For now, return basic status
    res.json({
      success: true,
      data: {
        isBeingEdited: false,
        lastActivity: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get document status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get document status',
      error: error.message
    });
  }
};

module.exports = {
  getDocument,
  submitChange,
  acceptChange,
  rejectChange,
  getPendingChanges,
  saveDraft,
  getDocumentStatus
};