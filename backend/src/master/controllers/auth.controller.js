const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config/app.config');
const { isValidEmail, sanitizeInput } = require('../../utils/validators');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expire
  });
};

// Login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }

    const sanitizedUsername = sanitizeInput(username);

    // Get user from database using Prisma (UID or Registration Number only)
    const user = await prisma.userLogin.findFirst({
      where: {
        uid: sanitizedUsername
      },
      include: {
        employeeDetails: true,
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

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await prisma.userLogin.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Prepare user details (match frontend User interface)
    const userDetails = {
      id: user.id,
      username: user.uid,
      email: user.email,
      userType: user.role, // Keep faculty/staff distinction
      firstName: null,
      lastName: null,
      uid: user.uid,
      role: user.role,
      profileImage: user.profileImage
    };

    if (user.employeeDetails) {
      userDetails.firstName = user.employeeDetails.firstName;
      userDetails.lastName = user.employeeDetails.lastName;
      userDetails.employee = {
        empId: user.employeeDetails.empId,
        designation: user.employeeDetails.designation,
        displayName: user.employeeDetails.displayName
      };
    }

    if (user.studentLogin) {
      userDetails.firstName = user.studentLogin.firstName;
      userDetails.lastName = user.studentLogin.lastName;
      userDetails.student = {
        studentId: user.studentLogin.studentId,
        registrationNo: user.studentLogin.registrationNo,
        program: user.studentLogin.section?.program?.programName,
        semester: user.studentLogin.currentSemester,
        displayName: user.studentLogin.displayName
      };
    }

    // Generate token
    const token = generateToken(user.id);

    // Set cookie
    res.cookie('token', token, {
      expires: new Date(Date.now() + config.jwt.cookieExpire * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'strict'
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'LOGIN',
        targetTable: 'user_login',
        targetId: user.id,
        ipAddress: req.ip || null
      }
    });

    res.status(200).json({
      success: true,
      token,
      user: userDetails
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 1000),
      httpOnly: true
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'LOGOUT',
        targetTable: 'user_login',
        targetId: req.user.id
      }
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await prisma.userLogin.findUnique({
      where: { id: req.user.id },
      include: {
        employeeDetails: {
          include: {
            primaryDepartment: {
              include: {
                faculty: true
              }
            },
            primarySchool: true
          }
        },
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
        },
        departmentPermissions: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Format user data to match frontend expectations
    // Note: user.role is a scalar enum field (UserRoleEnum), not a relation
    const userDetails = {
      id: user.id,
      username: user.uid,
      email: user.email,
      userType: user.role, // This is the enum value like 'faculty', 'staff', etc.
      firstName: null,
      lastName: null,
      uid: user.uid,
      role: {
        name: user.role, // The enum value
        displayName: user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : null
      },
      profileImage: user.profileImage,
      permissions: user.departmentPermissions || []
    };

    if (user.employeeDetails) {
      userDetails.firstName = user.employeeDetails.firstName;
      userDetails.lastName = user.employeeDetails.lastName;
      userDetails.employee = {
        empId: user.employeeDetails.empId,
        designation: user.employeeDetails.designation,
        displayName: user.employeeDetails.displayName
      };
      userDetails.employeeDetails = {
        employeeId: user.employeeDetails.empId,
        phone: user.employeeDetails.phoneNumber,
        email: user.employeeDetails.email,
        joiningDate: user.employeeDetails.joinDate,
        department: user.employeeDetails.primaryDepartment ? {
          id: user.employeeDetails.primaryDepartment.id,
          name: user.employeeDetails.primaryDepartment.departmentName,
          school: user.employeeDetails.primaryDepartment.faculty ? {
            id: user.employeeDetails.primaryDepartment.faculty.id,
            name: user.employeeDetails.primaryDepartment.faculty.facultyName
          } : (user.employeeDetails.primarySchool ? {
            id: user.employeeDetails.primarySchool.id,
            name: user.employeeDetails.primarySchool.facultyName
          } : null)
        } : null,
        designation: user.employeeDetails.designation ? {
          name: user.employeeDetails.designation
        } : null
      };
    }

    if (user.studentLogin) {
      userDetails.firstName = user.studentLogin.firstName;
      userDetails.lastName = user.studentLogin.lastName;
      userDetails.student = {
        studentId: user.studentLogin.studentId,
        registrationNo: user.studentLogin.registrationNo,
        program: user.studentLogin.section?.program?.programName,
        semester: user.studentLogin.currentSemester,
        displayName: user.studentLogin.displayName
      };
    }

    res.status(200).json({
      success: true,
      user: userDetails
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user data'
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    // Get user
    const user = await prisma.userLogin.findUnique({
      where: { id: req.user.id }
    });

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, config.bcrypt.rounds);

    // Update password
    await prisma.userLogin.update({
      where: { id: req.user.id },
      data: { passwordHash: hashedPassword }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'PASSWORD_CHANGE',
        targetTable: 'user_login',
        targetId: req.user.id
      }
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error changing password'
    });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, email } = req.body;
    const userId = req.user.id;

    // Get current user with employee details
    const user = await prisma.userLogin.findUnique({
      where: { id: userId },
      include: { employeeDetails: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update UserLogin email if provided and different
    if (email && email !== user.email) {
      // Check if email already exists
      const existingEmail = await prisma.userLogin.findFirst({
        where: { email, id: { not: userId } }
      });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
      await prisma.userLogin.update({
        where: { id: userId },
        data: { email }
      });
    }

    // Update employee details if user has them
    if (user.employeeDetails) {
      const updateData = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phoneNumber = phone; // Field is phoneNumber in schema
      
      // Update displayName
      if (firstName || lastName) {
        updateData.displayName = `${firstName || user.employeeDetails.firstName} ${lastName || user.employeeDetails.lastName}`.trim();
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.employeeDetails.update({
          where: { id: user.employeeDetails.id },
          data: updateData
        });
      }
    }

    // Audit log - use 'details' field instead of 'changes'
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'PROFILE_UPDATE',
        targetTable: 'user_login',
        targetId: userId,
        details: { firstName, lastName, phone, email }
      }
    });

    // Fetch updated user
    const updatedUser = await prisma.userLogin.findUnique({
      where: { id: userId },
      include: {
        employeeDetails: {
          include: {
            primaryDepartment: {
              include: {
                faculty: true
              }
            },
            primarySchool: true
          }
        }
      }
    });

    // Format response - role is a scalar enum, not a relation
    const userDetails = {
      id: updatedUser.id,
      username: updatedUser.uid,
      email: updatedUser.email,
      userType: updatedUser.role,
      firstName: updatedUser.employeeDetails?.firstName || null,
      lastName: updatedUser.employeeDetails?.lastName || null,
      uid: updatedUser.uid,
      role: {
        name: updatedUser.role,
        displayName: updatedUser.role ? updatedUser.role.charAt(0).toUpperCase() + updatedUser.role.slice(1) : null
      },
      employeeDetails: updatedUser.employeeDetails ? {
        id: updatedUser.employeeDetails.id,
        employeeId: updatedUser.employeeDetails.empId,
        phone: updatedUser.employeeDetails.phoneNumber,
        email: updatedUser.employeeDetails.email,
        joiningDate: updatedUser.employeeDetails.joinDate,
        department: updatedUser.employeeDetails.primaryDepartment ? {
          id: updatedUser.employeeDetails.primaryDepartment.id,
          name: updatedUser.employeeDetails.primaryDepartment.departmentName,
          code: updatedUser.employeeDetails.primaryDepartment.departmentCode,
          school: updatedUser.employeeDetails.primaryDepartment.faculty ? {
            id: updatedUser.employeeDetails.primaryDepartment.faculty.id,
            name: updatedUser.employeeDetails.primaryDepartment.faculty.facultyName,
            code: updatedUser.employeeDetails.primaryDepartment.faculty.facultyCode
          } : null
        } : null,
        designation: updatedUser.employeeDetails.designation ? {
          name: updatedUser.employeeDetails.designation
        } : null
      } : null
    };

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: userDetails
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
};

// Get user settings
exports.getSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user settings exist
    let settings = await prisma.userSettings.findUnique({
      where: { userId }
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
          emailNotifications: true,
          pushNotifications: true,
          iprUpdates: true,
          taskReminders: true,
          systemAlerts: true,
          weeklyDigest: false,
          theme: 'light',
          language: 'en',
          compactView: false,
          showTips: true
        }
      });
    }

    res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching settings'
    });
  }
};

