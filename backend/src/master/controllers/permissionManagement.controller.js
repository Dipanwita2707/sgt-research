const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const {
  getSchoolDeptPermissions,
  getCentralDeptPermissions,
  getAllCentralDeptPermissions,
} = require('../config/permissionDefinitions');

/**
 * Get available permission definitions
 */
exports.getPermissionDefinitions = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        schoolDepartments: getSchoolDeptPermissions(),
        centralDepartments: getAllCentralDeptPermissions(),
      },
    });
  } catch (error) {
    console.error('Get permission definitions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch permission definitions',
    });
  }
};

/**
 * Get all permissions for a user (both school departments and central departments)
 */
exports.getUserAllPermissions = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check authorization
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these permissions',
      });
    }

    const [schoolDeptPerms, centralDeptPerms, employee] = await Promise.all([
      // School department permissions
      prisma.departmentPermission.findMany({
        where: { userId, isActive: true },
        include: {
          department: {
            select: {
              id: true,
              departmentCode: true,
              departmentName: true,
              shortName: true,
              faculty: {
                select: {
                  facultyCode: true,
                  facultyName: true,
                },
              },
            },
          },
          assignedByUser: {
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
      }),
      // Central department permissions
      prisma.centralDepartmentPermission.findMany({
        where: { userId, isActive: true },
        include: {
          centralDept: {
            select: {
              id: true,
              departmentCode: true,
              departmentName: true,
              shortName: true,
              departmentType: true,
            },
          },
          assignedByUser: {
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
      }),
      // Employee details for primary department
      prisma.employeeDetails.findFirst({
        where: { userLoginId: userId },
        select: {
          primaryDepartmentId: true,
          primaryCentralDeptId: true,
          primaryDepartment: {
            select: {
              departmentCode: true,
              departmentName: true,
            },
          },
          primaryCentralDept: {
            select: {
              departmentCode: true,
              departmentName: true,
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        schoolDepartments: schoolDeptPerms,
        centralDepartments: centralDeptPerms,
        primaryDepartment: employee?.primaryDepartment || null,
        primaryCentralDepartment: employee?.primaryCentralDept || null,
      },
    });
  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch permissions',
    });
  }
};

/**
 * Grant school department permissions to a user
 */
exports.grantSchoolDeptPermissions = async (req, res) => {
  try {
    const { userId, departmentId, permissions, isPrimary } = req.body;

    if (!userId || !departmentId || !permissions) {
      return res.status(400).json({
        success: false,
        message: 'Please provide userId, departmentId, and permissions',
      });
    }

    // Only admin can grant permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to grant permissions',
      });
    }

    // If setting as primary, unset other primary flags for this user
    if (isPrimary) {
      await prisma.departmentPermission.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });

      // Also update employee's primary department
      await prisma.employeeDetails.updateMany({
        where: { userLoginId: userId },
        data: {
          primaryDepartmentId: departmentId,
          primaryCentralDeptId: null,
        },
      });
    }

    const permission = await prisma.departmentPermission.upsert({
      where: {
        userId_departmentId: {
          userId,
          departmentId,
        },
      },
      update: {
        permissions,
        isPrimary: isPrimary || false,
        isActive: true,
        assignedBy: req.user.id,
        assignedAt: new Date(),
      },
      create: {
        userId,
        departmentId,
        permissions,
        isPrimary: isPrimary || false,
        isActive: true,
        assignedBy: req.user.id,
      },
      include: {
        department: {
          select: {
            departmentCode: true,
            departmentName: true,
          },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'GRANT_SCHOOL_DEPT_PERMISSIONS',
        targetTable: 'department_permission',
        targetId: permission.id,
        details: { userId, departmentId, permissions, isPrimary },
      },
    });

    res.json({
      success: true,
      message: 'School department permissions granted successfully',
      data: permission,
    });
  } catch (error) {
    console.error('Grant school dept permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to grant permissions',
    });
  }
};

/**
 * Grant central department permissions to a user
 */
