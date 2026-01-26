const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ==========================================
// KPIs
// ==========================================

router.get('/kpis', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('kpis')
      .select('*, users!user_id(name, department, designation)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const kpis = data.map(k => ({
      ...k,
      user_name: k.users?.name,
      department: k.users?.department,
      designation: k.users?.designation,
      users: undefined
    }));

    res.json(kpis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/kpis/my-kpis', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('kpis')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/kpis/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('kpis')
      .select('*')
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/kpis', authenticateToken, async (req, res) => {
  try {
    const { user_id, title, description, metric_type, target_value, unit, period } = req.body;
    const id = `kpi-${uuidv4()}`;

    const { data, error } = await supabase
      .from('kpis')
      .insert({ id, user_id, title, description, metric_type, target_value, unit, period })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/kpis/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, metric_type, target_value, current_value, unit, period, status } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (metric_type !== undefined) updateData.metric_type = metric_type;
    if (target_value !== undefined) updateData.target_value = target_value;
    if (current_value !== undefined) updateData.current_value = current_value;
    if (unit !== undefined) updateData.unit = unit;
    if (period !== undefined) updateData.period = period;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabase
      .from('kpis')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/kpis/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase.from('kpis').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'KPI deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// PERFORMANCE NOTES
// ==========================================

router.get('/notes', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('performance_notes')
      .select('*, user:users!user_id(name, department), author:users!author_id(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const notes = data.map(n => ({
      ...n,
      user_name: n.user?.name,
      department: n.user?.department,
      author_name: n.author?.name,
      user: undefined,
      author: undefined
    }));

    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/notes/for/:userId', authenticateToken, async (req, res) => {
  try {
    let query = supabase
      .from('performance_notes')
      .select('*, author:users!author_id(name)')
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: false });

    if (req.user.role !== 'admin') {
      query = query.or(`is_private.eq.0,author_id.eq.${req.user.id}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const notes = data.map(n => ({
      ...n,
      author_name: n.author?.name,
      author: undefined
    }));

    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/notes/my-notes', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('performance_notes')
      .select('*, author:users!author_id(name)')
      .eq('user_id', req.user.id)
      .eq('is_private', 0)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const notes = data.map(n => ({
      ...n,
      author_name: n.author?.name,
      author: undefined
    }));

    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/notes', authenticateToken, async (req, res) => {
  try {
    const { user_id, type, content, is_private } = req.body;
    const id = `note-${uuidv4()}`;

    const { data, error } = await supabase
      .from('performance_notes')
      .insert({
        id,
        user_id,
        author_id: req.user.id,
        type,
        content,
        is_private: is_private ? 1 : 0
      })
      .select('*, author:users!author_id(name)')
      .single();

    if (error) throw error;

    res.status(201).json({
      ...data,
      author_name: data.author?.name,
      author: undefined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/notes/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('performance_notes')
      .delete()
      .eq('id', req.params.id)
      .eq('author_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// PIPs
// ==========================================

router.get('/pips', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pips')
      .select('*, user:users!user_id(name, department, designation), manager:users!manager_id(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const pips = data.map(p => ({
      ...p,
      user_name: p.user?.name,
      department: p.user?.department,
      designation: p.user?.designation,
      manager_name: p.manager?.name,
      user: undefined,
      manager: undefined
    }));

    res.json(pips);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/pips/active', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pips')
      .select('*, user:users!user_id(name, department, designation), manager:users!manager_id(name)')
      .eq('status', 'active')
      .order('end_date', { ascending: true });

    if (error) throw error;

    const pips = data.map(p => ({
      ...p,
      user_name: p.user?.name,
      department: p.user?.department,
      designation: p.user?.designation,
      manager_name: p.manager?.name,
      user: undefined,
      manager: undefined
    }));

    res.json(pips);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/pips/my-pip', authenticateToken, async (req, res) => {
  try {
    const { data: pip, error } = await supabase
      .from('pips')
      .select('*, manager:users!manager_id(name)')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (pip) {
      const { data: checkpoints } = await supabase
        .from('pip_checkpoints')
        .select('*, reviewer:users!reviewed_by(name)')
        .eq('pip_id', pip.id)
        .order('checkpoint_date', { ascending: false });

      pip.checkpoints = (checkpoints || []).map(c => ({
        ...c,
        reviewed_by_name: c.reviewer?.name,
        reviewer: undefined
      }));
      pip.manager_name = pip.manager?.name;
      delete pip.manager;
    }

    res.json(pip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/pips/:id', authenticateToken, async (req, res) => {
  try {
    const { data: pip, error } = await supabase
      .from('pips')
      .select('*, user:users!user_id(name, email, department, designation), manager:users!manager_id(name)')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!pip) return res.status(404).json({ error: 'PIP not found' });

    const { data: checkpoints } = await supabase
      .from('pip_checkpoints')
      .select('*, reviewer:users!reviewed_by(name)')
      .eq('pip_id', pip.id)
      .order('checkpoint_date', { ascending: false });

    res.json({
      ...pip,
      user_name: pip.user?.name,
      user_email: pip.user?.email,
      department: pip.user?.department,
      designation: pip.user?.designation,
      manager_name: pip.manager?.name,
      checkpoints: (checkpoints || []).map(c => ({
        ...c,
        reviewed_by_name: c.reviewer?.name,
        reviewer: undefined
      })),
      user: undefined,
      manager: undefined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/pips', authenticateToken, async (req, res) => {
  try {
    const { user_id, start_date, end_date, reason, goals } = req.body;
    const id = `pip-${uuidv4()}`;

    const { data, error } = await supabase
      .from('pips')
      .insert({
        id,
        user_id,
        manager_id: req.user.id,
        start_date,
        end_date,
        reason,
        goals: JSON.stringify(goals || [])
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/pips/:id', authenticateToken, async (req, res) => {
  try {
    const { end_date, reason, goals, status, outcome } = req.body;

    const updateData = {};
    if (end_date !== undefined) updateData.end_date = end_date;
    if (reason !== undefined) updateData.reason = reason;
    if (goals !== undefined) updateData.goals = JSON.stringify(goals);
    if (status !== undefined) updateData.status = status;
    if (outcome !== undefined) updateData.outcome = outcome;

    const { data, error } = await supabase
      .from('pips')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/pips/:id/checkpoints', authenticateToken, async (req, res) => {
  try {
    const { checkpoint_date, progress_notes, rating } = req.body;
    const id = `pipc-${uuidv4()}`;

    const { data, error } = await supabase
      .from('pip_checkpoints')
      .insert({
        id,
        pip_id: req.params.id,
        checkpoint_date,
        progress_notes,
        rating,
        reviewed_by: req.user.id
      })
      .select('*, reviewer:users!reviewed_by(name)')
      .single();

    if (error) throw error;

    res.status(201).json({
      ...data,
      reviewed_by_name: data.reviewer?.name,
      reviewer: undefined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/pips/:id/checkpoints', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pip_checkpoints')
      .select('*, reviewer:users!reviewed_by(name)')
      .eq('pip_id', req.params.id)
      .order('checkpoint_date', { ascending: false });

    if (error) throw error;

    const checkpoints = data.map(c => ({
      ...c,
      reviewed_by_name: c.reviewer?.name,
      reviewer: undefined
    }));

    res.json(checkpoints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// RECOGNITIONS
// ==========================================

router.get('/recognitions', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('recognitions')
      .select('*, recipient:users!recipient_id(name, department), nominator:users!nominator_id(name)')
      .eq('is_public', 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const recognitions = data.map(r => ({
      ...r,
      recipient_name: r.recipient?.name,
      recipient_department: r.recipient?.department,
      nominator_name: r.nominator?.name,
      recipient: undefined,
      nominator: undefined
    }));

    res.json(recognitions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/recognitions/my-recognitions', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('recognitions')
      .select('*, nominator:users!nominator_id(name)')
      .eq('recipient_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const recognitions = data.map(r => ({
      ...r,
      nominator_name: r.nominator?.name,
      nominator: undefined
    }));

    res.json(recognitions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/recognitions', authenticateToken, async (req, res) => {
  try {
    const { recipient_id, type, badge, title, message, is_public } = req.body;
    const id = `rec-${uuidv4()}`;

    const { data, error } = await supabase
      .from('recognitions')
      .insert({
        id,
        recipient_id,
        nominator_id: req.user.id,
        type,
        badge,
        title,
        message,
        is_public: is_public !== false ? 1 : 0
      })
      .select('*, recipient:users!recipient_id(name, department), nominator:users!nominator_id(name)')
      .single();

    if (error) throw error;

    res.status(201).json({
      ...data,
      recipient_name: data.recipient?.name,
      recipient_department: data.recipient?.department,
      nominator_name: data.nominator?.name,
      recipient: undefined,
      nominator: undefined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/recognitions/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('recognitions')
      .delete()
      .eq('id', req.params.id)
      .eq('nominator_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Recognition deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// DASHBOARD
// ==========================================

router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const stats = {};

    // KPI stats
    const { data: kpis } = await supabase.from('kpis').select('status');
    stats.kpis = {
      total: kpis?.length || 0,
      achieved: kpis?.filter(k => k.status === 'achieved').length || 0,
      on_track: kpis?.filter(k => k.status === 'on_track').length || 0,
      at_risk: kpis?.filter(k => k.status === 'at_risk').length || 0,
      behind: kpis?.filter(k => k.status === 'behind').length || 0
    };

    // Active PIPs
    const { count: activePips } = await supabase
      .from('pips')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    stats.activePips = activePips || 0;

    // Recent recognitions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { count: recentRecs } = await supabase
      .from('recognitions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());
    stats.recentRecognitions = recentRecs || 0;

    // Goals stats
    const { data: goals } = await supabase
      .from('goals')
      .select('status, progress')
      .eq('status', 'active');
    stats.goals = {
      total: goals?.length || 0,
      completed: goals?.filter(g => g.status === 'completed').length || 0,
      avg_progress: goals?.length ? goals.reduce((a, g) => a + (g.progress || 0), 0) / goals.length : 0
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
