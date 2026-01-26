const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// ==========================================
// APPRAISAL CYCLES
// ==========================================

// Get all cycles
router.get('/cycles', authenticateToken, async (req, res) => {
  try {
    const cycles = await db.prepare(`
      SELECT ac.*, u.name as created_by_name
      FROM appraisal_cycles ac
      LEFT JOIN users u ON ac.created_by = u.id
      ORDER BY ac.start_date DESC
    `).all();

    res.json(cycles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create cycle
router.post('/cycles', authenticateToken, async (req, res) => {
  try {
    const { name, type, start_date, end_date } = req.body;
    const id = `cycle-${uuidv4()}`;

    await db.prepare(`
      INSERT INTO appraisal_cycles (id, name, type, start_date, end_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, type, start_date, end_date, req.user.id);

    const cycle = await db.prepare('SELECT * FROM appraisal_cycles WHERE id = ?').get(id);
    res.status(201).json(cycle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update cycle
router.put('/cycles/:id', authenticateToken, async (req, res) => {
  try {
    const { name, type, start_date, end_date, status } = req.body;

    await db.prepare(`
      UPDATE appraisal_cycles
      SET name = COALESCE(?, name),
          type = COALESCE(?, type),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(name, type, start_date, end_date, status, req.params.id);

    const cycle = await db.prepare('SELECT * FROM appraisal_cycles WHERE id = ?').get(req.params.id);
    res.json(cycle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Activate cycle and create appraisals for all employees
router.post('/cycles/:id/activate', authenticateToken, async (req, res) => {
  try {
    const cycle = await db.prepare('SELECT * FROM appraisal_cycles WHERE id = ?').get(req.params.id);

    if (!cycle) {
      return res.status(404).json({ error: 'Cycle not found' });
    }

    // Update cycle status
    await db.prepare(`UPDATE appraisal_cycles SET status = 'active' WHERE id = ?`).run(req.params.id);

    // Get all employees (non-admin)
    const employees = await db.prepare(`SELECT id FROM users WHERE role = 'employee'`).all();

    // Get admin as default manager
    const admin = await db.prepare(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`).get();

    // Create appraisals for each employee
    for (const emp of employees) {
      const appraisalId = `appr-${uuidv4()}`;
      await db.prepare(`
        INSERT INTO appraisals (id, cycle_id, employee_id, manager_id, status)
        VALUES (?, ?, ?, ?, 'pending')
      `).run(appraisalId, req.params.id, emp.id, admin.id);
    }

    res.json({ message: 'Cycle activated', appraisalsCreated: employees.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// APPRAISALS
// ==========================================

// Get all appraisals (admin)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const appraisals = await db.prepare(`
      SELECT a.*,
             e.name as employee_name, e.email as employee_email, e.department, e.designation,
             m.name as manager_name,
             c.name as cycle_name, c.type as cycle_type
      FROM appraisals a
      JOIN users e ON a.employee_id = e.id
      JOIN users m ON a.manager_id = m.id
      JOIN appraisal_cycles c ON a.cycle_id = c.id
      ORDER BY a.created_at DESC
    `).all();

    res.json(appraisals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my appraisals
router.get('/my-appraisals', authenticateToken, async (req, res) => {
  try {
    const appraisals = await db.prepare(`
      SELECT a.*,
             e.name as employee_name, e.email as employee_email, e.department, e.designation,
             m.name as manager_name,
             c.name as cycle_name, c.type as cycle_type
      FROM appraisals a
      JOIN users e ON a.employee_id = e.id
      JOIN users m ON a.manager_id = m.id
      JOIN appraisal_cycles c ON a.cycle_id = c.id
      WHERE a.employee_id = ?
      ORDER BY a.created_at DESC
    `).all(req.user.id);

    res.json(appraisals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get appraisals to review (as manager)
router.get('/to-review', authenticateToken, async (req, res) => {
  try {
    const appraisals = await db.prepare(`
      SELECT a.*,
             e.name as employee_name, e.email as employee_email, e.department, e.designation,
             c.name as cycle_name, c.type as cycle_type
      FROM appraisals a
      JOIN users e ON a.employee_id = e.id
      JOIN appraisal_cycles c ON a.cycle_id = c.id
      WHERE a.manager_id = ? AND a.status IN ('pending', 'self_review')
      ORDER BY a.created_at DESC
    `).all(req.user.id);

    res.json(appraisals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single appraisal
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const appraisal = await db.prepare(`
      SELECT a.*,
             e.name as employee_name, e.email as employee_email, e.department, e.designation,
             m.name as manager_name,
             c.name as cycle_name, c.type as cycle_type, c.start_date as cycle_start, c.end_date as cycle_end
      FROM appraisals a
      JOIN users e ON a.employee_id = e.id
      JOIN users m ON a.manager_id = m.id
      JOIN appraisal_cycles c ON a.cycle_id = c.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!appraisal) {
      return res.status(404).json({ error: 'Appraisal not found' });
    }

    // Get linked goals
    const goals = await db.prepare(`
      SELECT * FROM goals WHERE appraisal_id = ? OR (user_id = ? AND appraisal_id IS NULL)
    `).all(req.params.id, appraisal.employee_id);

    // Get 360 feedback
    const feedback = await db.prepare(`
      SELECT f.*, u.name as reviewer_name
      FROM feedback_360 f
      LEFT JOIN users u ON f.reviewer_id = u.id
      WHERE f.appraisal_id = ?
    `).all(req.params.id);

    appraisal.goals = goals;
    appraisal.feedback_360 = feedback;

    res.json(appraisal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit self-review
router.post('/:id/self-review', authenticateToken, async (req, res) => {
  try {
    const { self_rating, self_comments } = req.body;

    await db.prepare(`
      UPDATE appraisals
      SET self_rating = ?, self_comments = ?, status = 'self_review', submitted_at = ?
      WHERE id = ? AND employee_id = ?
    `).run(self_rating, self_comments, new Date().toISOString(), req.params.id, req.user.id);

    const appraisal = await db.prepare('SELECT * FROM appraisals WHERE id = ?').get(req.params.id);
    res.json(appraisal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit manager review
router.post('/:id/manager-review', authenticateToken, async (req, res) => {
  try {
    const { manager_rating, manager_comments, final_rating } = req.body;

    await db.prepare(`
      UPDATE appraisals
      SET manager_rating = ?, manager_comments = ?, final_rating = ?, status = 'completed', reviewed_at = ?
      WHERE id = ? AND manager_id = ?
    `).run(manager_rating, manager_comments, final_rating, new Date().toISOString(), req.params.id, req.user.id);

    const appraisal = await db.prepare('SELECT * FROM appraisals WHERE id = ?').get(req.params.id);
    res.json(appraisal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// GOALS
// ==========================================

// Get all goals
router.get('/goals/all', authenticateToken, async (req, res) => {
  try {
    const goals = await db.prepare(`
      SELECT g.*, u.name as user_name, u.department
      FROM goals g
      JOIN users u ON g.user_id = u.id
      ORDER BY g.created_at DESC
    `).all();

    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my goals
router.get('/goals/my-goals', authenticateToken, async (req, res) => {
  try {
    const goals = await db.prepare(`
      SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC
    `).all(req.user.id);

    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create goal
router.post('/goals', authenticateToken, async (req, res) => {
  try {
    const { user_id, appraisal_id, title, description, category, target_date, weightage } = req.body;
    const id = `goal-${uuidv4()}`;

    await db.prepare(`
      INSERT INTO goals (id, user_id, appraisal_id, title, description, category, target_date, weightage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, user_id || req.user.id, appraisal_id || null, title, description, category, target_date, weightage || 0);

    const goal = await db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update goal
router.put('/goals/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, target_date, weightage, progress, status, self_rating, manager_rating } = req.body;

    await db.prepare(`
      UPDATE goals
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          category = COALESCE(?, category),
          target_date = COALESCE(?, target_date),
          weightage = COALESCE(?, weightage),
          progress = COALESCE(?, progress),
          status = COALESCE(?, status),
          self_rating = COALESCE(?, self_rating),
          manager_rating = COALESCE(?, manager_rating)
      WHERE id = ?
    `).run(title, description, category, target_date, weightage, progress, status, self_rating, manager_rating, req.params.id);

    const goal = await db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete goal
router.delete('/goals/:id', authenticateToken, async (req, res) => {
  try {
    await db.prepare('DELETE FROM goals WHERE id = ?').run(req.params.id);
    res.json({ message: 'Goal deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 360 FEEDBACK
// ==========================================

// Get feedback for appraisal
router.get('/:id/feedback', authenticateToken, async (req, res) => {
  try {
    const feedback = await db.prepare(`
      SELECT f.*, u.name as reviewer_name
      FROM feedback_360 f
      LEFT JOIN users u ON f.reviewer_id = u.id
      WHERE f.appraisal_id = ?
    `).all(req.params.id);

    res.json(feedback);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit 360 feedback
router.post('/:id/feedback', authenticateToken, async (req, res) => {
  try {
    const { reviewer_type, rating, strengths, improvements, comments, is_anonymous } = req.body;
    const id = `fb-${uuidv4()}`;

    await db.prepare(`
      INSERT INTO feedback_360 (id, appraisal_id, reviewer_id, reviewer_type, rating, strengths, improvements, comments, is_anonymous, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, req.user.id, reviewer_type, rating, strengths, improvements, comments, is_anonymous ? 1 : 0, new Date().toISOString());

    const feedback = await db.prepare('SELECT * FROM feedback_360 WHERE id = ?').get(id);
    res.status(201).json(feedback);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