exports.grantCentralDeptPermissions = async (req, res) => {
  try {
    const { userId, centralDeptId, permissions, isPrimary } = req.body;

    if (!userId || !centralDeptId || !permissions) {
      return res.status(400).json({
        success: false,
        message: 'Please provide userId, centralDeptId, and permissions',
      });
    }

    // Only admin can grant permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to grant permissions',
      });
    }

    // If setting as primary, unset other primary flags for this user
    if (isPrimary) {
      await prisma.centralDepartmentPermission.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });

      // Also update employee's primary central department
      await prisma.employeeDetails.updateMany({
        where: { userLoginId: userId },
        data: {
          primaryCentralDeptId: centralDeptId,
          primaryDepartmentId: null,
        },
      });
    }

    const permission = await prisma.centralDepartmentPermission.upsert({
      where: {
        userId_centralDeptId: {
          userId,
          centralDeptId,
        },
      },
      update: {
        permissions,
        isPrimary: isPrimary || false,
        isActive: true,
        assignedBy: req.user.id,
        assignedAt: new Date(),
      },
      create: {
        userId,
        centralDeptId,
        permissions,
        isPrimary: isPrimary || false,
        isActive: true,
        assignedBy: req.user.id,
      },
      include: {
        centralDept: {
          select: {
            departmentCode: true,
            departmentName: true,
          },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'GRANT_CENTRAL_DEPT_PERMISSIONS',
        targetTable: 'central_department_permission',
        targetId: permission.id,
        details: { userId, centralDeptId, permissions, isPrimary },
      },
    });

    res.json({
      success: true,
      message: 'Central department permissions granted successfully',
      data: permission,
    });
  } catch (error) {
    console.error('Grant central dept permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to grant permissions',
    });
  }
};

/**
 * Revoke school department permissions
 */
exports.revokeSchoolDeptPermissions = async (req, res) => {
  try {
    const { userId, departmentId } = req.body;

    if (!userId || !departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide userId and departmentId',
      });
    }

    // Only admin can revoke permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to revoke permissions',
      });
    }

    await prisma.departmentPermission.update({
      where: {
        userId_departmentId: {
          userId,
          departmentId,
        },
      },
      data: {
        isActive: false,
        isPrimary: false,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'REVOKE_SCHOOL_DEPT_PERMISSIONS',
        targetTable: 'department_permission',
        details: { userId, departmentId },
      },
    });

    res.json({
      success: true,
      message: 'School department permissions revoked successfully',
    });
  } catch (error) {
    console.error('Revoke school dept permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke permissions',
    });
  }
};

/**
 * Revoke central department permissions
 */
exports.revokeCentralDeptPermissions = async (req, res) => {
  try {
    const { userId, centralDeptId } = req.body;

    if (!userId || !centralDeptId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide userId and centralDeptId',
      });
    }

    // Only admin can revoke permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to revoke permissions',
      });
    }

    await prisma.centralDepartmentPermission.update({
      where: {
        userId_centralDeptId: {
          userId,
          centralDeptId,
        },
      },
      data: {
        isActive: false,
        isPrimary: false,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'REVOKE_CENTRAL_DEPT_PERMISSIONS',
        targetTable: 'central_department_permission',
        details: { userId, centralDeptId },
      },
    });

    res.json({
      success: true,
      message: 'Central department permissions revoked successfully',
    });
  } catch (error) {
    console.error('Revoke central dept permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke permissions',
    });
  }
};

/**
 * Check if user has a specific permission in any department
 */
exports.checkUserPermission = async (req, res) => {
  try {
    const { departmentId, centralDeptId, permissionKey } = req.query;

    if ((!departmentId && !centralDeptId) || !permissionKey) {
      return res.status(400).json({
        success: false,
        message: 'Please provide (departmentId or centralDeptId) and permissionKey',
      });
    }

    let hasPermission = false;

    if (departmentId) {
      const permission = await prisma.departmentPermission.findUnique({
        where: {
          userId_departmentId: {
            userId: req.user.id,
            departmentId,
          },
        },
      });

      hasPermission =
        permission &&
        permission.isActive &&
        permission.permissions &&
        permission.permissions[permissionKey] === true;
    } else if (centralDeptId) {
      const permission = await prisma.centralDepartmentPermission.findUnique({
        where: {
          userId_centralDeptId: {
            userId: req.user.id,
            centralDeptId,
          },
        },
      });

      hasPermission =
        permission &&
        permission.isActive &&
        permission.permissions &&
        permission.permissions[permissionKey] === true;
    }

    res.json({
      success: true,
      hasPermission,
    });
  } catch (error) {
    console.error('Check permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check permission',
    });
  }
};

