const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../database/connection');
const {
  isValidStudentRegNo,
  isValidStaffUID,
  isValidEmail,
  isValidPassword,
  sanitizeInput
} = require('../utils/validators');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Login
exports.login = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }

    const sanitizedUsername = sanitizeInput(username);

    // Get user from database
    const userResult = await client.query(
      'SELECT * FROM users WHERE username = $1',
      [sanitizedUsername]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = userResult.rows[0];

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(403).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      // Increment login attempts
      const attempts = user.login_attempts + 1;
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
      
      if (attempts >= maxAttempts) {
        const lockoutDuration = parseInt(process.env.LOCKOUT_DURATION) || 15;
        const lockedUntil = new Date(Date.now() + lockoutDuration * 60 * 1000);
        
        await client.query(
          'UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3',
          [attempts, lockedUntil, user.id]
        );
        
        return res.status(403).json({
          success: false,
          message: `Account locked for ${lockoutDuration} minutes due to multiple failed attempts`
        });
      }
      
      await client.query(
        'UPDATE users SET login_attempts = $1 WHERE id = $2',
        [attempts, user.id]
      );
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts and update last login
    await client.query(
      'UPDATE users SET login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Get user details based on type
    let userDetails = {
      id: user.id,
      username: user.username,
      email: user.email,
      userType: user.user_type
    };

    if (user.user_type === 'student') {
      const studentResult = await client.query(
        'SELECT * FROM students WHERE user_id = $1',
        [user.id]
      );
      if (studentResult.rows.length > 0) {
        userDetails = { ...userDetails, ...studentResult.rows[0] };
      }
    } else if (user.user_type === 'staff') {
      const staffResult = await client.query(
        'SELECT * FROM staff WHERE user_id = $1',
        [user.id]
      );
      if (staffResult.rows.length > 0) {
        userDetails = { ...userDetails, ...staffResult.rows[0] };
      }
    }

    // Generate token
    const token = generateToken(user.id);

    // Set cookie
    const cookieExpire = parseInt(process.env.JWT_COOKIE_EXPIRE) || 7;
    res.cookie('token', token, {
      expires: new Date(Date.now() + cookieExpire * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    // Audit log
    await client.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, ip_address) VALUES ($1, $2, $3, $4)',
      [user.id, 'LOGIN', 'user', req.ip]
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: userDetails.id,
        username: userDetails.username,
        email: userDetails.email,
        userType: userDetails.userType,
        firstName: userDetails.first_name,
        lastName: userDetails.last_name
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  } finally {
    client.release();
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
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type) VALUES ($1, $2, $3)',
      [req.user.id, 'LOGOUT', 'user']
    );

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
    let userDetails = { ...req.user };

    if (req.user.user_type === 'student') {
      const result = await pool.query(
        'SELECT * FROM students WHERE user_id = $1',
        [req.user.id]
      );
      if (result.rows.length > 0) {
        userDetails = { ...userDetails, ...result.rows[0] };
      }
    } else if (req.user.user_type === 'staff') {
      const result = await pool.query(
        'SELECT * FROM staff WHERE user_id = $1',
        [req.user.id]
      );
      if (result.rows.length > 0) {
        userDetails = { ...userDetails, ...result.rows[0] };
      }
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

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with letters and numbers'
      });
    }

    // Get user
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = result.rows[0];

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    // Audit log
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type) VALUES ($1, $2, $3)',
      [req.user.id, 'PASSWORD_CHANGE', 'user']
    );

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
