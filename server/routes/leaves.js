const express = require('express');
const { getSupabaseClient } = require('../config/supabase');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all leave requests (admin) or my requests (employee)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    let leaves;

    if (req.user.role === 'admin') {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, user:users!user_id(name, department)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      leaves = data.map(l => ({
        ...l,
        user_name: l.user?.name,
        user_department: l.user?.department
      }));
    } else {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      leaves = data;
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
    const supabase = getSupabaseClient();
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { data: leaves, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

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
    const supabase = getSupabaseClient();
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate) {
      return res.status(400).json({ error: 'Leave type, start date, and end date are required' });
    }

    const leaveId = `leave-${Date.now()}`;

    const { data: leave, error } = await supabase
      .from('leave_requests')
      .insert({
        id: leaveId,
        user_id: req.user.id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason || '',
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

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
    const supabase = getSupabaseClient();
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { id } = req.params;
    const { status, reason } = req.body;

    const { data: existingLeave, error: findError } = await supabase
      .from('leave_requests')
      .select()
      .eq('id', id)
      .single();

    if (findError || !existingLeave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (status && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can approve/reject leave requests' });
    }

    let updateData = {};
    if (status) {
      updateData = { status, approved_by: req.user.id };
    } else if (reason !== undefined && existingLeave.user_id === req.user.id && existingLeave.status === 'pending') {
      updateData = { reason };
    }

    const { data: updatedLeave, error } = await supabase
      .from('leave_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

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
    const supabase = getSupabaseClient();
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { id } = req.params;

    const { data: existingLeave, error: findError } = await supabase
      .from('leave_requests')
      .select()
      .eq('id', id)
      .single();

    if (findError || !existingLeave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (existingLeave.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this leave request' });
    }

    const { error } = await supabase
      .from('leave_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Leave request deleted successfully' });
  } catch (error) {
    console.error('Delete leave error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
