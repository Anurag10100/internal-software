const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get all check-ins (admin) or my check-ins (employee)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let checkins;

    if (req.user.role === 'admin') {
      const { data, error } = await supabase
        .from('check_ins')
        .select('*, user:users!user_id(name, department)')
        .order('date', { ascending: false })
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      checkins = data.map(c => ({
        ...c,
        user_name: c.user?.name,
        user_department: c.user?.department
      }));
    } else {
      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', req.user.id)
        .order('date', { ascending: false })
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      checkins = data;
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
router.get('/my-checkins', authenticateToken, async (req, res) => {
  try {
    const { data: checkins, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', req.user.id)
      .order('date', { ascending: false })
      .order('check_in_time', { ascending: false });

    if (error) throw error;

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
router.post('/check-in', authenticateToken, async (req, res) => {
  try {
    const { location, notes } = req.body;

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Check if already checked in today
    const { data: existingCheckin } = await supabase
      .from('check_ins')
      .select()
      .eq('user_id', req.user.id)
      .eq('date', today)
      .single();

    if (existingCheckin && existingCheckin.check_in_time) {
      return res.status(400).json({ error: 'Already checked in today' });
    }

    const checkinId = `checkin-${Date.now()}`;

    if (existingCheckin) {
      const { error } = await supabase
        .from('check_ins')
        .update({
          check_in_time: now,
          location: location || 'Office',
          notes: notes || ''
        })
        .eq('id', existingCheckin.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('check_ins')
        .insert({
          id: checkinId,
          user_id: req.user.id,
          date: today,
          check_in_time: now,
          location: location || 'Office',
          status: 'present',
          notes: notes || ''
        });

      if (error) throw error;
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
router.post('/check-out', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const { data: existingCheckin } = await supabase
      .from('check_ins')
      .select()
      .eq('user_id', req.user.id)
      .eq('date', today)
      .single();

    if (!existingCheckin || !existingCheckin.check_in_time) {
      return res.status(400).json({ error: 'You need to check in first' });
    }

    if (existingCheckin.check_out_time) {
      return res.status(400).json({ error: 'Already checked out today' });
    }

    const { error } = await supabase
      .from('check_ins')
      .update({ check_out_time: now })
      .eq('id', existingCheckin.id);

    if (error) throw error;

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
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: checkin } = await supabase
      .from('check_ins')
      .select()
      .eq('user_id', req.user.id)
      .eq('date', today)
      .single();

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
