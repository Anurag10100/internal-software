const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ==========================================
// APPRAISAL CYCLES
// ==========================================

// Get all cycles
router.get('/cycles', authenticateToken, async (req, res) => {
  try {
    const { data: cycles, error } = await supabase
      .from('appraisal_cycles')
      .select('*, creator:users!created_by(name)')
      .order('start_date', { ascending: false });

    if (error) throw error;

    const formatted = cycles.map(c => ({
      ...c,
      created_by_name: c.creator?.name
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create cycle
router.post('/cycles', authenticateToken, async (req, res) => {
  try {
    const { name, type, start_date, end_date } = req.body;
    const id = `cycle-${uuidv4()}`;

    const { data: cycle, error } = await supabase
      .from('appraisal_cycles')
      .insert({ id, name, type, start_date, end_date, created_by: req.user.id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(cycle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update cycle
router.put('/cycles/:id', authenticateToken, async (req, res) => {
  try {
    const { name, type, start_date, end_date, status } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (status !== undefined) updateData.status = status;

    const { data: cycle, error } = await supabase
      .from('appraisal_cycles')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(cycle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Activate cycle and create appraisals for all employees
router.post('/cycles/:id/activate', authenticateToken, async (req, res) => {
  try {
    const { data: cycle } = await supabase
      .from('appraisal_cycles')
      .select()
      .eq('id', req.params.id)
      .single();

    if (!cycle) {
      return res.status(404).json({ error: 'Cycle not found' });
    }

    await supabase
      .from('appraisal_cycles')
      .update({ status: 'active' })
      .eq('id', req.params.id);

    const { data: employees } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'employee');

    const { data: admin } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    for (const emp of employees || []) {
      const appraisalId = `appr-${uuidv4()}`;
      await supabase
        .from('appraisals')
        .insert({
          id: appraisalId,
          cycle_id: req.params.id,
          employee_id: emp.id,
          manager_id: admin.id,
          status: 'pending'
        });
    }

    res.json({ message: 'Cycle activated', appraisalsCreated: employees?.length || 0 });
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
    const { data: appraisals, error } = await supabase
      .from('appraisals')
      .select(`
        *,
        employee:users!employee_id(name, email, department, designation),
        manager:users!manager_id(name),
        cycle:appraisal_cycles!cycle_id(name, type)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = appraisals.map(a => ({
      ...a,
      employee_name: a.employee?.name,
      employee_email: a.employee?.email,
      department: a.employee?.department,
      designation: a.employee?.designation,
      manager_name: a.manager?.name,
      cycle_name: a.cycle?.name,
      cycle_type: a.cycle?.type
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my appraisals
router.get('/my-appraisals', authenticateToken, async (req, res) => {
  try {
    const { data: appraisals, error } = await supabase
      .from('appraisals')
      .select(`
        *,
        employee:users!employee_id(name, email, department, designation),
        manager:users!manager_id(name),
        cycle:appraisal_cycles!cycle_id(name, type)
      `)
      .eq('employee_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = appraisals.map(a => ({
      ...a,
      employee_name: a.employee?.name,
      employee_email: a.employee?.email,
      department: a.employee?.department,
      designation: a.employee?.designation,
      manager_name: a.manager?.name,
      cycle_name: a.cycle?.name,
      cycle_type: a.cycle?.type
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get appraisals to review (as manager)
router.get('/to-review', authenticateToken, async (req, res) => {
  try {
    const { data: appraisals, error } = await supabase
      .from('appraisals')
      .select(`
        *,
        employee:users!employee_id(name, email, department, designation),
        cycle:appraisal_cycles!cycle_id(name, type)
      `)
      .eq('manager_id', req.user.id)
      .in('status', ['pending', 'self_review'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = appraisals.map(a => ({
      ...a,
      employee_name: a.employee?.name,
      employee_email: a.employee?.email,
      department: a.employee?.department,
      designation: a.employee?.designation,
      cycle_name: a.cycle?.name,
      cycle_type: a.cycle?.type
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single appraisal
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data: appraisal, error } = await supabase
      .from('appraisals')
      .select(`
        *,
        employee:users!employee_id(name, email, department, designation),
        manager:users!manager_id(name),
        cycle:appraisal_cycles!cycle_id(name, type, start_date, end_date)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !appraisal) {
      return res.status(404).json({ error: 'Appraisal not found' });
    }

    const { data: goals } = await supabase
      .from('goals')
      .select()
      .or(`appraisal_id.eq.${req.params.id},and(user_id.eq.${appraisal.employee_id},appraisal_id.is.null)`);

    const { data: feedback } = await supabase
      .from('feedback_360')
      .select('*, reviewer:users!reviewer_id(name)')
      .eq('appraisal_id', req.params.id);

    const formatted = {
      ...appraisal,
      employee_name: appraisal.employee?.name,
      employee_email: appraisal.employee?.email,
      department: appraisal.employee?.department,
      designation: appraisal.employee?.designation,
      manager_name: appraisal.manager?.name,
      cycle_name: appraisal.cycle?.name,
      cycle_type: appraisal.cycle?.type,
      cycle_start: appraisal.cycle?.start_date,
      cycle_end: appraisal.cycle?.end_date,
      goals: goals || [],
      feedback_360: (feedback || []).map(f => ({
        ...f,
        reviewer_name: f.reviewer?.name
      }))
    };

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit self-review
router.post('/:id/self-review', authenticateToken, async (req, res) => {
  try {
    const { self_rating, self_comments } = req.body;

    const { data: appraisal, error } = await supabase
      .from('appraisals')
      .update({
        self_rating,
        self_comments,
        status: 'self_review',
        submitted_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('employee_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(appraisal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit manager review
router.post('/:id/manager-review', authenticateToken, async (req, res) => {
  try {
    const { manager_rating, manager_comments, final_rating } = req.body;

    const { data: appraisal, error } = await supabase
      .from('appraisals')
      .update({
        manager_rating,
        manager_comments,
        final_rating,
        status: 'completed',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('manager_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
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
    const { data: goals, error } = await supabase
      .from('goals')
      .select('*, user:users!user_id(name, department)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = goals.map(g => ({
      ...g,
      user_name: g.user?.name,
      department: g.user?.department
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my goals
router.get('/goals/my-goals', authenticateToken, async (req, res) => {
  try {
    const { data: goals, error } = await supabase
      .from('goals')
      .select()
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
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

    const { data: goal, error } = await supabase
      .from('goals')
      .insert({
        id,
        user_id: user_id || req.user.id,
        appraisal_id: appraisal_id || null,
        title,
        description,
        category,
        target_date,
        weightage: weightage || 0
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update goal
router.put('/goals/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, target_date, weightage, progress, status, self_rating, manager_rating } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (target_date !== undefined) updateData.target_date = target_date;
    if (weightage !== undefined) updateData.weightage = weightage;
    if (progress !== undefined) updateData.progress = progress;
    if (status !== undefined) updateData.status = status;
    if (self_rating !== undefined) updateData.self_rating = self_rating;
    if (manager_rating !== undefined) updateData.manager_rating = manager_rating;

    const { data: goal, error } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete goal
router.delete('/goals/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
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
    const { data: feedback, error } = await supabase
      .from('feedback_360')
      .select('*, reviewer:users!reviewer_id(name)')
      .eq('appraisal_id', req.params.id);

    if (error) throw error;

    const formatted = feedback.map(f => ({
      ...f,
      reviewer_name: f.reviewer?.name
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit 360 feedback
router.post('/:id/feedback', authenticateToken, async (req, res) => {
  try {
    const { reviewer_type, rating, strengths, improvements, comments, is_anonymous } = req.body;
    const id = `fb-${uuidv4()}`;

    const { data: feedback, error } = await supabase
      .from('feedback_360')
      .insert({
        id,
        appraisal_id: req.params.id,
        reviewer_id: req.user.id,
        reviewer_type,
        rating,
        strengths,
        improvements,
        comments,
        is_anonymous: is_anonymous ? 1 : 0,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(feedback);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
