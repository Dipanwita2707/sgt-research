const prisma = require('../../config/database');

// Get student dashboard data
exports.getStudentDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get student details with program information
    const user = await prisma.userLogin.findUnique({
      where: { id: userId },
      include: {
        studentLogin: {
          include: {
            section: {
              include: {
                program: {
                  include: {
                    department: {
                      include: {
                        faculty: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user || !user.studentLogin) {
      return res.status(404).json({
        success: false,
        message: 'Student data not found'
      });
    }

    const student = user.studentLogin;

    // Prepare student dashboard data
    const dashboardData = {
      cgpa: parseFloat(student.cgpa) || 0,
      attendance: parseFloat(student.attendancePercentage) || 0,
      semester: student.currentSemester || 0,
      program: student.section?.program?.programName || 'N/A',
      enrolledCourses: 0, // Will be populated when course module is implemented
      completedCredits: 0, // Will be populated when course module is implemented
      pendingAssignments: 0, // Will be populated when assignment module is implemented
      upcomingExams: 0 // Will be populated when exam module is implemented
    };

    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching student dashboard data'
    });
  }
};

// Get staff dashboard data
exports.getStaffDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get employee details with department information
    // Note: Using select to avoid assignedSchoolIds column that may not exist yet
    const user = await prisma.userLogin.findUnique({
      where: { id: userId },
      include: {
        employeeDetails: {
          include: {
            primaryDepartment: {
              include: {
                faculty: true
              }
            },
            primaryCentralDept: true
          }
        },
        schoolDeptPermissions: {
          where: { isActive: true },
          select: {
            id: true,
            departmentId: true,
            permissions: true,
            isPrimary: true,
            isActive: true,
            department: {
              include: {
                faculty: true
              }
            }
          }
        },
        centralDeptPermissions: {
          where: { isActive: true },
          select: {
            id: true,
            centralDeptId: true,
            permissions: true,
            isPrimary: true,
            isActive: true,
            centralDept: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prepare staff dashboard data
    const dashboardData = {
      department: user.employeeDetails?.primaryDepartment?.departmentName || user.employeeDetails?.primaryCentralDept?.departmentName || 'N/A',
      designation: user.employeeDetails?.designation || 'N/A',
      faculty: user.employeeDetails?.primaryDepartment?.faculty?.facultyName || 'Central Department',
      permissions: [],
      activeStudents: 0, // Will be populated when student management module is implemented
      coursesAssigned: 0, // Will be populated when course module is implemented
      pendingApprovals: 0, // Will be populated when approval workflows are implemented
      departmentStrength: 0 // Will be populated when HR module is implemented
    };

    // Format permissions by category
    const permissionsByCategory = {};
    
    // Process school department permissions
    if (user.schoolDeptPermissions && user.schoolDeptPermissions.length > 0) {
      user.schoolDeptPermissions.forEach(dp => {
        if (dp.isActive && dp.permissions) {
          const category = dp.department?.departmentName || 'Department';
          if (!permissionsByCategory[category]) {
            permissionsByCategory[category] = [];
          }
          // Parse permissions JSON if it's a string
          const perms = typeof dp.permissions === 'string' 
            ? JSON.parse(dp.permissions) 
            : dp.permissions;
          
          if (Array.isArray(perms)) {
            permissionsByCategory[category].push(...perms);
          } else if (typeof perms === 'object' && perms !== null) {
            // Handle object format permissions
            Object.keys(perms).forEach(key => {
              if (perms[key] === true) {
                permissionsByCategory[category].push(key);
              }
            });
          }
        }
      });
    }
    
    // Process central department permissions
    if (user.centralDeptPermissions && user.centralDeptPermissions.length > 0) {
      user.centralDeptPermissions.forEach(cp => {
        if (cp.isActive && cp.permissions) {
          const category = cp.centralDept?.departmentName || 'Central Department';
          if (!permissionsByCategory[category]) {
            permissionsByCategory[category] = [];
          }
          // Parse permissions JSON if it's a string
          const perms = typeof cp.permissions === 'string' 
            ? JSON.parse(cp.permissions) 
            : cp.permissions;
          
          if (Array.isArray(perms)) {
            permissionsByCategory[category].push(...perms);
          } else if (typeof perms === 'object' && perms !== null) {
            // Handle object format permissions
            Object.keys(perms).forEach(key => {
              if (perms[key] === true) {
                permissionsByCategory[category].push(key);
              }
            });
          }
        }
      });
    }

    dashboardData.permissions = Object.entries(permissionsByCategory).map(([category, perms]) => ({
      category,
      permissions: perms
    }));

    // Get department strength if employee
    if (user.employeeDetails?.primaryDepartmentId) {
      const deptCount = await prisma.employeeDetails.count({
        where: {
          primaryDepartmentId: user.employeeDetails.primaryDepartmentId,
          isActive: true
        }
      });
      dashboardData.departmentStrength = deptCount;
    }

    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Staff dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching staff dashboard data'
    });
  }
};
