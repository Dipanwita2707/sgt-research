const { pool } = require('../../database/connection');

// ==================== RESEARCH PAPERS ====================

// Get all research papers
exports.getAllPapers = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        rp.*,
        u.username as author_username,
        COALESCE(s.first_name || ' ' || s.last_name, st.first_name || ' ' || st.last_name) as author_name
      FROM research_papers rp
      JOIN users u ON rp.user_id = u.id
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN staff st ON u.id = st.user_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    // Filter by status
    if (status) {
      query += ` AND rp.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    // Search by title
    if (search) {
      query += ` AND rp.title ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Only show user's own papers unless they have review permission
    const hasReviewPermission = await checkPermission(req.user.id, 'research.review');
    if (!hasReviewPermission) {
      query += ` AND rp.user_id = $${paramCount}`;
      params.push(req.user.id);
      paramCount++;
    }

    query += ` ORDER BY rp.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM research_papers WHERE 1=1';
    const countParams = [];
    if (status) countParams.push(status);
    if (!hasReviewPermission) countParams.push(req.user.id);

    const countResult = await pool.query(countQuery, countParams);

    res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get papers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching research papers'
    });
  }
};

// Create research paper
exports.createPaper = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      title,
      abstract,
      keywords,
      authors,
      journal_name,
      publication_date,
      doi,
      url
    } = req.body;

    if (!title || !abstract) {
      return res.status(400).json({
        success: false,
        message: 'Title and abstract are required'
      });
    }

    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO research_papers (
        user_id, title, abstract, keywords, authors, 
        journal_name, publication_date, doi, url, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')
      RETURNING *
    `, [
      req.user.id,
      title,
      abstract,
      keywords,
      authors,
      journal_name,
      publication_date,
      doi,
      url
    ]);

    // Audit log
    await client.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'CREATE_RESEARCH_PAPER', 'research_paper', result.rows[0].id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Research paper created successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create paper error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating research paper'
    });
  } finally {
    client.release();
  }
};

// Get single paper
exports.getPaper = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        rp.*,
        u.username as author_username,
        COALESCE(s.first_name || ' ' || s.last_name, st.first_name || ' ' || st.last_name) as author_name
      FROM research_papers rp
      JOIN users u ON rp.user_id = u.id
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN staff st ON u.id = st.user_id
      WHERE rp.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Research paper not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get paper error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching research paper'
    });
  }
};

// Update paper
exports.updatePaper = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check ownership
    const paper = await pool.query('SELECT user_id FROM research_papers WHERE id = $1', [id]);
    if (paper.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Paper not found' });
    }

    if (paper.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const result = await pool.query(`
      UPDATE research_papers 
      SET title = COALESCE($1, title),
          abstract = COALESCE($2, abstract),
          keywords = COALESCE($3, keywords),
          authors = COALESCE($4, authors),
          journal_name = COALESCE($5, journal_name),
          publication_date = COALESCE($6, publication_date),
          doi = COALESCE($7, doi),
          url = COALESCE($8, url)
      WHERE id = $9
      RETURNING *
    `, [
      updates.title,
      updates.abstract,
      updates.keywords,
      updates.authors,
      updates.journal_name,
      updates.publication_date,
      updates.doi,
      updates.url,
      id
    ]);

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Paper updated successfully'
    });
  } catch (error) {
    console.error('Update paper error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete paper
exports.deletePaper = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM research_papers WHERE id = $1 AND user_id = $2', [
      id,
      req.user.id
    ]);

    res.status(200).json({
      success: true,
      message: 'Paper deleted successfully'
    });
  } catch (error) {
    console.error('Delete paper error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Review paper (staff)
exports.reviewPaper = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, review_comments } = req.body;

    const result = await pool.query(`
      UPDATE research_papers 
      SET status = $1, 
          review_comments = $2,
          reviewed_by = $3,
          reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [status, review_comments, req.user.id, id]);

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Review submitted successfully'
    });
  } catch (error) {
    console.error('Review paper error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ==================== PATENTS ====================

// Get all patents
exports.getAllPatents = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        p.*,
        u.username as inventor_username,
        COALESCE(s.first_name || ' ' || s.last_name, st.first_name || ' ' || st.last_name) as inventor_name
      FROM patents p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN staff st ON u.id = st.user_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND p.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    const hasManagePermission = await checkPermission(req.user.id, 'patent.manage');
    if (!hasManagePermission) {
      query += ` AND p.user_id = $${paramCount}`;
      params.push(req.user.id);
      paramCount++;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get patents error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create patent
exports.createPatent = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      title,
      description,
      inventors,
      application_number,
      filing_date,
      patent_number,
      grant_date
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO patents (
        user_id, title, description, inventors,
        application_number, filing_date, patent_number, grant_date, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING *
    `, [
      req.user.id,
      title,
      description,
      inventors,
      application_number,
      filing_date,
      patent_number,
      grant_date
    ]);

    await client.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'CREATE_PATENT', 'patent', result.rows[0].id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Patent created successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create patent error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
};

// Get single patent
exports.getPatent = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        p.*,
        u.username,
        COALESCE(s.first_name || ' ' || s.last_name, st.first_name || ' ' || st.last_name) as inventor_name
      FROM patents p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN staff st ON u.id = st.user_id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patent not found' });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get patent error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update patent
exports.updatePatent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const result = await pool.query(`
      UPDATE patents 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          inventors = COALESCE($3, inventors),
          application_number = COALESCE($4, application_number),
          filing_date = COALESCE($5, filing_date),
          patent_number = COALESCE($6, patent_number),
          grant_date = COALESCE($7, grant_date)
      WHERE id = $8 AND user_id = $9
      RETURNING *
    `, [
      updates.title,
      updates.description,
      updates.inventors,
      updates.application_number,
      updates.filing_date,
      updates.patent_number,
      updates.grant_date,
      id,
      req.user.id
    ]);

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Patent updated successfully'
    });
  } catch (error) {
    console.error('Update patent error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete patent
exports.deletePatent = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM patents WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Patent deleted successfully'
    });
  } catch (error) {
    console.error('Delete patent error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update patent status
exports.updatePatentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comments } = req.body;

    const result = await pool.query(`
      UPDATE patents 
      SET status = $1,
          status_comments = $2,
          updated_by = $3
      WHERE id = $4
      RETURNING *
    `, [status, comments, req.user.id, id]);

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Patent status updated successfully'
    });
  } catch (error) {
    console.error('Update patent status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Helper function
async function checkPermission(userId, permissionKey) {
  const result = await pool.query(`
    SELECT up.id 
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = $1 AND p.permission_key = $2
  `, [userId, permissionKey]);

  return result.rows.length > 0;
}
