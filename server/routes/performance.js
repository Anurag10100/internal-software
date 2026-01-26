const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// ==========================================
// KPIs
// ==========================================

// Get all KPIs (admin)
router.get('/kpis', authenticateToken, async (req, res) => {
  try {
    const kpis = await db.prepare(`
      SELECT k.*, u.name as user_name, u.department, u.designation
      FROM kpis k
      JOIN users u ON k.user_id = u.id
      ORDER BY k.created_at DESC
    `).all();

    res.json(kpis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my KPIs
router.get('/kpis/my-kpis', authenticateToken, async (req, res) => {
  try {
    const kpis = await db.prepare(`
      SELECT * FROM kpis WHERE user_id = ? ORDER BY created_at DESC
    `).all(req.user.id);

    res.json(kpis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get KPIs for specific user
router.get('/kpis/user/:userId', authenticateToken, async (req, res) => {
  try {
    const kpis = await db.prepare(`
      SELECT * FROM kpis WHERE user_id = ? ORDER BY created_at DESC
    `).all(req.params.userId);

    res.json(kpis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create KPI
router.post('/kpis', authenticateToken, async (req, res) => {
  try {
    const { user_id, title, description, metric_type, target_value, unit, period } = req.body;
    const id = `kpi-${uuidv4()}`;

    await db.prepare(`
      INSERT INTO kpis (id, user_id, title, description, metric_type, target_value, unit, period)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, user_id, title, description, metric_type, target_value, unit, period);

    const kpi = await db.prepare('SELECT * FROM kpis WHERE id = ?').get(id);
    res.status(201).json(kpi);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update KPI
router.put('/kpis/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, metric_type, target_value, current_value, unit, period, status } = req.body;

    await db.prepare(`
      UPDATE kpis
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          metric_type = COALESCE(?, metric_type),
          target_value = COALESCE(?, target_value),
          current_value = COALESCE(?, current_value),
          unit = COALESCE(?, unit),
          period = COALESCE(?, period),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(title, description, metric_type, target_value, current_value, unit, period, status, req.params.id);

    const kpi = await db.prepare('SELECT * FROM kpis WHERE id = ?').get(req.params.id);
    res.json(kpi);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete KPI
router.delete('/kpis/:id', authenticateToken, async (req, res) => {
  try {
    await db.prepare('DELETE FROM kpis WHERE id = ?').run(req.params.id);
    res.json({ message: 'KPI deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// PERFORMANCE NOTES
// ==========================================

// Get all notes (admin)
router.get('/notes', authenticateToken, async (req, res) => {
  try {
    const notes = await db.prepare(`
      SELECT pn.*,
             u.name as user_name, u.department,
             a.name as author_name
      FROM performance_notes pn
      JOIN users u ON pn.user_id = u.id
      JOIN users a ON pn.author_id = a.id
      ORDER BY pn.created_at DESC
    `).all();

    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get notes for specific user
router.get('/notes/for/:userId', authenticateToken, async (req, res) => {
  try {
    // Only show non-private notes unless requester is admin or author
    const notes = await db.prepare(`
      SELECT pn.*, a.name as author_name
      FROM performance_notes pn
      JOIN users a ON pn.author_id = a.id
      WHERE pn.user_id = ? AND (pn.is_private = 0 OR pn.author_id = ? OR ? = 'admin')
      ORDER BY pn.created_at DESC
    `).all(req.params.userId, req.user.id, req.user.role);

    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my notes (received)
router.get('/notes/my-notes', authenticateToken, async (req, res) => {
  try {
    const notes = await db.prepare(`
      SELECT pn.*, a.name as author_name
      FROM performance_notes pn
      JOIN users a ON pn.author_id = a.id
      WHERE pn.user_id = ? AND pn.is_private = 0
      ORDER BY pn.created_at DESC
    `).all(req.user.id);

    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create note
router.post('/notes', authenticateToken, async (req, res) => {
  try {
    const { user_id, type, content, is_private } = req.body;
    const id = `note-${uuidv4()}`;

    await db.prepare(`
      INSERT INTO performance_notes (id, user_id, author_id, type, content, is_private)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, user_id, req.user.id, type, content, is_private ? 1 : 0);

    const note = await db.prepare(`
      SELECT pn.*, a.name as author_name
      FROM performance_notes pn
      JOIN users a ON pn.author_id = a.id
      WHERE pn.id = ?
    `).get(id);

    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete note
router.delete('/notes/:id', authenticateToken, async (req, res) => {
  try {
    await db.prepare('DELETE FROM performance_notes WHERE id = ? AND author_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// PIPs (Performance Improvement Plans)
// ==========================================

// Get all PIPs (admin)
router.get('/pips', authenticateToken, async (req, res) => {
  try {
    const pips = await db.prepare(`
      SELECT p.*,
             u.name as user_name, u.department, u.designation,
             m.name as manager_name
      FROM pips p
      JOIN users u ON p.user_id = u.id
      JOIN users m ON p.manager_id = m.id
      ORDER BY p.created_at DESC
    `).all();

    res.json(pips);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active PIPs
router.get('/pips/active', authenticateToken, async (req, res) => {
  try {
    const pips = await db.prepare(`
      SELECT p.*,
             u.name as user_name, u.department, u.designation,
             m.name as manager_name
      FROM pips p
      JOIN users u ON p.user_id = u.id
      JOIN users m ON p.manager_id = m.id
      WHERE p.status = 'active'
      ORDER BY p.end_date ASC
    `).all();

    res.json(pips);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my PIP
router.get('/pips/my-pip', authenticateToken, async (req, res) => {
  try {
    const pip = await db.prepare(`
      SELECT p.*, m.name as manager_name
      FROM pips p
      JOIN users m ON p.manager_id = m.id
      WHERE p.user_id = ? AND p.status = 'active'
      ORDER BY p.created_at DESC
      LIMIT 1
    `).get(req.user.id);

    if (pip) {
      const checkpoints = await db.prepare(`
        SELECT pc.*, u.name as reviewed_by_name
        FROM pip_checkpoints pc
        LEFT JOIN users u ON pc.reviewed_by = u.id
        WHERE pc.pip_id = ?
        ORDER BY pc.checkpoint_date DESC
      `).all(pip.id);

      pip.checkpoints = checkpoints;
    }

    res.json(pip || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get PIP by ID
router.get('/pips/:id', authenticateToken, async (req, res) => {
  try {
    const pip = await db.prepare(`
      SELECT p.*,
             u.name as user_name, u.email as user_email, u.department, u.designation,
             m.name as manager_name
      FROM pips p
      JOIN users u ON p.user_id = u.id
      JOIN users m ON p.manager_id = m.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!pip) {
      return res.status(404).json({ error: 'PIP not found' });
    }

    const checkpoints = await db.prepare(`
      SELECT pc.*, u.name as reviewed_by_name
      FROM pip_checkpoints pc
      LEFT JOIN users u ON pc.reviewed_by = u.id
      WHERE pc.pip_id = ?
      ORDER BY pc.checkpoint_date DESC
    `).all(pip.id);

    pip.checkpoints = checkpoints;

    res.json(pip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create PIP
router.post('/pips', authenticateToken, async (req, res) => {
  try {
    const { user_id, start_date, end_date, reason, goals } = req.body;
    const id = `pip-${uuidv4()}`;

    await db.prepare(`
      INSERT INTO pips (id, user_id, manager_id, start_date, end_date, reason, goals)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, user_id, req.user.id, start_date, end_date, reason, JSON.stringify(goals || []));

    const pip = await db.prepare('SELECT * FROM pips WHERE id = ?').get(id);
    res.status(201).json(pip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update PIP
router.put('/pips/:id', authenticateToken, async (req, res) => {
  try {
    const { end_date, reason, goals, status, outcome } = req.body;

    await db.prepare(`
      UPDATE pips
      SET end_date = COALESCE(?, end_date),
          reason = COALESCE(?, reason),
          goals = COALESCE(?, goals),
          status = COALESCE(?, status),
          outcome = COALESCE(?, outcome)
      WHERE id = ?
    `).run(end_date, reason, goals ? JSON.stringify(goals) : null, status, outcome, req.params.id);

    const pip = await db.prepare('SELECT * FROM pips WHERE id = ?').get(req.params.id);
    res.json(pip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add PIP checkpoint
router.post('/pips/:id/checkpoints', authenticateToken, async (req, res) => {
  try {
    const { checkpoint_date, progress_notes, rating } = req.body;
    const id = `pipc-${uuidv4()}`;

    await db.prepare(`
      INSERT INTO pip_checkpoints (id, pip_id, checkpoint_date, progress_notes, rating, reviewed_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, checkpoint_date, progress_notes, rating, req.user.id);

    const checkpoint = await db.prepare(`
      SELECT pc.*, u.name as reviewed_by_name
      FROM pip_checkpoints pc
      LEFT JOIN users u ON pc.reviewed_by = u.id
      WHERE pc.id = ?
    `).get(id);

    res.status(201).json(checkpoint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get PIP checkpoints
router.get('/pips/:id/checkpoints', authenticateToken, async (req, res) => {
  try {
    const checkpoints = await db.prepare(`
      SELECT pc.*, u.name as reviewed_by_name
      FROM pip_checkpoints pc
      LEFT JOIN users u ON pc.reviewed_by = u.id
      WHERE pc.pip_id = ?
      ORDER BY pc.checkpoint_date DESC
    `).all(req.params.id);

    res.json(checkpoints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// RECOGNITIONS
// ==========================================

// Get all recognitions
router.get('/recognitions', authenticateToken, async (req, res) => {
  try {
    const recognitions = await db.prepare(`
      SELECT r.*,
             rec.name as recipient_name, rec.department as recipient_department,
             nom.name as nominator_name
      FROM recognitions r
      JOIN users rec ON r.recipient_id = rec.id
      JOIN users nom ON r.nominator_id = nom.id
      WHERE r.is_public = 1
      ORDER BY r.created_at DESC
    `).all();

    res.json(recognitions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my recognitions
router.get('/recognitions/my-recognitions', authenticateToken, async (req, res) => {
  try {
    const recognitions = await db.prepare(`
      SELECT r.*, nom.name as nominator_name
      FROM recognitions r
      JOIN users nom ON r.nominator_id = nom.id
      WHERE r.recipient_id = ?
      ORDER BY r.created_at DESC
    `).all(req.user.id);

    res.json(recognitions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create recognition
router.post('/recognitions', authenticateToken, async (req, res) => {
  try {
    const { recipient_id, type, badge, title, message, is_public } = req.body;
    const id = `rec-${uuidv4()}`;

    await db.prepare(`
      INSERT INTO recognitions (id, recipient_id, nominator_id, type, badge, title, message, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, recipient_id, req.user.id, type, badge, title, message, is_public !== false ? 1 : 0);

    const recognition = await db.prepare(`
      SELECT r.*,
             rec.name as recipient_name, rec.department as recipient_department,
             nom.name as nominator_name
      FROM recognitions r
      JOIN users rec ON r.recipient_id = rec.id
      JOIN users nom ON r.nominator_id = nom.id
      WHERE r.id = ?
    `).get(id);

    res.status(201).json(recognition);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete recognition
router.delete('/recognitions/:id', authenticateToken, async (req, res) => {
  try {
    await db.prepare('DELETE FROM recognitions WHERE id = ? AND nominator_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Recognition deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// DASHBOARD STATS
// ==========================================

// Get performance dashboard stats
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const stats = {};

    // KPI stats
    const kpiStats = await db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'achieved' THEN 1 ELSE 0 END) as achieved,
        SUM(CASE WHEN status = 'on_track' THEN 1 ELSE 0 END) as on_track,
        SUM(CASE WHEN status = 'at_risk' THEN 1 ELSE 0 END) as at_risk,
        SUM(CASE WHEN status = 'behind' THEN 1 ELSE 0 END) as behind
      FROM kpis
    `).get();

    stats.kpis = kpiStats;

    // Active PIPs
    const activePips = await db.prepare(`
      SELECT COUNT(*) as count FROM pips WHERE status = 'active'
    `).get();

    stats.activePips = activePips ? activePips.count : 0;

    // Recent recognitions count
    const recentRecognitions = await db.prepare(`
      SELECT COUNT(*) as count FROM recognitions
      WHERE created_at >= datetime('now', '-30 days')
    `).get();

    stats.recentRecognitions = recentRecognitions ? recentRecognitions.count : 0;

    // Goals progress
    const goalsStats = await db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        AVG(progress) as avg_progress
      FROM goals WHERE status = 'active'
    `).get();

    stats.goals = goalsStats;

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
