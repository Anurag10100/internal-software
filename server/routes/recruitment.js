const express = require('express');
const router = express.Router();
const { getSupabaseClient } = require('../config/supabase');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use((req, res, next) => {
  const supabase = getSupabaseClient();
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  req.supabase = supabase;
  next();
});

// ==========================================
// JOB POSTINGS
// ==========================================

router.get('/jobs', authenticateToken, async (req, res) => {
  try {
    const { status, department } = req.query;
    let q = req.supabase
      .from('job_postings')
      .select('*, posted_by_user:users!posted_by(name)')
      .order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    if (department) q = q.eq('department', department);
    const { data: jobs, error } = await q;
    if (error) throw error;
    const list = jobs || [];
    const jobIds = list.map((j) => j.id);
    const { data: candCounts } = jobIds.length ? await req.supabase.from('candidates').select('job_id').in('job_id', jobIds) : { data: [] };
    const countByJob = (candCounts || []).reduce((acc, r) => { acc[r.job_id] = (acc[r.job_id] || 0) + 1; return acc; }, {});
    const formatted = list.map((j) => ({
      ...j,
      posted_by_name: j.posted_by_user?.name,
      candidates_count: countByJob[j.id] || 0,
      posted_by_user: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

router.get('/jobs/public', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data: jobs, error } = await req.supabase
      .from('job_postings')
      .select('id, title, department, location, employment_type, experience_min, experience_max, description, requirements, responsibilities, benefits, is_remote, created_at')
      .eq('status', 'published')
      .or(`closing_date.is.null,closing_date.gte.${today}`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(jobs || []);
  } catch (error) {
    console.error('Error fetching public jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

router.get('/jobs/:id', authenticateToken, async (req, res) => {
  try {
    const { data: job, error } = await req.supabase
      .from('job_postings')
      .select('*, posted_by_user:users!posted_by(name)')
      .eq('id', req.params.id)
      .single();
    if (error || !job) {
      if (error?.code === 'PGRST116') return res.status(404).json({ error: 'Job not found' });
      throw error || new Error('Not found');
    }
    const { data: candidates } = await req.supabase.from('candidates').select('*').eq('job_id', req.params.id).order('created_at', { ascending: false });
    job.candidates = candidates || [];
    res.json({
      ...job,
      posted_by_name: job.posted_by_user?.name,
      posted_by_user: undefined,
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

router.post('/jobs', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, department, location, employment_type, experience_min, experience_max, salary_min, salary_max, description, requirements, responsibilities, benefits, skills_required, closing_date, positions_count, is_remote } = req.body;
    const id = `job-${uuidv4()}`;
    const { error } = await req.supabase.from('job_postings').insert({
      id, title, department, location, employment_type: employment_type || 'full_time', experience_min: experience_min || 0, experience_max, salary_min, salary_max, description, requirements, responsibilities, benefits, skills_required, posted_by: req.user.id, closing_date, positions_count: positions_count || 1, is_remote: is_remote ? 1 : 0,
    });
    if (error) throw error;
    const { data: job, error: e2 } = await req.supabase.from('job_postings').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

router.put('/jobs/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, department, location, employment_type, experience_min, experience_max, salary_min, salary_max, description, requirements, responsibilities, benefits, skills_required, status, closing_date, positions_count, is_remote } = req.body;
    let posted_at = null;
    if (status === 'published') {
      const { data: current } = await req.supabase.from('job_postings').select('status, posted_at').eq('id', req.params.id).single();
      posted_at = current && current.status !== 'published' ? new Date().toISOString() : (current?.posted_at ?? null);
    }
    const updates = { title, department, location, employment_type, experience_min, experience_max, salary_min, salary_max, description, requirements, responsibilities, benefits, skills_required, status, closing_date, positions_count, is_remote: is_remote ? 1 : 0 };
    if (posted_at != null) updates.posted_at = posted_at;
    const { error } = await req.supabase.from('job_postings').update(updates).eq('id', req.params.id);
    if (error) throw error;
    const { data: job, error: e2 } = await req.supabase.from('job_postings').select('*').eq('id', req.params.id).single();
    if (e2) throw e2;
    res.json(job);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

router.delete('/jobs/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await req.supabase.from('job_postings').delete().eq('id', req.params.id);
    res.json({ message: 'Job deleted' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// ==========================================
// CANDIDATES
// ==========================================

router.get('/candidates', authenticateToken, async (req, res) => {
  try {
    const { job_id, status, stage } = req.query;
    let q = req.supabase
      .from('candidates')
      .select('*, job:job_postings!job_id(title, department), referral_by_user:users!referral_by(name)')
      .order('created_at', { ascending: false });
    if (job_id) q = q.eq('job_id', job_id);
    if (status) q = q.eq('status', status);
    if (stage) q = q.eq('stage', stage);
    const { data: candidates, error } = await q;
    if (error) throw error;
    const formatted = (candidates || []).map((c) => ({
      ...c,
      job_title: c.job?.title,
      job_department: c.job?.department,
      referral_by_name: c.referral_by_user?.name,
      job: undefined,
      referral_by_user: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

router.get('/candidates/:id', authenticateToken, async (req, res) => {
  try {
    const { data: candidate, error } = await req.supabase
      .from('candidates')
      .select('*, job:job_postings!job_id(title, department), referral_by_user:users!referral_by(name)')
      .eq('id', req.params.id)
      .single();
    if (error || !candidate) {
      if (error?.code === 'PGRST116') return res.status(404).json({ error: 'Candidate not found' });
      throw error || new Error('Not found');
    }
    const { data: interviews } = await req.supabase.from('interviews').select('*').eq('candidate_id', req.params.id).order('scheduled_date', { ascending: false });
    const interviewIds = (interviews || []).map((i) => i.id);
    const { data: panelists } = interviewIds.length ? await req.supabase.from('interview_panelists').select('*, user:users!user_id(name)').in('interview_id', interviewIds) : { data: [] };
    const panelByInt = (panelists || []).reduce((acc, p) => { if (!acc[p.interview_id]) acc[p.interview_id] = []; acc[p.interview_id].push({ ...p, panelist_name: p.user?.name }); return acc; }, {});
    const { data: feedbackList } = interviewIds.length ? await req.supabase.from('interview_feedback').select('*, panelist:users!panelist_id(name)').in('interview_id', interviewIds) : { data: [] };
    const feedbackByInt = (feedbackList || []).reduce((acc, f) => { if (!acc[f.interview_id]) acc[f.interview_id] = []; acc[f.interview_id].push({ ...f, panelist_name: f.panelist?.name }); return acc; }, {});
    candidate.interviews = (interviews || []).map((i) => ({
      ...i,
      panelists: panelByInt[i.id] || [],
      panelists_names: (panelByInt[i.id] || []).map((p) => p.panelist_name).filter(Boolean).join(', '),
      feedback: (feedbackByInt[i.id] || []).map((f) => ({ ...f, panelist: undefined })),
    }));
    const { data: offer } = await req.supabase.from('offer_letters').select('*').eq('candidate_id', req.params.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    candidate.offer = offer;
    res.json({
      ...candidate,
      job_title: candidate.job?.title,
      job_department: candidate.job?.department,
      referral_by_name: candidate.referral_by_user?.name,
      job: undefined,
      referral_by_user: undefined,
    });
  } catch (error) {
    console.error('Error fetching candidate:', error);
    res.status(500).json({ error: 'Failed to fetch candidate' });
  }
});

router.post('/candidates', async (req, res) => {
  try {
    const { job_id, first_name, last_name, email, phone, current_company, current_designation, experience_years, expected_salary, notice_period, resume_url, cover_letter, linkedin_url, portfolio_url, source, referral_by, skills } = req.body;
    const id = `cand-${uuidv4()}`;
    const { error } = await req.supabase.from('candidates').insert({
      id, job_id, first_name, last_name, email, phone, current_company, current_designation, experience_years, expected_salary, notice_period, resume_url, cover_letter, linkedin_url, portfolio_url, source: source || 'website', referral_by, skills,
    });
    if (error) throw error;
    const { data: candidate, error: e2 } = await req.supabase.from('candidates').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(candidate);
  } catch (error) {
    console.error('Error creating candidate:', error);
    res.status(500).json({ error: 'Failed to create candidate' });
  }
});

router.put('/candidates/:id', authenticateToken, async (req, res) => {
  try {
    const { status, stage, rating, notes } = req.body;
    const updates = {};
    if (status != null) updates.status = status;
    if (stage != null) updates.stage = stage;
    if (rating != null) updates.rating = rating;
    if (notes != null) updates.notes = notes;
    if (Object.keys(updates).length === 0) {
      const { data: c } = await req.supabase.from('candidates').select('*').eq('id', req.params.id).single();
      return res.json(c);
    }
    const { error } = await req.supabase.from('candidates').update(updates).eq('id', req.params.id);
    if (error) throw error;
    const { data: candidate, error: e2 } = await req.supabase.from('candidates').select('*').eq('id', req.params.id).single();
    if (e2) throw e2;
    res.json(candidate);
  } catch (error) {
    console.error('Error updating candidate:', error);
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

router.post('/candidates/:id/move-stage', authenticateToken, async (req, res) => {
  try {
    const { stage } = req.body;
    const stages = ['applied', 'screening', 'interview', 'technical', 'hr', 'offer', 'hired', 'rejected'];
    if (!stages.includes(stage)) return res.status(400).json({ error: 'Invalid stage' });
    const status = stage === 'rejected' ? 'rejected' : stage === 'hired' ? 'hired' : 'in_process';
    const { error } = await req.supabase.from('candidates').update({ stage, status }).eq('id', req.params.id);
    if (error) throw error;
    const { data: candidate, error: e2 } = await req.supabase.from('candidates').select('*').eq('id', req.params.id).single();
    if (e2) throw e2;
    res.json(candidate);
  } catch (error) {
    console.error('Error moving candidate:', error);
    res.status(500).json({ error: 'Failed to move candidate' });
  }
});

// ==========================================
// INTERVIEWS
// ==========================================

router.get('/interviews', authenticateToken, async (req, res) => {
  try {
    const { date, status } = req.query;
    let q = req.supabase
      .from('interviews')
      .select('*, candidate:candidates!candidate_id(first_name, last_name, email), job:job_postings!job_id(title, department)')
      .order('scheduled_date', { ascending: false })
      .order('scheduled_time');
    if (date) q = q.eq('scheduled_date', date);
    if (status) q = q.eq('status', status);
    const { data: interviews, error } = await q;
    if (error) throw error;
    const list = interviews || [];
    const intIds = list.map((i) => i.id);
    const { data: panelists } = intIds.length ? await req.supabase.from('interview_panelists').select('*, user:users!user_id(name, email)').in('interview_id', intIds) : { data: [] };
    const panelByInt = (panelists || []).reduce((acc, p) => { if (!acc[p.interview_id]) acc[p.interview_id] = []; acc[p.interview_id].push({ ...p, panelist_name: p.user?.name, panelist_email: p.user?.email, user: undefined }); return acc; }, {});
    const formatted = list.map((i) => ({
      ...i,
      candidate_name: i.candidate ? `${i.candidate.first_name || ''} ${i.candidate.last_name || ''}`.trim() : null,
      candidate_email: i.candidate?.email,
      job_title: i.job?.title,
      department: i.job?.department,
      panelists: panelByInt[i.id] || [],
      candidate: undefined,
      job: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching interviews:', error);
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

router.get('/interviews/my-interviews', authenticateToken, async (req, res) => {
  try {
    const { data: panelists, error: pe } = await req.supabase.from('interview_panelists').select('interview_id').eq('user_id', req.user.id);
    if (pe) throw pe;
    const intIds = [...new Set((panelists?.data || []).map((p) => p.interview_id))];
    if (!intIds.length) return res.json([]);
    const { data: interviews, error } = await req.supabase
      .from('interviews')
      .select('*, candidate:candidates!candidate_id(first_name, last_name, email, resume_url), job:job_postings!job_id(title, department)')
      .in('id', intIds)
      .eq('status', 'scheduled')
      .order('scheduled_date')
      .order('scheduled_time');
    if (error) throw error;
    const formatted = (interviews || []).map((i) => ({
      ...i,
      candidate_name: i.candidate ? `${i.candidate.first_name || ''} ${i.candidate.last_name || ''}`.trim() : null,
      candidate_email: i.candidate?.email,
      resume_url: i.candidate?.resume_url,
      job_title: i.job?.title,
      department: i.job?.department,
      candidate: undefined,
      job: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching interviews:', error);
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

router.post('/interviews', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { candidate_id, job_id, round_number, round_type, scheduled_date, scheduled_time, duration_minutes, location, meeting_link, panelist_ids } = req.body;
    const id = `int-${uuidv4()}`;
    const { error } = await req.supabase.from('interviews').insert({
      id, candidate_id, job_id, round_number: round_number || 1, round_type: round_type || 'technical', scheduled_date, scheduled_time, duration_minutes: duration_minutes || 60, location, meeting_link,
    });
    if (error) throw error;
    if (panelist_ids?.length) {
      const rows = panelist_ids.map((userId, index) => ({ id: `ip-${uuidv4()}`, interview_id: id, user_id: userId, is_lead: index === 0 ? 1 : 0 }));
      await req.supabase.from('interview_panelists').insert(rows);
    }
    await req.supabase.from('candidates').update({ stage: 'interview' }).eq('id', candidate_id).or('stage.eq.applied,stage.eq.screening');
    const { data: interview, error: e2 } = await req.supabase
      .from('interviews')
      .select('*, candidate:candidates!candidate_id(first_name, last_name)')
      .eq('id', id)
      .single();
    if (e2) throw e2;
    const out = { ...interview, candidate_name: interview.candidate ? `${interview.candidate.first_name || ''} ${interview.candidate.last_name || ''}`.trim() : null, candidate: undefined };
    res.status(201).json(out);
  } catch (error) {
    console.error('Error creating interview:', error);
    res.status(500).json({ error: 'Failed to create interview' });
  }
});

router.put('/interviews/:id', authenticateToken, async (req, res) => {
  try {
    const { scheduled_date, scheduled_time, duration_minutes, location, meeting_link, status } = req.body;
    const updates = {};
    if (scheduled_date != null) updates.scheduled_date = scheduled_date;
    if (scheduled_time != null) updates.scheduled_time = scheduled_time;
    if (duration_minutes != null) updates.duration_minutes = duration_minutes;
    if (location != null) updates.location = location;
    if (meeting_link != null) updates.meeting_link = meeting_link;
    if (status != null) updates.status = status;
    if (Object.keys(updates).length === 0) {
      const { data: i } = await req.supabase.from('interviews').select('*').eq('id', req.params.id).single();
      return res.json(i);
    }
    const { error } = await req.supabase.from('interviews').update(updates).eq('id', req.params.id);
    if (error) throw error;
    const { data: interview, error: e2 } = await req.supabase.from('interviews').select('*').eq('id', req.params.id).single();
    if (e2) throw e2;
    res.json(interview);
  } catch (error) {
    console.error('Error updating interview:', error);
    res.status(500).json({ error: 'Failed to update interview' });
  }
});

router.post('/interviews/:id/feedback', authenticateToken, async (req, res) => {
  try {
    const { technical_rating, communication_rating, cultural_fit_rating, overall_rating, strengths, weaknesses, recommendation, notes } = req.body;
    const { data: panelist } = await req.supabase.from('interview_panelists').select('id').eq('interview_id', req.params.id).eq('user_id', req.user.id).maybeSingle();
    if (!panelist && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized to submit feedback' });
    const { data: existing } = await req.supabase.from('interview_feedback').select('id').eq('interview_id', req.params.id).eq('panelist_id', req.user.id).maybeSingle();
    const payload = { technical_rating, communication_rating, cultural_fit_rating, overall_rating, strengths, weaknesses, recommendation, notes, submitted_at: new Date().toISOString() };
    if (existing) {
      await req.supabase.from('interview_feedback').update(payload).eq('id', existing.id);
    } else {
      await req.supabase.from('interview_feedback').insert({ id: `fb-${uuidv4()}`, interview_id: req.params.id, panelist_id: req.user.id, ...payload });
    }
    const { data: panelists } = await req.supabase.from('interview_panelists').select('id').eq('interview_id', req.params.id);
    const { data: feedbacks } = await req.supabase.from('interview_feedback').select('id').eq('interview_id', req.params.id);
    if ((feedbacks || []).length >= (panelists || []).length) {
      await req.supabase.from('interviews').update({ status: 'completed' }).eq('id', req.params.id);
    }
    res.json({ message: 'Feedback submitted' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// ==========================================
// OFFER LETTERS
// ==========================================

router.get('/offers', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { data: offers, error } = await req.supabase
      .from('offer_letters')
      .select('*, candidate:candidates!candidate_id(first_name, last_name, email), job:job_postings!job_id(title, department), created_by_user:users!created_by(name), approved_by_user:users!approved_by(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const formatted = (offers || []).map((o) => ({
      ...o,
      candidate_name: o.candidate ? `${o.candidate.first_name || ''} ${o.candidate.last_name || ''}`.trim() : null,
      candidate_email: o.candidate?.email,
      job_title: o.job?.title,
      department: o.job?.department,
      created_by_name: o.created_by_user?.name,
      approved_by_name: o.approved_by_user?.name,
      candidate: undefined,
      job: undefined,
      created_by_user: undefined,
      approved_by_user: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

router.post('/offers', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { candidate_id, job_id, offered_salary, joining_date, offer_expiry_date, probation_period_months, notice_period_days, benefits, special_conditions } = req.body;
    const id = `offer-${uuidv4()}`;
    const { error } = await req.supabase.from('offer_letters').insert({
      id, candidate_id, job_id, offered_salary, joining_date, offer_expiry_date, probation_period_months: probation_period_months || 3, notice_period_days: notice_period_days || 30, benefits, special_conditions, created_by: req.user.id,
    });
    if (error) throw error;
    await req.supabase.from('candidates').update({ stage: 'offer' }).eq('id', candidate_id);
    const { data: offer, error: e2 } = await req.supabase.from('offer_letters').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(offer);
  } catch (error) {
    console.error('Error creating offer:', error);
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

router.put('/offers/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status, rejection_reason } = req.body;
    const { data: offer, error: fe } = await req.supabase.from('offer_letters').select('*').eq('id', req.params.id).single();
    if (fe || !offer) return res.status(404).json({ error: 'Offer not found' });
    const updates = { status };
    if (status === 'sent') updates.sent_at = new Date().toISOString();
    if (status === 'accepted') {
      updates.accepted_at = new Date().toISOString();
      await req.supabase.from('candidates').update({ stage: 'hired', status: 'hired' }).eq('id', offer.candidate_id);
      const { data: job } = await req.supabase.from('job_postings').select('positions_filled').eq('id', offer.job_id).single();
      await req.supabase.from('job_postings').update({ positions_filled: (job?.positions_filled || 0) + 1 }).eq('id', offer.job_id);
    }
    if (status === 'rejected') updates.rejected_at = new Date().toISOString(), updates.rejection_reason = rejection_reason;
    if (status === 'approved') updates.approved_by = req.user.id, updates.approved_at = new Date().toISOString();
    const { error } = await req.supabase.from('offer_letters').update(updates).eq('id', req.params.id);
    if (error) throw error;
    const { data: updatedOffer, error: e2 } = await req.supabase.from('offer_letters').select('*').eq('id', req.params.id).single();
    if (e2) throw e2;
    res.json(updatedOffer);
  } catch (error) {
    console.error('Error updating offer:', error);
    res.status(500).json({ error: 'Failed to update offer' });
  }
});

// ==========================================
// ONBOARDING
// ==========================================

router.get('/onboarding/templates', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { data: templates, error } = await req.supabase.from('onboarding_templates').select('*').eq('is_active', 1).order('name');
    if (error) throw error;
    const list = templates || [];
    for (const t of list) {
      const { data: tasks } = await req.supabase.from('onboarding_template_tasks').select('*').eq('template_id', t.id).order('order_index');
      t.tasks = tasks || [];
      t.tasks_count = (tasks || []).length;
    }
    res.json(list);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

router.get('/onboarding', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { data: onboardings, error } = await req.supabase
      .from('employee_onboarding')
      .select('*, user:users!user_id(name, email, department, designation), template:onboarding_templates!template_id(name)')
      .order('start_date', { ascending: false });
    if (error) throw error;
    const list = onboardings || [];
    for (const o of list) {
      const { data: tasks } = await req.supabase.from('onboarding_tasks').select('*').eq('onboarding_id', o.id);
      const completed = (tasks || []).filter((t) => t.status === 'completed').length;
      o.user_name = o.user?.name;
      o.email = o.user?.email;
      o.department = o.user?.department;
      o.designation = o.user?.designation;
      o.template_name = o.template?.name;
      o.completed_tasks = completed;
      o.total_tasks = (tasks || []).length;
      o.user = undefined;
      o.template = undefined;
    }
    res.json(list);
  } catch (error) {
    console.error('Error fetching onboarding:', error);
    res.status(500).json({ error: 'Failed to fetch onboarding' });
  }
});

router.get('/onboarding/my-onboarding', authenticateToken, async (req, res) => {
  try {
    const { data: onboarding, error } = await req.supabase
      .from('employee_onboarding')
      .select('*, template:onboarding_templates!template_id(name)')
      .eq('user_id', req.user.id)
      .eq('status', 'in_progress')
      .maybeSingle();
    if (error) throw error;
    if (!onboarding) return res.json(null);
    onboarding.template_name = onboarding.template?.name;
    onboarding.template = undefined;
    const { data: tasks } = await req.supabase
      .from('onboarding_tasks')
      .select('*, assigned_to_user:users!assigned_to(name), completed_by_user:users!completed_by(name)')
      .eq('onboarding_id', onboarding.id)
      .order('due_date');
    onboarding.tasks = (tasks || []).map((t) => ({
      ...t,
      assigned_to_name: t.assigned_to_user?.name,
      completed_by_name: t.completed_by_user?.name,
      assigned_to_user: undefined,
      completed_by_user: undefined,
    }));
    res.json(onboarding);
  } catch (error) {
    console.error('Error fetching onboarding:', error);
    res.status(500).json({ error: 'Failed to fetch onboarding' });
  }
});

router.post('/onboarding', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { user_id, template_id, start_date } = req.body;
    const { data: templateTasks, error: te } = await req.supabase.from('onboarding_template_tasks').select('*').eq('template_id', template_id).order('order_index');
    if (te) throw te;
    const id = `onb-${uuidv4()}`;
    const targetDate = new Date(start_date);
    targetDate.setDate(targetDate.getDate() + 30);
    const { error } = await req.supabase.from('employee_onboarding').insert({
      id, user_id, template_id, start_date, target_completion_date: targetDate.toISOString().slice(0, 10),
    });
    if (error) throw error;
    const tasks = (templateTasks || []).map((task) => {
      const dueDate = new Date(start_date);
      dueDate.setDate(dueDate.getDate() + (task.due_days_after_joining || 0));
      return {
        id: `obt-${uuidv4()}`,
        onboarding_id: id,
        template_task_id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        due_date: dueDate.toISOString().slice(0, 10),
      };
    });
    if (tasks.length) await req.supabase.from('onboarding_tasks').insert(tasks);
    const { data: onboarding, error: e2 } = await req.supabase.from('employee_onboarding').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(onboarding);
  } catch (error) {
    console.error('Error starting onboarding:', error);
    res.status(500).json({ error: 'Failed to start onboarding' });
  }
});

router.post('/onboarding/tasks/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { notes } = req.body;
    const { error } = await req.supabase.from('onboarding_tasks').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: req.user.id,
      notes,
    }).eq('id', req.params.id);
    if (error) throw error;
    const { data: task } = await req.supabase.from('onboarding_tasks').select('onboarding_id').eq('id', req.params.id).single();
    if (task) {
      const { data: pending } = await req.supabase.from('onboarding_tasks').select('id').eq('onboarding_id', task.onboarding_id).neq('status', 'completed');
      if (!(pending || []).length) {
        await req.supabase.from('employee_onboarding').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', task.onboarding_id);
      }
    }
    res.json({ message: 'Task completed' });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

// ==========================================
// RECRUITMENT DASHBOARD
// ==========================================

router.get('/dashboard', authenticateToken, isAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthAgoStr = monthAgo.toISOString().slice(0, 10);
    const thirtyAgo = new Date();
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    const thirtyAgoStr = thirtyAgo.toISOString().slice(0, 10);
    const ninetyAgo = new Date();
    ninetyAgo.setDate(ninetyAgo.getDate() - 90);
    const ninetyAgoStr = ninetyAgo.toISOString().slice(0, 10);
    const [openPositionsRes, totalCandidatesRes, interviewsRes, pendingOffersRes, hiredRes, candidatesList, sourceList, onboardingRes] = await Promise.all([
      req.supabase.from('job_postings').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      req.supabase.from('candidates').select('*', { count: 'exact', head: true }).gte('created_at', thirtyAgoStr),
      req.supabase.from('interviews').select('*', { count: 'exact', head: true }).gte('scheduled_date', today).lte('scheduled_date', weekEndStr).eq('status', 'scheduled'),
      req.supabase.from('offer_letters').select('*', { count: 'exact', head: true }).in('status', ['draft', 'sent']),
      req.supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('status', 'hired').gte('created_at', monthStart),
      req.supabase.from('candidates').select('stage').not('status', 'in', '("hired","rejected")'),
      req.supabase.from('candidates').select('source').gte('created_at', ninetyAgoStr),
      req.supabase.from('employee_onboarding').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
    ]);
    const stageCounts = (candidatesList.data || []).reduce((acc, c) => { acc[c.stage] = (acc[c.stage] || 0) + 1; return acc; }, {});
    const candidatesByStage = Object.entries(stageCounts).map(([stage, count]) => ({ stage, count }));
    const sourceCounts = (sourceList.data || []).reduce((acc, c) => { acc[c.source] = (acc[c.source] || 0) + 1; return acc; }, {});
    const sourceBreakdown = Object.entries(sourceCounts).map(([source, count]) => ({ source, count }));
    res.json({
      openPositions: openPositionsRes.count ?? 0,
      totalCandidates: totalCandidatesRes.count ?? 0,
      interviewsThisWeek: interviewsRes.count ?? 0,
      pendingOffers: pendingOffersRes.count ?? 0,
      hiredThisMonth: hiredRes.count ?? 0,
      candidatesByStage,
      sourceBreakdown,
      activeOnboarding: onboardingRes.count ?? 0,
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