// Update user settings
exports.updateSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      emailNotifications,
      pushNotifications,
      iprUpdates,
      taskReminders,
      systemAlerts,
      weeklyDigest,
      theme,
      language,
      compactView,
      showTips
    } = req.body;

    // Check if settings exist
    let settings = await prisma.userSettings.findUnique({
      where: { userId }
    });

    const updateData = {};
    if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications;
    if (pushNotifications !== undefined) updateData.pushNotifications = pushNotifications;
    if (iprUpdates !== undefined) updateData.iprUpdates = iprUpdates;
    if (taskReminders !== undefined) updateData.taskReminders = taskReminders;
    if (systemAlerts !== undefined) updateData.systemAlerts = systemAlerts;
    if (weeklyDigest !== undefined) updateData.weeklyDigest = weeklyDigest;
    if (theme !== undefined) updateData.theme = theme;
    if (language !== undefined) updateData.language = language;
    if (compactView !== undefined) updateData.compactView = compactView;
    if (showTips !== undefined) updateData.showTips = showTips;

    if (settings) {
      settings = await prisma.userSettings.update({
        where: { userId },
        data: updateData
      });
    } else {
      settings = await prisma.userSettings.create({
        data: {
          userId,
          ...updateData
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating settings'
    });
  }
};