/**
 * Get all users with their permissions (for admin panel)
 */
exports.getAllUsersWithPermissions = async (req, res) => {
  try {
    // Only admin can view all users
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const users = await prisma.userLogin.findMany({
      where: {
        role: {
          in: ['faculty', 'staff'],
        },
      },
      select: {
        id: true,
        uid: true,
        email: true,
        role: true,
        employeeDetails: {
          select: {
            firstName: true,
            lastName: true,
            displayName: true,
            empId: true,
            designation: true,
            primaryDepartment: {
              select: {
                departmentCode: true,
                departmentName: true,
              },
            },
            primaryCentralDept: {
              select: {
                departmentCode: true,
                departmentName: true,
              },
            },
          },
        },
        schoolDeptPermissions: {
          where: { isActive: true },
          select: {
            id: true,
            departmentId: true,
            isPrimary: true,
            permissions: true,
            department: {
              select: {
                departmentCode: true,
                departmentName: true,
              },
            },
          },
        },
        centralDeptPermissions: {
          where: { isActive: true },
          select: {
            id: true,
            centralDeptId: true,
            isPrimary: true,
            permissions: true,
            centralDept: {
              select: {
                departmentCode: true,
                departmentName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });


    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Get all users with permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
    });
  }
};

/**
 * Assign schools to a DRD member
 * @body { userId, schoolIds: string[] }
 * Accessible by: admin OR DRD Head (users with ipr_approve permission)
 */
exports.assignDrdMemberSchools = async (req, res) => {
  try {
    const { userId, schoolIds } = req.body;

    // Check if user is authorized (admin, DRD Head, or has ipr_assign_school permission)
    const isAdmin = req.user.role === 'admin';
    const canAssignSchools = req.user.centralDeptPermissions?.some(
      (p) => p.permissions?.ipr_approve === true || 
             p.permissions?.drd_ipr_approve === true ||
             p.permissions?.ipr_assign_school === true
    );

    if (!isAdmin && !canAssignSchools) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to assign schools to DRD members',
      });
    }

    if (!userId || !Array.isArray(schoolIds)) {
      return res.status(400).json({
        success: false,
        message: 'userId and schoolIds array are required',
      });
    }

    // Find the DRD department (search by code, name, or shortName)
    const drdDept = await prisma.centralDepartment.findFirst({
      where: {
        OR: [
          { departmentCode: 'DRD' },
          { departmentCode: { contains: 'DRD', mode: 'insensitive' } },
          { departmentName: { contains: 'DRD', mode: 'insensitive' } },
          { shortName: 'DRD' },
          { departmentName: { contains: 'Development', mode: 'insensitive' } },
          { departmentName: { contains: 'Research', mode: 'insensitive' } },
        ],
      },
    });

    if (!drdDept) {
      return res.status(404).json({
        success: false,
        message: 'DRD department not found. Please create a Central Department with code or name containing "DRD".',
      });
    }

    // Find or create the user's DRD permission record
    let drdPermission = await prisma.centralDepartmentPermission.findFirst({
      where: {
        userId,
        centralDeptId: drdDept.id,
      },
    });

    if (drdPermission) {
      // Update existing permission with school assignments
      drdPermission = await prisma.centralDepartmentPermission.update({
        where: { id: drdPermission.id },
        data: {
          assignedSchoolIds: schoolIds,
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              uid: true,
              email: true,
              employeeDetails: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
      });
    } else {
      // Create new permission record with school assignments
      drdPermission = await prisma.centralDepartmentPermission.create({
        data: {
          userId,
          centralDeptId: drdDept.id,
          permissions: { ipr_review: true },
          assignedSchoolIds: schoolIds,
          isPrimary: false,
          isActive: true,
          assignedBy: req.user.id,
        },
        include: {
          user: {
            select: {
              uid: true,
              email: true,
              employeeDetails: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'ASSIGN_DRD_MEMBER_SCHOOLS',
        targetTable: 'central_department_permission',
        targetId: drdPermission.id,
        details: { userId, schoolIds },
      },
    });

    res.json({
      success: true,
      message: 'Schools assigned to DRD member successfully',
      data: drdPermission,
    });
  } catch (error) {
    console.error('Assign DRD member schools error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign schools',
      error: error.message,
    });
  }
};

/**
 * Get all DRD members with their assigned schools
 * Accessible by: admin OR DRD Head (users with ipr_approve permission)
 */
exports.getDrdMembersWithSchools = async (req, res) => {
  try {
    // Check if user is authorized (admin, DRD Head, or has ipr_assign_school permission)
    const isAdmin = req.user.role === 'admin';
    const canAssignSchools = req.user.centralDeptPermissions?.some(
      (p) => p.permissions?.ipr_approve === true || 
             p.permissions?.drd_ipr_approve === true ||
             p.permissions?.ipr_assign_school === true
    );

    if (!isAdmin && !canAssignSchools) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view DRD member school assignments',
      });
    }

    // Find the DRD department (search by code, name, or shortName)
    const drdDept = await prisma.centralDepartment.findFirst({
      where: {
        OR: [
          { departmentCode: 'DRD' },
          { departmentCode: { contains: 'DRD', mode: 'insensitive' } },
          { departmentName: { contains: 'DRD', mode: 'insensitive' } },
          { shortName: 'DRD' },
          { departmentName: { contains: 'Development', mode: 'insensitive' } },
          { departmentName: { contains: 'Research', mode: 'insensitive' } },
        ],
      },
    });

    if (!drdDept) {
      // Return empty list instead of 404 for better UX
      return res.json({
        success: true,
        data: {
          members: [],
          allSchools: [],
        },
        message: 'DRD department not found. Please create a Central Department with code or name containing "DRD".',
      });
    }

    // Get all users with DRD permissions
    const drdMembers = await prisma.centralDepartmentPermission.findMany({
      where: {
        centralDeptId: drdDept.id,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            uid: true,
            email: true,
            role: true,
            employeeDetails: {
              select: {
                firstName: true,
                lastName: true,
                displayName: true,
                designation: true,
                primaryDepartment: {
                  select: {
                    departmentName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Get all schools for reference
    const schools = await prisma.facultySchoolList.findMany({
      where: { isActive: true },
      select: {
        id: true,
        facultyCode: true,
        facultyName: true,
        shortName: true,
      },
      orderBy: { facultyName: 'asc' },
    });

    // Map DRD members with their assigned school names
    const membersWithSchools = drdMembers.map((member) => {
      const assignedSchoolIds = member.assignedSchoolIds || [];
      const assignedSchools = schools.filter((s) => assignedSchoolIds.includes(s.id));
      const permissions = member.permissions || {};

      return {
        id: member.id,
        userId: member.userId,
        user: member.user,
        permissions,
        isDrdHead: permissions.ipr_approve === true,
        isDrdMember: permissions.ipr_review === true,
        assignedSchoolIds,
        assignedSchools,
        assignedAt: member.assignedAt,
      };
    });

    res.json({
      success: true,
      data: {
        members: membersWithSchools,
        allSchools: schools,
      },
    });
  } catch (error) {
    console.error('Get DRD members with schools error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch DRD members',
      error: error.message,
    });
  }
};

/**
 * Get assigned schools for the currently logged-in DRD member
 */
exports.getMyAssignedSchools = async (req, res) => {
  try {
    // Find the DRD department (search by code, name, or shortName)
    const drdDept = await prisma.centralDepartment.findFirst({
      where: {
        OR: [
          { departmentCode: 'DRD' },
          { departmentCode: { contains: 'DRD', mode: 'insensitive' } },
          { departmentName: { contains: 'DRD', mode: 'insensitive' } },
          { shortName: 'DRD' },
          { departmentName: { contains: 'Development', mode: 'insensitive' } },
          { departmentName: { contains: 'Research', mode: 'insensitive' } },
        ],
      },
    });

    if (!drdDept) {
      return res.json({
        success: true,
        data: [],
        message: 'DRD department not found',
      });
    }

    // Get the user's DRD permission
    const drdPermission = await prisma.centralDepartmentPermission.findFirst({
      where: {
        userId: req.user.id,
        centralDeptId: drdDept.id,
        isActive: true,
      },
    });

    if (!drdPermission) {
      return res.json({
        success: true,
        data: [],
        message: 'User is not a DRD member',
      });
    }

    const assignedSchoolIds = drdPermission.assignedSchoolIds || [];

    // Get the school details for assigned schools
    const assignedSchools = await prisma.facultySchoolList.findMany({
      where: {
        id: { in: assignedSchoolIds },
        isActive: true,
      },
      select: {
        id: true,
        facultyCode: true,
        facultyName: true,
        shortName: true,
      },
      orderBy: { facultyName: 'asc' },
    });

    res.json({
      success: true,
      data: assignedSchools,
      permissions: drdPermission.permissions,
    });
  } catch (error) {
    console.error('Get my assigned schools error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned schools',
      error: error.message,
    });
  }
};

/**
 * Get schools with their assigned DRD members
 * Accessible by: admin OR users with ipr_assign_school or ipr_approve permission
 */
exports.getSchoolsWithAssignedMembers = async (req, res) => {
  try {
    // Check if user is authorized (admin, DRD Head, or has ipr_assign_school permission)
    const isAdmin = req.user.role === 'admin';
    const canAssignSchools = req.user.centralDeptPermissions?.some(
      (p) => p.permissions?.ipr_approve === true || 
             p.permissions?.drd_ipr_approve === true ||
             p.permissions?.ipr_assign_school === true
    );

    if (!isAdmin && !canAssignSchools) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view school member assignments',
      });
    }

    // Get all active schools
    const schools = await prisma.facultySchoolList.findMany({
      where: { isActive: true },
      select: {
        id: true,
        facultyCode: true,
        facultyName: true,
        shortName: true,
      },
      orderBy: { facultyName: 'asc' },
    });

    // Find the DRD department (search by code, name, or shortName)
    const drdDept = await prisma.centralDepartment.findFirst({
      where: {
        OR: [
          { departmentCode: 'DRD' },
          { departmentCode: { contains: 'DRD', mode: 'insensitive' } },
          { departmentName: { contains: 'DRD', mode: 'insensitive' } },
          { shortName: 'DRD' },
          { departmentName: { contains: 'Development', mode: 'insensitive' } },
          { departmentName: { contains: 'Research', mode: 'insensitive' } },
        ],
      },
    });

    if (!drdDept) {
      // Return schools without members
      return res.json({
        success: true,
        data: schools.map((school) => ({
          ...school,
          assignedMembers: [],
        })),
      });
    }

    // Get all DRD members
    const drdMembers = await prisma.centralDepartmentPermission.findMany({
      where: {
        centralDeptId: drdDept.id,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            uid: true,
            employeeDetails: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    // Map schools with their assigned members
    const schoolsWithMembers = schools.map((school) => {
      const assignedMembers = drdMembers
        .filter((member) => {
          const assignedSchoolIds = member.assignedSchoolIds || [];
          return assignedSchoolIds.includes(school.id);
        })
        .map((member) => ({
          userId: member.userId,
          uid: member.user.uid,
          displayName: member.user.employeeDetails?.displayName || member.user.uid,
          permissions: member.permissions,
        }));

      return {
        ...school,
        assignedMembers,
        hasAssignedMember: assignedMembers.length > 0,
      };
    });

    res.json({
      success: true,
      data: schoolsWithMembers,
    });
  } catch (error) {
    console.error('Get schools with DRD members error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schools with members',
      error: error.message,
    });
  }
};

