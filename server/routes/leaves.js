const express = require('express');
const { db } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all leave requests (admin) or my requests (employee)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let leaves;

    if (req.user.role === 'admin') {
      leaves = await db.prepare(`
        SELECT
          lr.*,
          u.name as user_name,
          u.department as user_department
        FROM leave_requests lr
        LEFT JOIN users u ON lr.user_id = u.id
        ORDER BY lr.created_at DESC
      `).all();
    } else {
      leaves = await db.prepare(`
        SELECT * FROM leave_requests
        WHERE user_id = ?
        ORDER BY created_at DESC
      `).all(req.user.id);
    }

    const formattedLeaves = leaves.map(l => ({
      id: l.id,
      userId: l.user_id,
      userName: l.user_name,
      userDepartment: l.user_department,
      leaveType: l.leave_type,
      startDate: l.start_date,
      endDate: l.end_date,
      reason: l.reason,
      status: l.status,
      approvedBy: l.approved_by,
      createdAt: l.created_at,
    }));

    res.json({ leaves: formattedLeaves });
  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get my leave requests
router.get('/my-leaves', authenticateToken, async (req, res) => {
  try {
    const leaves = await db.prepare(`
      SELECT * FROM leave_requests
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);

    const formattedLeaves = leaves.map(l => ({
      id: l.id,
      userId: l.user_id,
      leaveType: l.leave_type,
      startDate: l.start_date,
      endDate: l.end_date,
      reason: l.reason,
      status: l.status,
      approvedBy: l.approved_by,
      createdAt: l.created_at,
    }));

    res.json({ leaves: formattedLeaves });
  } catch (error) {
    console.error('Get my leaves error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create leave request
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate) {
      return res.status(400).json({ error: 'Leave type, start date, and end date are required' });
    }

    const leaveId = `leave-${Date.now()}`;

    await db.prepare(`
      INSERT INTO leave_requests (id, user_id, leave_type, start_date, end_date, reason, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(leaveId, req.user.id, leaveType, startDate, endDate, reason || '');

    const leave = await db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(leaveId);

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leave: {
        id: leave.id,
        userId: leave.user_id,
        leaveType: leave.leave_type,
        startDate: leave.start_date,
        endDate: leave.end_date,
        reason: leave.reason,
        status: leave.status,
        createdAt: leave.created_at,
      },
    });
  } catch (error) {
    console.error('Create leave error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update leave request status (admin only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const existingLeave = await db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id);
    if (!existingLeave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    // Only admin can approve/reject, or owner can update reason if pending
    if (status && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can approve/reject leave requests' });
    }

    if (status) {
      await db.prepare(`
        UPDATE leave_requests SET status = ?, approved_by = ?
        WHERE id = ?
      `).run(status, req.user.id, id);
    } else if (reason !== undefined && existingLeave.user_id === req.user.id && existingLeave.status === 'pending') {
      await db.prepare('UPDATE leave_requests SET reason = ? WHERE id = ?').run(reason, id);
    }

    const updatedLeave = await db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id);

    res.json({
      message: 'Leave request updated successfully',
      leave: {
        id: updatedLeave.id,
        userId: updatedLeave.user_id,
        leaveType: updatedLeave.leave_type,
        startDate: updatedLeave.start_date,
        endDate: updatedLeave.end_date,
        reason: updatedLeave.reason,
        status: updatedLeave.status,
        approvedBy: updatedLeave.approved_by,
        createdAt: updatedLeave.created_at,
      },
    });
  } catch (error) {
    console.error('Update leave error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete leave request
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const existingLeave = await db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id);
    if (!existingLeave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    // Only owner or admin can delete
    if (existingLeave.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this leave request' });
    }

    await db.prepare('DELETE FROM leave_requests WHERE id = ?').run(id);

    res.json({ message: 'Leave request deleted successfully' });
  } catch (error) {
    console.error('Delete leave error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
