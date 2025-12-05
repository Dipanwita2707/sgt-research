const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');

// Create new employee (Faculty/Staff)
const createEmployee = async (req, res) => {
  try {
    const {
      // Login details
      uid,
      email,
      password,
      role, // 'faculty' or 'staff'
      
      // Employee details
      empId,
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      gender,
      mobileNumber,
      alternateNumber,
      personalEmail,
      
      // Professional details
      designation,
      employeeCategory, // 'teaching' or 'non_teaching'
      employeeType, // 'permanent', 'temporary', 'contract', etc.
      dateOfJoining,
      schoolId,
      departmentId,
      
      // Address
      currentAddress,
      permanentAddress,
      
      // Other
      isActive = true,
    } = req.body;

    // Validate required fields
    if (!uid || !email || !password || !firstName || !lastName || !empId) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: uid, email, password, firstName, lastName, empId',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.userLogin.findFirst({
      where: {
        OR: [{ uid }, { email }],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this UID or email already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with employee details in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user login
      const user = await tx.userLogin.create({
        data: {
          uid,
          email,
          passwordHash: hashedPassword,
          role: role || 'faculty',
          status: isActive ? 'active' : 'inactive',
        },
      });

      // Create employee details
      const employee = await tx.employeeDetails.create({
        data: {
          userLoginId: user.id,
          empId,
          firstName,
          lastName: middleName ? `${middleName} ${lastName}` : lastName,
          displayName: middleName 
            ? `${firstName} ${middleName} ${lastName}` 
            : `${firstName} ${lastName}`,
          designation,
          joinDate: dateOfJoining ? new Date(dateOfJoining) : new Date(),
          primaryDepartmentId: departmentId || null, // Ensure empty string becomes null
          // Set central department ID if provided, otherwise null
          primaryCentralDeptId: req.body.primaryCentralDeptId || null,
          isActive,
          metadata: {
            gender,
            mobileNumber,
            alternateNumber,
            personalEmail: personalEmail || email,
            employeeCategory,
            employeeType,
            dateOfBirth,
            currentAddress,
            permanentAddress,
          },
        },
      });

      // Assign default permissions based on department and role
      if (departmentId && (role === 'faculty' || role === 'staff')) {
        // Default permissions for faculty and staff in academic departments
        const defaultPermissions = {
          view_dashboard: true,
          view_reports: true,
          view_students: role === 'faculty', // Faculty can view students
          file_ipr: true, // All faculty/staff can file IPR
          view_own_ipr: true,
          edit_own_ipr: true,
        };

        await tx.departmentPermission.create({
          data: {
            userId: user.id,
            departmentId: departmentId,
            permissions: defaultPermissions,
            isPrimary: true,
            isActive: true,
            assignedBy: null, // System assigned
          },
        });
      }

      // TODO: Assign default permissions for central department employees
      // Note: CentralDepartmentPermission model needs to be created in schema first
      if (req.body.primaryCentralDeptId && (role === 'staff' || role === 'admin')) {
        console.log(`Employee assigned to central department: ${req.body.primaryCentralDeptId}`);
        // Permission assignment will be implemented once the permission models are created
      }

      return { user, employee };
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: {
        userId: result.user.id,
        uid: result.user.uid,
        email: result.user.email,
        employeeId: result.employee.id,
        empId: result.employee.empId,
        displayName: result.employee.displayName,
      },
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create employee',
      error: error.message,
    });
  }
};

