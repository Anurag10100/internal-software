const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Get all probations (admin only)
router.get('/', authenticateToken, (req, res) => {
  try {
    const probations = db.prepare(`
      SELECT p.*, u.name as user_name, u.email as user_email, u.department, u.designation,
             c.name as confirmed_by_name
      FROM probations p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN users c ON p.confirmed_by = c.id
      ORDER BY p.end_date ASC
    `).all();

    res.json(probations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active probations
router.get('/active', authenticateToken, (req, res) => {
  try {
    const probations = db.prepare(`
      SELECT p.*, u.name as user_name, u.email as user_email, u.department, u.designation
      FROM probations p
      JOIN users u ON p.user_id = u.id
      WHERE p.status = 'ongoing'
      ORDER BY p.end_date ASC
    `).all();

    res.json(probations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user's probation
router.get('/my-probation', authenticateToken, (req, res) => {
  try {
    const probation = db.prepare(`
      SELECT p.*, u.name as user_name, u.email as user_email, u.department, u.designation
      FROM probations p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT 1
    `).get(req.user.id);

    if (probation) {
      // Get checklists
      const checklists = db.prepare(`
        SELECT * FROM probation_checklists WHERE probation_id = ?
      `).all(probation.id);

      // Get reviews
      const reviews = db.prepare(`
        SELECT pr.*, u.name as reviewer_name
        FROM probation_reviews pr
        JOIN users u ON pr.reviewer_id = u.id
        WHERE pr.probation_id = ?
        ORDER BY pr.review_date DESC
      `).all(probation.id);

      probation.checklists = checklists;
      probation.reviews = reviews;
    }

    res.json(probation || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get probation by ID
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const probation = db.prepare(`
      SELECT p.*, u.name as user_name, u.email as user_email, u.department, u.designation,
             c.name as confirmed_by_name
      FROM probations p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN users c ON p.confirmed_by = c.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!probation) {
      return res.status(404).json({ error: 'Probation not found' });
    }

    // Get checklists
    const checklists = db.prepare(`
      SELECT * FROM probation_checklists WHERE probation_id = ?
    `).all(probation.id);

    // Get reviews
    const reviews = db.prepare(`
      SELECT pr.*, u.name as reviewer_name
      FROM probation_reviews pr
      JOIN users u ON pr.reviewer_id = u.id
      WHERE pr.probation_id = ?
      ORDER BY pr.review_date DESC
    `).all(probation.id);

    probation.checklists = checklists;
    probation.reviews = reviews;

    res.json(probation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create probation
router.post('/', authenticateToken, (req, res) => {
  try {
    const { user_id, start_date, end_date, duration_days, notes } = req.body;

    const id = `prob-${uuidv4()}`;

    db.prepare(`
      INSERT INTO probations (id, user_id, start_date, end_date, duration_days, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, user_id, start_date, end_date, duration_days || 90, notes || '');

    // Create default checklists
    const defaultItems = [
      'Complete onboarding documentation',
      'Set up workstation and tools',
      'Complete department training',
      'First assignment/project',
      '30-day review',
      '60-day review',
      '90-day review'
    ];

    const insertChecklist = db.prepare(`
      INSERT INTO probation_checklists (id, probation_id, item) VALUES (?, ?, ?)
    `);

    defaultItems.forEach((item, index) => {
      insertChecklist.run(`pc-${uuidv4()}`, id, item);
    });

    // Update team_members table
    db.prepare(`
      UPDATE team_members SET in_probation = 1 WHERE user_id = ?
    `).run(user_id);

    const probation = db.prepare('SELECT * FROM probations WHERE id = ?').get(id);
    res.status(201).json(probation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update probation (extend, confirm, terminate)
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { status, extended_till, extension_reason, notes, confirmed_by, confirmed_at } = req.body;
    const probation = db.prepare('SELECT * FROM probations WHERE id = ?').get(req.params.id);

    if (!probation) {
      return res.status(404).json({ error: 'Probation not found' });
    }

    let updateQuery = 'UPDATE probations SET ';
    const updates = [];
    const values = [];

    if (status) {
      updates.push('status = ?');
      values.push(status);
    }
    if (extended_till) {
      updates.push('extended_till = ?');
      values.push(extended_till);
      updates.push('end_date = ?');
      values.push(extended_till);
    }
    if (extension_reason) {
      updates.push('extension_reason = ?');
      values.push(extension_reason);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }
    if (confirmed_by) {
      updates.push('confirmed_by = ?');
      values.push(confirmed_by);
    }
    if (confirmed_at) {
      updates.push('confirmed_at = ?');
      values.push(confirmed_at);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updateQuery += updates.join(', ') + ' WHERE id = ?';
    values.push(req.params.id);

    db.prepare(updateQuery).run(...values);

    // If confirmed or terminated, update team_members
    if (status === 'confirmed' || status === 'terminated') {
      db.prepare(`
        UPDATE team_members SET in_probation = 0 WHERE user_id = ?
      `).run(probation.user_id);
    }

    const updated = db.prepare('SELECT * FROM probations WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add probation review
router.post('/:id/reviews', authenticateToken, (req, res) => {
  try {
    const { milestone, rating, feedback, recommendation } = req.body;
    const probation = db.prepare('SELECT * FROM probations WHERE id = ?').get(req.params.id);

    if (!probation) {
      return res.status(404).json({ error: 'Probation not found' });
    }

    const id = `pr-${uuidv4()}`;
    const review_date = new Date().toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO probation_reviews (id, probation_id, reviewer_id, review_date, milestone, rating, feedback, recommendation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, req.user.id, review_date, milestone, rating, feedback, recommendation);

    const review = db.prepare(`
      SELECT pr.*, u.name as reviewer_name
      FROM probation_reviews pr
      JOIN users u ON pr.reviewer_id = u.id
      WHERE pr.id = ?
    `).get(id);

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get probation reviews
router.get('/:id/reviews', authenticateToken, (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT pr.*, u.name as reviewer_name
      FROM probation_reviews pr
      JOIN users u ON pr.reviewer_id = u.id
      WHERE pr.probation_id = ?
      ORDER BY pr.review_date DESC
    `).all(req.params.id);

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update checklist item
router.put('/:id/checklist/:checklistId', authenticateToken, (req, res) => {
  try {
    const { is_completed } = req.body;

    db.prepare(`
      UPDATE probation_checklists
      SET is_completed = ?, completed_at = ?, completed_by = ?
      WHERE id = ?
    `).run(
      is_completed ? 1 : 0,
      is_completed ? new Date().toISOString() : null,
      is_completed ? req.user.id : null,
      req.params.checklistId
    );

    const checklist = db.prepare('SELECT * FROM probation_checklists WHERE id = ?').get(req.params.checklistId);
    res.json(checklist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get checklists for probation
router.get('/:id/checklist', authenticateToken, (req, res) => {
  try {
    const checklists = db.prepare(`
      SELECT * FROM probation_checklists WHERE probation_id = ?
    `).all(req.params.id);

    res.json(checklists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add custom checklist item
router.post('/:id/checklist', authenticateToken, (req, res) => {
  try {
    const { item } = req.body;
    const id = `pc-${uuidv4()}`;

    db.prepare(`
      INSERT INTO probation_checklists (id, probation_id, item)
      VALUES (?, ?, ?)
    `).run(id, req.params.id, item);

    const checklist = db.prepare('SELECT * FROM probation_checklists WHERE id = ?').get(id);
    res.status(201).json(checklist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
