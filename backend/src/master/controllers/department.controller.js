const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all departments
 */
exports.getAllDepartments = async (req, res) => {
  try {
    const { isActive, schoolId } = req.query;
    
    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    if (schoolId) {
      where.facultyId = schoolId;
    }

    const departments = await prisma.department.findMany({
      where,
      include: {
        faculty: {
          select: {
            id: true,
            facultyCode: true,
            facultyName: true,
          },
        },
        headOfDepartment: {
          select: {
            id: true,
            uid: true,
            employeeDetails: {
              select: {
                firstName: true,
                lastName: true,
                displayName: true,
                empId: true,
                designation: true,
              },
            },
          },
        },
        _count: {
          select: {
            primaryEmployees: true,
            programs: true,
          },
        },
      },
      orderBy: [
        { faculty: { facultyName: 'asc' } },
        { departmentName: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments',
    });
  }
};

/**
 * Get departments by school ID
 */
exports.getDepartmentsBySchool = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const departments = await prisma.department.findMany({
      where: { 
        facultyId: schoolId,
        isActive: true,
      },
      include: {
        headOfDepartment: {
          select: {
            id: true,
            uid: true,
            employeeDetails: {
              select: {
                firstName: true,
                lastName: true,
                displayName: true,
              },
            },
          },
        },
        _count: {
          select: {
            primaryEmployees: true,
            programs: true,
          },
        },
      },
      orderBy: { departmentName: 'asc' },
    });

    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error('Get departments by school error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments',
    });
  }
};

/**
 * Get department by ID
 */
exports.getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        faculty: {
          select: {
            id: true,
            facultyCode: true,
            facultyName: true,
          },
        },
        headOfDepartment: {
          select: {
            id: true,
            uid: true,
            employeeDetails: {
              select: {
                firstName: true,
                lastName: true,
                displayName: true,
                empId: true,
                designation: true,
              },
            },
          },
        },
        programs: {
          select: {
            id: true,
            programCode: true,
            programName: true,
            programType: true,
            shortName: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            primaryEmployees: true,
            programs: true,
          },
        },
      },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    res.json({
      success: true,
      data: department,
    });
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department',
    });
  }
};

/**
 * Create new department
 */
exports.createDepartment = async (req, res) => {
  try {
    const {
      facultyId,
      departmentCode,
      departmentName,
      shortName,
      description,
      establishedYear,
      headOfDepartmentId,
      contactEmail,
      contactPhone,
      officeLocation,
      budgetAllocation,
      metadata,
    } = req.body;

    // Check if school exists
    const school = await prisma.facultySchoolList.findUnique({
      where: { id: facultyId },
    });

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    // Check if department code already exists
    const existing = await prisma.department.findUnique({
      where: { departmentCode },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Department with this code already exists',
      });
    }

    const department = await prisma.department.create({
      data: {
        facultyId,
        departmentCode,
        departmentName,
        shortName,
        description,
        establishedYear,
        headOfDepartmentId,
        contactEmail,
        contactPhone,
        officeLocation,
        budgetAllocation,
        metadata: metadata || {},
        isActive: true,
      },
      include: {
        faculty: {
          select: {
            id: true,
            facultyCode: true,
            facultyName: true,
          },
        },
        headOfDepartment: {
          select: {
            id: true,
            uid: true,
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
    });

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: department,
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create department',
    });
  }
};

/**
 * Update department
 */
exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      facultyId,
      departmentCode,
      departmentName,
      shortName,
      description,
      establishedYear,
      headOfDepartmentId,
      contactEmail,
      contactPhone,
      officeLocation,
      budgetAllocation,
      metadata,
    } = req.body;

    // Check if department exists
    const existing = await prisma.department.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    // Check if department code is being changed and already exists
    if (departmentCode && departmentCode !== existing.departmentCode) {
      const codeExists = await prisma.department.findUnique({
        where: { departmentCode },
      });

      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: 'Department with this code already exists',
        });
      }
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        facultyId,
        departmentCode,
        departmentName,
        shortName,
        description,
        establishedYear,
        headOfDepartmentId,
        contactEmail,
        contactPhone,
        officeLocation,
        budgetAllocation,
        metadata: metadata || existing.metadata,
      },
      include: {
        faculty: {
          select: {
            id: true,
            facultyCode: true,
            facultyName: true,
          },
        },
        headOfDepartment: {
          select: {
            id: true,
            uid: true,
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
    });

    res.json({
      success: true,
      message: 'Department updated successfully',
      data: department,
    });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update department',
    });
  }
};

/**
 * Delete department
 */
exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if department has programmes or employees
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            primaryEmployees: true,
            programs: true,
          },
        },
      },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    if (department._count.primaryEmployees > 0 || department._count.programs > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete department with existing employees or programmes. Remove them first.',
      });
    }

    await prisma.department.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Department deleted successfully',
    });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete department',
    });
  }
};

/**
 * Toggle department active status
 */
exports.toggleDepartmentStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        isActive: !department.isActive,
      },
    });

    res.json({
      success: true,
      message: `Department ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updated,
    });
  } catch (error) {
    console.error('Toggle department status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle department status',
    });
  }
};