// Get all employees with filters
const getAllEmployees = async (req, res) => {
  try {
    const { role, schoolId, departmentId, employeeCategory, search, page = 1, limit = 50 } = req.query;

    const where = {
      role: {
        in: ['faculty', 'staff'],
      },
    };

    if (role && role !== 'all') {
      where.role = role;
    }

    const employeeWhere = {};
    if (schoolId) employeeWhere.schoolId = schoolId;
    if (departmentId) employeeWhere.departmentId = departmentId;
    if (employeeCategory) employeeWhere.employeeCategory = employeeCategory;

    if (search) {
      where.OR = [
        { uid: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
      employeeWhere.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { empId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [employees, total] = await Promise.all([
      prisma.userLogin.findMany({
        where: {
          ...where,
          employeeDetails: {
            is: employeeWhere,
          },
        },
        include: {
          employeeDetails: {
            include: {
              primaryDepartment: {
                select: {
                  departmentName: true,
                  faculty: {
                    select: {
                      facultyName: true,
                    },
                  },
                },
              },
              primaryCentralDept: {
                select: {
                  departmentName: true,
                },
              },
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.userLogin.count({
        where: {
          ...where,
          employeeDetails: {
            is: employeeWhere,
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: employees,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get all employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees',
      error: error.message,
    });
  }
};

// Get employee by ID
const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await prisma.userLogin.findUnique({
      where: { id },
      include: {
        employeeDetails: {
          include: {
            primaryDepartment: {
              include: {
                faculty: true,
              },
            },
            primaryCentralDept: true,
          },
        },
      },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error('Get employee by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee',
      error: error.message,
    });
  }
};

// Update employee
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Separate login updates from employee details updates
    const loginUpdates = {};
    const employeeUpdates = {};

    // Login fields
    if (updates.email) loginUpdates.email = updates.email;
    if (updates.isActive !== undefined) {
      loginUpdates.status = updates.isActive ? 'active' : 'inactive';
    }
    if (updates.password) {
      loginUpdates.passwordHash = await bcrypt.hash(updates.password, 12);
    }

    // Employee detail fields (only fields that exist in schema)
    if (updates.firstName) employeeUpdates.firstName = updates.firstName;
    if (updates.lastName) employeeUpdates.lastName = updates.lastName;
    if (updates.designation) employeeUpdates.designation = updates.designation;
    if (updates.dateOfJoining) employeeUpdates.joinDate = new Date(updates.dateOfJoining);
    if (updates.departmentId) employeeUpdates.primaryDepartmentId = updates.departmentId || null;
    if (updates.primaryCentralDeptId) employeeUpdates.primaryCentralDeptId = updates.primaryCentralDeptId || null;
    if (updates.isActive !== undefined) employeeUpdates.isActive = updates.isActive;
    
    // Store extra fields in metadata
    const employee = await prisma.employeeDetails.findFirst({
      where: { userLoginId: id },
    });
    
    if (employee) {
      const metadata = employee.metadata || {};
      if (updates.gender) metadata.gender = updates.gender;
      if (updates.mobileNumber) metadata.mobileNumber = updates.mobileNumber;
      if (updates.employeeCategory) metadata.employeeCategory = updates.employeeCategory;
      if (updates.employeeType) metadata.employeeType = updates.employeeType;
      if (Object.keys(metadata).length > 0) {
        employeeUpdates.metadata = metadata;
      }
    }

    // Update displayName if name fields changed
    if (updates.firstName || updates.middleName || updates.lastName) {
      const firstName = updates.firstName || employee?.firstName;
      const lastName = updates.lastName || employee?.lastName;
      const middleName = updates.middleName;
      
      employeeUpdates.displayName = middleName 
        ? `${firstName} ${middleName} ${lastName}` 
        : `${firstName} ${lastName}`;
    }

    // Perform updates in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.userLogin.update({
        where: { id },
        data: loginUpdates,
      });

      let updatedEmployee = null;
      if (Object.keys(employeeUpdates).length > 0) {
        updatedEmployee = await tx.employeeDetails.updateMany({
          where: { userLoginId: id },
          data: employeeUpdates,
        });
      }

      return { user: updatedUser, employee: updatedEmployee };
    });

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: result.user,
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update employee',
      error: error.message,
    });
  }
};

// Toggle employee status
const toggleEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.userLogin.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    
    const updated = await prisma.userLogin.update({
      where: { id },
      data: { status: newStatus },
    });

    res.json({
      success: true,
      message: `Employee ${updated.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: updated,
    });
  } catch (error) {
    console.error('Toggle employee status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle employee status',
      error: error.message,
    });
  }
};

module.exports = {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  toggleEmployeeStatus,
};
