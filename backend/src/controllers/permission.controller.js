const { pool } = require('../database/connection');

// Get all permissions for a user
exports.getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if requesting user has permission to view (for now, only allow viewing own permissions or if admin)
    if (req.user.id !== userId && req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these permissions'
      });
    }

    const result = await pool.query(`
      SELECT 
        p.id,
        p.permission_key,
        p.permission_name,
        p.description,
        m.name as module_name,
        m.slug as module_slug,
        up.granted_at,
        u.username as granted_by_username
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      JOIN modules m ON p.module_id = m.id
      LEFT JOIN users u ON up.granted_by = u.id
      WHERE up.user_id = $1
      ORDER BY m.display_order, p.permission_name
    `, [userId]);

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching permissions'
    });
  }
};

// Get all available permissions (checkboxes)
exports.getAllPermissions = async (req, res) => {
  try {
    const { moduleId } = req.query;

    let query = `
      SELECT 
        p.*,
        m.name as module_name,
        m.slug as module_slug
      FROM permissions p
      JOIN modules m ON p.module_id = m.id
      WHERE m.is_active = true
    `;
    
    const params = [];
    
    if (moduleId) {
      params.push(moduleId);
      query += ` AND p.module_id = $1`;
    }
    
    query += ` ORDER BY m.display_order, p.permission_name`;

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get all permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching permissions'
    });
  }
};

// Grant permissions to a user (requires admin)
exports.grantPermissions = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { userId, permissionIds } = req.body;

    if (!userId || !permissionIds || !Array.isArray(permissionIds)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide userId and permissionIds array'
      });
    }

    // Only admin can grant permissions (enhance this based on your requirements)
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to grant permissions'
      });
    }

    await client.query('BEGIN');

    const granted = [];
    for (const permId of permissionIds) {
      const result = await client.query(`
        INSERT INTO user_permissions (user_id, permission_id, granted_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, permission_id) DO NOTHING
        RETURNING id
      `, [userId, permId, req.user.id]);
      
      if (result.rows.length > 0) {
        granted.push(permId);
      }
    }

    // Audit log
    await client.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'GRANT_PERMISSIONS', 'user_permissions', userId, JSON.stringify({ granted })]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: `${granted.length} permissions granted successfully`,
      data: { granted }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Grant permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error granting permissions'
    });
  } finally {
    client.release();
  }
};

// Revoke permissions from a user (requires admin)
exports.revokePermissions = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { userId, permissionIds } = req.body;

    if (!userId || !permissionIds || !Array.isArray(permissionIds)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide userId and permissionIds array'
      });
    }

    // Only admin can revoke permissions
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to revoke permissions'
      });
    }

    await client.query('BEGIN');

    const result = await client.query(
      'DELETE FROM user_permissions WHERE user_id = $1 AND permission_id = ANY($2) RETURNING permission_id',
      [userId, permissionIds]
    );

    const revoked = result.rows.map(r => r.permission_id);

    // Audit log
    await client.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'REVOKE_PERMISSIONS', 'user_permissions', userId, JSON.stringify({ revoked })]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: `${revoked.length} permissions revoked successfully`,
      data: { revoked }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Revoke permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error revoking permissions'
    });
  } finally {
    client.release();
  }
};

// Update user permissions (set exact permissions)
exports.updateUserPermissions = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { userId, permissionIds } = req.body;

    if (!userId || !permissionIds || !Array.isArray(permissionIds)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide userId and permissionIds array'
      });
    }

    // Only admin can update permissions
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update permissions'
      });
    }

    await client.query('BEGIN');

    // Remove all current permissions
    await client.query('DELETE FROM user_permissions WHERE user_id = $1', [userId]);

    // Add new permissions
    for (const permId of permissionIds) {
      await client.query(
        'INSERT INTO user_permissions (user_id, permission_id, granted_by) VALUES ($1, $2, $3)',
        [userId, permId, req.user.id]
      );
    }

    // Audit log
    await client.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'UPDATE_PERMISSIONS', 'user_permissions', userId, JSON.stringify({ count: permissionIds.length })]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Permissions updated successfully',
      data: { count: permissionIds.length }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating permissions'
    });
  } finally {
    client.release();
  }
};
