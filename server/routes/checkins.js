const express = require('express');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all check-ins (admin) or my check-ins (employee)
router.get('/', authenticateToken, (req, res) => {
  try {
    let checkins;

    if (req.user.role === 'admin') {
      checkins = db.prepare(`
        SELECT
          c.*,
          u.name as user_name,
          u.department as user_department
        FROM check_ins c
        LEFT JOIN users u ON c.user_id = u.id
        ORDER BY c.date DESC, c.check_in_time DESC
      `).all();
    } else {
      checkins = db.prepare(`
        SELECT * FROM check_ins
        WHERE user_id = ?
        ORDER BY date DESC, check_in_time DESC
      `).all(req.user.id);
    }

    const formattedCheckins = checkins.map(c => ({
      id: c.id,
      userId: c.user_id,
      userName: c.user_name,
      userDepartment: c.user_department,
      date: c.date,
      checkInTime: c.check_in_time,
      checkOutTime: c.check_out_time,
      location: c.location,
      status: c.status,
      notes: c.notes,
      createdAt: c.created_at,
    }));

    res.json({ checkins: formattedCheckins });
  } catch (error) {
    console.error('Get check-ins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get my check-ins
router.get('/my-checkins', authenticateToken, (req, res) => {
  try {
    const checkins = db.prepare(`
      SELECT * FROM check_ins
      WHERE user_id = ?
      ORDER BY date DESC, check_in_time DESC
    `).all(req.user.id);

    const formattedCheckins = checkins.map(c => ({
      id: c.id,
      userId: c.user_id,
      date: c.date,
      checkInTime: c.check_in_time,
      checkOutTime: c.check_out_time,
      location: c.location,
      status: c.status,
      notes: c.notes,
      createdAt: c.created_at,
    }));

    res.json({ checkins: formattedCheckins });
  } catch (error) {
    console.error('Get my check-ins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check in
router.post('/check-in', authenticateToken, (req, res) => {
  try {
    const { location, notes } = req.body;

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Check if already checked in today
    const existingCheckin = db.prepare(`
      SELECT * FROM check_ins WHERE user_id = ? AND date = ?
    `).get(req.user.id, today);

    if (existingCheckin && existingCheckin.check_in_time) {
      return res.status(400).json({ error: 'Already checked in today' });
    }

    const checkinId = `checkin-${Date.now()}`;

    if (existingCheckin) {
      // Update existing record
      db.prepare(`
        UPDATE check_ins SET check_in_time = ?, location = ?, notes = ?
        WHERE id = ?
      `).run(now, location || 'Office', notes || '', existingCheckin.id);
    } else {
      // Create new record
      db.prepare(`
        INSERT INTO check_ins (id, user_id, date, check_in_time, location, status, notes)
        VALUES (?, ?, ?, ?, ?, 'present', ?)
      `).run(checkinId, req.user.id, today, now, location || 'Office', notes || '');
    }

    res.status(201).json({
      message: 'Checked in successfully',
      checkin: {
        id: existingCheckin?.id || checkinId,
        date: today,
        checkInTime: now,
        location: location || 'Office',
      },
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check out
router.post('/check-out', authenticateToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const existingCheckin = db.prepare(`
      SELECT * FROM check_ins WHERE user_id = ? AND date = ?
    `).get(req.user.id, today);

    if (!existingCheckin || !existingCheckin.check_in_time) {
      return res.status(400).json({ error: 'You need to check in first' });
    }

    if (existingCheckin.check_out_time) {
      return res.status(400).json({ error: 'Already checked out today' });
    }

    db.prepare(`
      UPDATE check_ins SET check_out_time = ?
      WHERE id = ?
    `).run(now, existingCheckin.id);

    res.json({
      message: 'Checked out successfully',
      checkin: {
        id: existingCheckin.id,
        date: today,
        checkInTime: existingCheckin.check_in_time,
        checkOutTime: now,
      },
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get today's check-in status
router.get('/today', authenticateToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const checkin = db.prepare(`
      SELECT * FROM check_ins WHERE user_id = ? AND date = ?
    `).get(req.user.id, today);

    res.json({
      checkin: checkin ? {
        id: checkin.id,
        date: checkin.date,
        checkInTime: checkin.check_in_time,
        checkOutTime: checkin.check_out_time,
        location: checkin.location,
        status: checkin.status,
      } : null,
    });
  } catch (error) {
    console.error('Get today check-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
