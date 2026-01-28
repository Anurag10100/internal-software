const express = require('express');
const router = express.Router();
const { getSupabaseClient } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use((req, res, next) => {
  const supabase = getSupabaseClient();
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  req.supabase = supabase;
  next();
});

// Get all probations (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: probations, error } = await req.supabase
      .from('probations')
      .select('*, user:users!user_id(name, email, department, designation), confirmed_by_user:users!confirmed_by(name)')
      .order('end_date', { ascending: true });

    if (error) throw error;

    const formatted = (probations || []).map(p => ({
      ...p,
      user_name: p.user?.name,
      user_email: p.user?.email,
      department: p.user?.department,
      designation: p.user?.designation,
      confirmed_by_name: p.confirmed_by_user?.name,
      user: undefined,
      confirmed_by_user: undefined,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active probations
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const { data: probations, error } = await req.supabase
      .from('probations')
      .select('*, user:users!user_id(name, email, department, designation)')
      .eq('status', 'ongoing')
      .order('end_date', { ascending: true });

    if (error) throw error;

    const formatted = (probations || []).map(p => ({
      ...p,
      user_name: p.user?.name,
      user_email: p.user?.email,
      department: p.user?.department,
      designation: p.user?.designation,
      user: undefined,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user's probation
router.get('/my-probation', authenticateToken, async (req, res) => {
  try {
    const { data: probations, error } = await req.supabase
      .from('probations')
      .select('*, user:users!user_id(name, email, department, designation)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    const probation = probations?.[0];
    if (!probation) return res.json(null);

    const formatted = {
      ...probation,
      user_name: probation.user?.name,
      user_email: probation.user?.email,
      department: probation.user?.department,
      designation: probation.user?.designation,
      user: undefined,
    };

    const { data: checklists } = await req.supabase
      .from('probation_checklists')
      .select('*')
      .eq('probation_id', probation.id);
    formatted.checklists = checklists || [];

    const { data: reviews } = await req.supabase
      .from('probation_reviews')
      .select('*, reviewer:users!reviewer_id(name)')
      .eq('probation_id', probation.id)
      .order('review_date', { ascending: false });
    formatted.reviews = (reviews || []).map(r => ({
      ...r,
      reviewer_name: r.reviewer?.name,
      reviewer: undefined,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get probation by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data: probation, error } = await req.supabase
      .from('probations')
      .select('*, user:users!user_id(name, email, department, designation), confirmed_by_user:users!confirmed_by(name)')
      .eq('id', req.params.id)
      .single();

    if (error || !probation) {
      return res.status(404).json({ error: 'Probation not found' });
    }

    const formatted = {
      ...probation,
      user_name: probation.user?.name,
      user_email: probation.user?.email,
      department: probation.user?.department,
      designation: probation.user?.designation,
      confirmed_by_name: probation.confirmed_by_user?.name,
      user: undefined,
      confirmed_by_user: undefined,
    };

    const { data: checklists } = await req.supabase
      .from('probation_checklists')
      .select('*')
      .eq('probation_id', probation.id);
    formatted.checklists = checklists || [];

    const { data: reviews } = await req.supabase
      .from('probation_reviews')
      .select('*, reviewer:users!reviewer_id(name)')
      .eq('probation_id', probation.id)
      .order('review_date', { ascending: false });
    formatted.reviews = (reviews || []).map(r => ({
      ...r,
      reviewer_name: r.reviewer?.name,
      reviewer: undefined,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create probation
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { user_id, start_date, end_date, duration_days, notes } = req.body;
    const id = `prob-${uuidv4()}`;

    const { error: insertError } = await req.supabase
      .from('probations')
      .insert({
        id,
        user_id,
        start_date,
        end_date,
        duration_days: duration_days || 90,
        notes: notes || '',
      });

    if (insertError) throw insertError;

    const defaultItems = [
      'Complete onboarding documentation',
      'Set up workstation and tools',
      'Complete department training',
      'First assignment/project',
      '30-day review',
      '60-day review',
      '90-day review',
    ];

    for (const item of defaultItems) {
      await req.supabase.from('probation_checklists').insert({
        id: `pc-${uuidv4()}`,
        probation_id: id,
        item,
      });
    }

    await req.supabase.from('team_members').update({ in_probation: 1 }).eq('user_id', user_id);

    const { data: probation } = await req.supabase.from('probations').select('*').eq('id', id).single();
    res.status(201).json(probation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update probation (extend, confirm, terminate)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { status, extended_till, extension_reason, notes, confirmed_by, confirmed_at } = req.body;

    const { data: probation, error: findError } = await req.supabase
      .from('probations')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (findError || !probation) {
      return res.status(404).json({ error: 'Probation not found' });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (extended_till) {
      updateData.extended_till = extended_till;
      updateData.end_date = extended_till;
    }
    if (extension_reason) updateData.extension_reason = extension_reason;
    if (notes !== undefined) updateData.notes = notes;
    if (confirmed_by) updateData.confirmed_by = confirmed_by;
    if (confirmed_at) updateData.confirmed_at = confirmed_at;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const { error: updateError } = await req.supabase
      .from('probations')
      .update(updateData)
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    if (status === 'confirmed' || status === 'terminated') {
      await req.supabase.from('team_members').update({ in_probation: 0 }).eq('user_id', probation.user_id);
    }

    const { data: updated } = await req.supabase.from('probations').select('*').eq('id', req.params.id).single();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add probation review
router.post('/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const { milestone, rating, feedback, recommendation } = req.body;

    const { data: probation, error: findError } = await req.supabase
      .from('probations')
      .select('id')
      .eq('id', req.params.id)
      .single();

    if (findError || !probation) {
      return res.status(404).json({ error: 'Probation not found' });
    }

    const id = `pr-${uuidv4()}`;
    const review_date = new Date().toISOString().split('T')[0];

    const { error: insertError } = await req.supabase.from('probation_reviews').insert({
      id,
      probation_id: req.params.id,
      reviewer_id: req.user.id,
      review_date,
      milestone,
      rating,
      feedback,
      recommendation,
    });

    if (insertError) throw insertError;

    const { data: review } = await req.supabase
      .from('probation_reviews')
      .select('*, reviewer:users!reviewer_id(name)')
      .eq('id', id)
      .single();

    const formatted = review ? { ...review, reviewer_name: review.reviewer?.name, reviewer: undefined } : review;
    res.status(201).json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get probation reviews
router.get('/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const { data: reviews, error } = await req.supabase
      .from('probation_reviews')
      .select('*, reviewer:users!reviewer_id(name)')
      .eq('probation_id', req.params.id)
      .order('review_date', { ascending: false });

    if (error) throw error;

    const formatted = (reviews || []).map(r => ({
      ...r,
      reviewer_name: r.reviewer?.name,
      reviewer: undefined,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update checklist item
router.put('/:id/checklist/:checklistId', authenticateToken, async (req, res) => {
  try {
    const { is_completed } = req.body;

    const { error } = await req.supabase
      .from('probation_checklists')
      .update({
        is_completed: is_completed ? 1 : 0,
        completed_at: is_completed ? new Date().toISOString() : null,
        completed_by: is_completed ? req.user.id : null,
      })
      .eq('id', req.params.checklistId);

    if (error) throw error;

    const { data: checklist } = await req.supabase
      .from('probation_checklists')
      .select('*')
      .eq('id', req.params.checklistId)
      .single();

    res.json(checklist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get checklists for probation
router.get('/:id/checklist', authenticateToken, async (req, res) => {
  try {
    const { data: checklists, error } = await req.supabase
      .from('probation_checklists')
      .select('*')
      .eq('probation_id', req.params.id);

    if (error) throw error;
    res.json(checklists || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add custom checklist item
router.post('/:id/checklist', authenticateToken, async (req, res) => {
  try {
    const { item } = req.body;
    const id = `pc-${uuidv4()}`;

    const { error } = await req.supabase.from('probation_checklists').insert({
      id,
      probation_id: req.params.id,
      item,
    });

    if (error) throw error;

    const { data: checklist } = await req.supabase
      .from('probation_checklists')
      .select('*')
      .eq('id', id)
      .single();

    res.status(201).json(checklist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
