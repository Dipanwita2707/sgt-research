const { pool } = require('../database/connection');

// Get all modules
exports.getAllModules = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM modules 
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

// Get single module
exports.getModule = async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await pool.query(
      'SELECT * FROM modules WHERE slug = $1',
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get module error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching module'
    });
  }
};

// Get module permissions
exports.getModulePermissions = async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await pool.query(`
      SELECT p.* 
      FROM permissions p
      JOIN modules m ON p.module_id = m.id
      WHERE m.slug = $1
      ORDER BY p.permission_name
    `, [slug]);

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get module permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching module permissions'
    });
  }
};
