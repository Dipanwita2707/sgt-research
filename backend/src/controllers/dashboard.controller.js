const { pool } = require('../database/connection');

// Get dashboard data with user's accessible modules
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's modules based on permissions
    const modulesResult = await pool.query(`
      SELECT DISTINCT m.*
      FROM modules m
      JOIN permissions p ON m.id = p.module_id
      JOIN user_permissions up ON p.id = up.permission_id
      WHERE up.user_id = $1 AND m.is_active = true
      ORDER BY m.display_order, m.name
    `, [userId]);

    // Get user's permissions grouped by module
    const permissionsResult = await pool.query(`
      SELECT 
        m.id as module_id,
        m.slug as module_slug,
        p.permission_key,
        p.permission_name
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      JOIN modules m ON p.module_id = m.id
      WHERE up.user_id = $1 AND m.is_active = true
      ORDER BY m.display_order, p.permission_name
    `, [userId]);

    // Group permissions by module
    const permissionsByModule = {};
    permissionsResult.rows.forEach(perm => {
      if (!permissionsByModule[perm.module_slug]) {
        permissionsByModule[perm.module_slug] = [];
      }
      permissionsByModule[perm.module_slug].push({
        key: perm.permission_key,
        name: perm.permission_name
      });
    });

    // Get user details
    let userDetails = {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      userType: req.user.user_type
    };

    if (req.user.user_type === 'student') {
      const studentResult = await pool.query(
        'SELECT * FROM students WHERE user_id = $1',
        [userId]
      );
      if (studentResult.rows.length > 0) {
        userDetails = { ...userDetails, profile: studentResult.rows[0] };
      }
    } else if (req.user.user_type === 'staff') {
      const staffResult = await pool.query(
        'SELECT * FROM staff WHERE user_id = $1',
        [userId]
      );
      if (staffResult.rows.length > 0) {
        userDetails = { ...userDetails, profile: staffResult.rows[0] };
      }
    }

    res.status(200).json({
      success: true,
      data: {
        user: userDetails,
        modules: modulesResult.rows,
        permissions: permissionsByModule
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard data'
    });
  }
};

// Get available modules (all active modules in system)
exports.getAvailableModules = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM modules 
      WHERE is_active = true 
      ORDER BY display_order, name
    `);

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching modules'
    });
  }
};
