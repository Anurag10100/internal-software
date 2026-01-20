const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// ==========================================
// JOB POSTINGS
// ==========================================

// Get all job postings
router.get('/jobs', authenticateToken, (req, res) => {
  try {
    const { status, department } = req.query;
    let query = `
      SELECT jp.*, u.name as posted_by_name,
             (SELECT COUNT(*) FROM candidates WHERE job_id = jp.id) as applicants_count
      FROM job_postings jp
      LEFT JOIN users u ON jp.posted_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND jp.status = ?';
      params.push(status);
    }
    if (department) {
      query += ' AND jp.department = ?';
      params.push(department);
    }

    query += ' ORDER BY jp.created_at DESC';

    const jobs = db.prepare(query).all(...params);
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get public job postings (for careers page)
router.get('/jobs/public', (req, res) => {
  try {
    const jobs = db.prepare(`
      SELECT id, title, department, location, employment_type, experience_min, experience_max,
             description, requirements, responsibilities, benefits, is_remote, created_at
      FROM job_postings
      WHERE status = 'published' AND (closing_date IS NULL OR closing_date >= date('now'))
      ORDER BY created_at DESC
    `).all();
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching public jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get single job posting
router.get('/jobs/:id', authenticateToken, (req, res) => {
  try {
    const job = db.prepare(`
      SELECT jp.*, u.name as posted_by_name
      FROM job_postings jp
      LEFT JOIN users u ON jp.posted_by = u.id
      WHERE jp.id = ?
    `).get(req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get candidates for this job
    const candidates = db.prepare(`
      SELECT * FROM candidates WHERE job_id = ? ORDER BY created_at DESC
    `).all(req.params.id);

    job.candidates = candidates;
    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// Create job posting
router.post('/jobs', authenticateToken, isAdmin, (req, res) => {
  try {
    const { title, department, location, employment_type, experience_min, experience_max, salary_min, salary_max, description, requirements, responsibilities, benefits, skills_required, closing_date, positions_count, is_remote } = req.body;

    const id = `job-${uuidv4()}`;
    db.prepare(`
      INSERT INTO job_postings (id, title, department, location, employment_type, experience_min, experience_max, salary_min, salary_max, description, requirements, responsibilities, benefits, skills_required, posted_by, closing_date, positions_count, is_remote)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, department, location, employment_type || 'full_time', experience_min || 0, experience_max, salary_min, salary_max, description, requirements, responsibilities, benefits, skills_required, req.user.id, closing_date, positions_count || 1, is_remote ? 1 : 0);

    const job = db.prepare('SELECT * FROM job_postings WHERE id = ?').get(id);
    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Update job posting
router.put('/jobs/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { title, department, location, employment_type, experience_min, experience_max, salary_min, salary_max, description, requirements, responsibilities, benefits, skills_required, status, closing_date, positions_count, is_remote } = req.body;

    let posted_at = null;
    if (status === 'published') {
      const current = db.prepare('SELECT status, posted_at FROM job_postings WHERE id = ?').get(req.params.id);
      posted_at = current.status !== 'published' ? new Date().toISOString() : current.posted_at;
    }

    db.prepare(`
      UPDATE job_postings SET title = ?, department = ?, location = ?, employment_type = ?, experience_min = ?, experience_max = ?, salary_min = ?, salary_max = ?, description = ?, requirements = ?, responsibilities = ?, benefits = ?, skills_required = ?, status = ?, closing_date = ?, positions_count = ?, is_remote = ?, posted_at = COALESCE(?, posted_at)
      WHERE id = ?
    `).run(title, department, location, employment_type, experience_min, experience_max, salary_min, salary_max, description, requirements, responsibilities, benefits, skills_required, status, closing_date, positions_count, is_remote ? 1 : 0, posted_at, req.params.id);

    const job = db.prepare('SELECT * FROM job_postings WHERE id = ?').get(req.params.id);
    res.json(job);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Delete job posting
router.delete('/jobs/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM job_postings WHERE id = ?').run(req.params.id);
    res.json({ message: 'Job deleted' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// ==========================================
// CANDIDATES
// ==========================================

// Get all candidates
router.get('/candidates', authenticateToken, (req, res) => {
  try {
    const { job_id, status, stage } = req.query;
    let query = `
      SELECT c.*, jp.title as job_title, jp.department as job_department,
             r.name as referral_by_name
      FROM candidates c
      LEFT JOIN job_postings jp ON c.job_id = jp.id
      LEFT JOIN users r ON c.referral_by = r.id
      WHERE 1=1
    `;
    const params = [];

    if (job_id) {
      query += ' AND c.job_id = ?';
      params.push(job_id);
    }
    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }
    if (stage) {
      query += ' AND c.stage = ?';
      params.push(stage);
    }

    query += ' ORDER BY c.created_at DESC';

    const candidates = db.prepare(query).all(...params);
    res.json(candidates);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// Get single candidate
router.get('/candidates/:id', authenticateToken, (req, res) => {
  try {
    const candidate = db.prepare(`
      SELECT c.*, jp.title as job_title, jp.department as job_department,
             r.name as referral_by_name
      FROM candidates c
      LEFT JOIN job_postings jp ON c.job_id = jp.id
      LEFT JOIN users r ON c.referral_by = r.id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Get interviews
    const interviews = db.prepare(`
      SELECT i.*,
             GROUP_CONCAT(u.name) as panelists_names
      FROM interviews i
      LEFT JOIN interview_panelists ip ON i.id = ip.interview_id
      LEFT JOIN users u ON ip.user_id = u.id
      WHERE i.candidate_id = ?
      GROUP BY i.id
      ORDER BY i.scheduled_date DESC
    `).all(req.params.id);

    // Get feedback for each interview
    for (const interview of interviews) {
      interview.feedback = db.prepare(`
        SELECT f.*, u.name as panelist_name
        FROM interview_feedback f
        JOIN users u ON f.panelist_id = u.id
        WHERE f.interview_id = ?
      `).all(interview.id);
    }

    candidate.interviews = interviews;

    // Get offer if exists
    const offer = db.prepare(`
      SELECT * FROM offer_letters WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(req.params.id);
    candidate.offer = offer;

    res.json(candidate);
  } catch (error) {
    console.error('Error fetching candidate:', error);
    res.status(500).json({ error: 'Failed to fetch candidate' });
  }
});

// Create candidate (apply for job)
router.post('/candidates', (req, res) => {
  try {
    const { job_id, first_name, last_name, email, phone, current_company, current_designation, experience_years, expected_salary, notice_period, resume_url, cover_letter, linkedin_url, portfolio_url, source, referral_by, skills } = req.body;

    const id = `cand-${uuidv4()}`;
    db.prepare(`
      INSERT INTO candidates (id, job_id, first_name, last_name, email, phone, current_company, current_designation, experience_years, expected_salary, notice_period, resume_url, cover_letter, linkedin_url, portfolio_url, source, referral_by, skills)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, job_id, first_name, last_name, email, phone, current_company, current_designation, experience_years, expected_salary, notice_period, resume_url, cover_letter, linkedin_url, portfolio_url, source || 'website', referral_by, skills);

    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);
    res.status(201).json(candidate);
  } catch (error) {
    console.error('Error creating candidate:', error);
    res.status(500).json({ error: 'Failed to create candidate' });
  }
});

// Update candidate
router.put('/candidates/:id', authenticateToken, (req, res) => {
  try {
    const { status, stage, rating, notes } = req.body;

    db.prepare(`
      UPDATE candidates SET status = COALESCE(?, status), stage = COALESCE(?, stage), rating = COALESCE(?, rating), notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(status, stage, rating, notes, req.params.id);

    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
    res.json(candidate);
  } catch (error) {
    console.error('Error updating candidate:', error);
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

// Move candidate to next stage
router.post('/candidates/:id/move-stage', authenticateToken, (req, res) => {
  try {
    const { stage } = req.body;
    const stages = ['applied', 'screening', 'interview', 'technical', 'hr', 'offer', 'hired', 'rejected'];

    if (!stages.includes(stage)) {
      return res.status(400).json({ error: 'Invalid stage' });
    }

    db.prepare(`
      UPDATE candidates SET stage = ?, status = CASE WHEN ? = 'rejected' THEN 'rejected' WHEN ? = 'hired' THEN 'hired' ELSE 'in_process' END
      WHERE id = ?
    `).run(stage, stage, stage, req.params.id);

    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
    res.json(candidate);
  } catch (error) {
    console.error('Error moving candidate:', error);
    res.status(500).json({ error: 'Failed to move candidate' });
  }
});

// ==========================================
// INTERVIEWS
// ==========================================

// Get all interviews
router.get('/interviews', authenticateToken, (req, res) => {
  try {
    const { date, status } = req.query;
    let query = `
      SELECT i.*, c.first_name || ' ' || c.last_name as candidate_name, c.email as candidate_email,
             jp.title as job_title, jp.department
      FROM interviews i
      JOIN candidates c ON i.candidate_id = c.id
      JOIN job_postings jp ON i.job_id = jp.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ' AND i.scheduled_date = ?';
      params.push(date);
    }
    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }

    query += ' ORDER BY i.scheduled_date DESC, i.scheduled_time';

    const interviews = db.prepare(query).all(...params);

    // Get panelists for each interview
    for (const interview of interviews) {
      interview.panelists = db.prepare(`
        SELECT ip.*, u.name as panelist_name, u.email as panelist_email
        FROM interview_panelists ip
        JOIN users u ON ip.user_id = u.id
        WHERE ip.interview_id = ?
      `).all(interview.id);
    }

    res.json(interviews);
  } catch (error) {
    console.error('Error fetching interviews:', error);
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

// Get my interviews (as panelist)
router.get('/interviews/my-interviews', authenticateToken, (req, res) => {
  try {
    const interviews = db.prepare(`
      SELECT i.*, c.first_name || ' ' || c.last_name as candidate_name, c.email as candidate_email,
             c.resume_url, jp.title as job_title, jp.department
      FROM interviews i
      JOIN candidates c ON i.candidate_id = c.id
      JOIN job_postings jp ON i.job_id = jp.id
      JOIN interview_panelists ip ON i.id = ip.interview_id
      WHERE ip.user_id = ? AND i.status = 'scheduled'
      ORDER BY i.scheduled_date, i.scheduled_time
    `).all(req.user.id);

    res.json(interviews);
  } catch (error) {
    console.error('Error fetching interviews:', error);
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

// Schedule interview
router.post('/interviews', authenticateToken, isAdmin, (req, res) => {
  try {
    const { candidate_id, job_id, round_number, round_type, scheduled_date, scheduled_time, duration_minutes, location, meeting_link, panelist_ids } = req.body;

    const id = `int-${uuidv4()}`;
    db.prepare(`
      INSERT INTO interviews (id, candidate_id, job_id, round_number, round_type, scheduled_date, scheduled_time, duration_minutes, location, meeting_link)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, candidate_id, job_id, round_number || 1, round_type || 'technical', scheduled_date, scheduled_time, duration_minutes || 60, location, meeting_link);

    // Add panelists
    if (panelist_ids && panelist_ids.length > 0) {
      const insertPanelist = db.prepare(`
        INSERT INTO interview_panelists (id, interview_id, user_id, is_lead) VALUES (?, ?, ?, ?)
      `);
      panelist_ids.forEach((userId, index) => {
        insertPanelist.run(`ip-${uuidv4()}`, id, userId, index === 0 ? 1 : 0);
      });
    }

    // Update candidate stage
    db.prepare(`
      UPDATE candidates SET stage = CASE WHEN stage = 'screening' OR stage = 'applied' THEN 'interview' ELSE stage END
      WHERE id = ?
    `).run(candidate_id);

    const interview = db.prepare(`
      SELECT i.*, c.first_name || ' ' || c.last_name as candidate_name
      FROM interviews i
      JOIN candidates c ON i.candidate_id = c.id
      WHERE i.id = ?
    `).get(id);

    res.status(201).json(interview);
  } catch (error) {
    console.error('Error creating interview:', error);
    res.status(500).json({ error: 'Failed to create interview' });
  }
});

// Update interview
router.put('/interviews/:id', authenticateToken, (req, res) => {
  try {
    const { scheduled_date, scheduled_time, duration_minutes, location, meeting_link, status } = req.body;

    db.prepare(`
      UPDATE interviews SET scheduled_date = COALESCE(?, scheduled_date), scheduled_time = COALESCE(?, scheduled_time), duration_minutes = COALESCE(?, duration_minutes), location = COALESCE(?, location), meeting_link = COALESCE(?, meeting_link), status = COALESCE(?, status)
      WHERE id = ?
    `).run(scheduled_date, scheduled_time, duration_minutes, location, meeting_link, status, req.params.id);

    const interview = db.prepare('SELECT * FROM interviews WHERE id = ?').get(req.params.id);
    res.json(interview);
  } catch (error) {
    console.error('Error updating interview:', error);
    res.status(500).json({ error: 'Failed to update interview' });
  }
});

// Submit interview feedback
router.post('/interviews/:id/feedback', authenticateToken, (req, res) => {
  try {
    const { technical_rating, communication_rating, cultural_fit_rating, overall_rating, strengths, weaknesses, recommendation, notes } = req.body;

    // Check if user is a panelist
    const panelist = db.prepare(`
      SELECT id FROM interview_panelists WHERE interview_id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!panelist && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to submit feedback' });
    }

    // Check if feedback already exists
    const existing = db.prepare(`
      SELECT id FROM interview_feedback WHERE interview_id = ? AND panelist_id = ?
    `).get(req.params.id, req.user.id);

    if (existing) {
      db.prepare(`
        UPDATE interview_feedback SET technical_rating = ?, communication_rating = ?, cultural_fit_rating = ?, overall_rating = ?, strengths = ?, weaknesses = ?, recommendation = ?, notes = ?, submitted_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(technical_rating, communication_rating, cultural_fit_rating, overall_rating, strengths, weaknesses, recommendation, notes, existing.id);
    } else {
      const id = `fb-${uuidv4()}`;
      db.prepare(`
        INSERT INTO interview_feedback (id, interview_id, panelist_id, technical_rating, communication_rating, cultural_fit_rating, overall_rating, strengths, weaknesses, recommendation, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, req.params.id, req.user.id, technical_rating, communication_rating, cultural_fit_rating, overall_rating, strengths, weaknesses, recommendation, notes);
    }

    // Check if all panelists have submitted feedback
    const interview = db.prepare('SELECT * FROM interviews WHERE id = ?').get(req.params.id);
    const totalPanelists = db.prepare('SELECT COUNT(*) as count FROM interview_panelists WHERE interview_id = ?').get(req.params.id).count;
    const submittedFeedback = db.prepare('SELECT COUNT(*) as count FROM interview_feedback WHERE interview_id = ?').get(req.params.id).count;

    if (submittedFeedback >= totalPanelists) {
      db.prepare('UPDATE interviews SET status = ? WHERE id = ?').run('completed', req.params.id);
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

// Get all offers
router.get('/offers', authenticateToken, isAdmin, (req, res) => {
  try {
    const offers = db.prepare(`
      SELECT o.*, c.first_name || ' ' || c.last_name as candidate_name, c.email as candidate_email,
             jp.title as job_title, jp.department,
             cr.name as created_by_name, ap.name as approved_by_name
      FROM offer_letters o
      JOIN candidates c ON o.candidate_id = c.id
      JOIN job_postings jp ON o.job_id = jp.id
      LEFT JOIN users cr ON o.created_by = cr.id
      LEFT JOIN users ap ON o.approved_by = ap.id
      ORDER BY o.created_at DESC
    `).all();
    res.json(offers);
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// Create offer
router.post('/offers', authenticateToken, isAdmin, (req, res) => {
  try {
    const { candidate_id, job_id, offered_salary, joining_date, offer_expiry_date, probation_period_months, notice_period_days, benefits, special_conditions } = req.body;

    const id = `offer-${uuidv4()}`;
    db.prepare(`
      INSERT INTO offer_letters (id, candidate_id, job_id, offered_salary, joining_date, offer_expiry_date, probation_period_months, notice_period_days, benefits, special_conditions, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, candidate_id, job_id, offered_salary, joining_date, offer_expiry_date, probation_period_months || 3, notice_period_days || 30, benefits, special_conditions, req.user.id);

    // Update candidate stage
    db.prepare(`UPDATE candidates SET stage = 'offer' WHERE id = ?`).run(candidate_id);

    const offer = db.prepare('SELECT * FROM offer_letters WHERE id = ?').get(id);
    res.status(201).json(offer);
  } catch (error) {
    console.error('Error creating offer:', error);
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

// Update offer status
router.put('/offers/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { status, rejection_reason } = req.body;
    const offer = db.prepare('SELECT * FROM offer_letters WHERE id = ?').get(req.params.id);

    let updateFields = 'status = ?';
    const params = [status];

    if (status === 'sent') {
      updateFields += ', sent_at = CURRENT_TIMESTAMP';
    } else if (status === 'accepted') {
      updateFields += ', accepted_at = CURRENT_TIMESTAMP';
      // Update candidate to hired
      db.prepare(`UPDATE candidates SET stage = 'hired', status = 'hired' WHERE id = ?`).run(offer.candidate_id);
      // Update job positions filled
      db.prepare(`UPDATE job_postings SET positions_filled = positions_filled + 1 WHERE id = ?`).run(offer.job_id);
    } else if (status === 'rejected') {
      updateFields += ', rejected_at = CURRENT_TIMESTAMP, rejection_reason = ?';
      params.push(rejection_reason);
    } else if (status === 'approved') {
      updateFields += ', approved_by = ?, approved_at = CURRENT_TIMESTAMP';
      params.push(req.user.id);
    }

    params.push(req.params.id);

    db.prepare(`UPDATE offer_letters SET ${updateFields} WHERE id = ?`).run(...params);

    const updatedOffer = db.prepare('SELECT * FROM offer_letters WHERE id = ?').get(req.params.id);
    res.json(updatedOffer);
  } catch (error) {
    console.error('Error updating offer:', error);
    res.status(500).json({ error: 'Failed to update offer' });
  }
});

// ==========================================
// ONBOARDING
// ==========================================

// Get onboarding templates
router.get('/onboarding/templates', authenticateToken, isAdmin, (req, res) => {
  try {
    const templates = db.prepare(`
      SELECT ot.*,
             (SELECT COUNT(*) FROM onboarding_template_tasks WHERE template_id = ot.id) as tasks_count
      FROM onboarding_templates ot
      WHERE ot.is_active = 1
      ORDER BY ot.name
    `).all();

    for (const template of templates) {
      template.tasks = db.prepare(`
        SELECT * FROM onboarding_template_tasks WHERE template_id = ? ORDER BY order_index
      `).all(template.id);
    }

    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get active onboarding processes
router.get('/onboarding', authenticateToken, isAdmin, (req, res) => {
  try {
    const onboardings = db.prepare(`
      SELECT eo.*, u.name as user_name, u.email, u.department, u.designation,
             ot.name as template_name,
             (SELECT COUNT(*) FROM onboarding_tasks WHERE onboarding_id = eo.id AND status = 'completed') as completed_tasks,
             (SELECT COUNT(*) FROM onboarding_tasks WHERE onboarding_id = eo.id) as total_tasks
      FROM employee_onboarding eo
      JOIN users u ON eo.user_id = u.id
      LEFT JOIN onboarding_templates ot ON eo.template_id = ot.id
      ORDER BY eo.start_date DESC
    `).all();
    res.json(onboardings);
  } catch (error) {
    console.error('Error fetching onboarding:', error);
    res.status(500).json({ error: 'Failed to fetch onboarding' });
  }
});

// Get my onboarding
router.get('/onboarding/my-onboarding', authenticateToken, (req, res) => {
  try {
    const onboarding = db.prepare(`
      SELECT eo.*, ot.name as template_name
      FROM employee_onboarding eo
      LEFT JOIN onboarding_templates ot ON eo.template_id = ot.id
      WHERE eo.user_id = ? AND eo.status = 'in_progress'
    `).get(req.user.id);

    if (onboarding) {
      onboarding.tasks = db.prepare(`
        SELECT ot.*, u.name as assigned_to_name, cu.name as completed_by_name
        FROM onboarding_tasks ot
        LEFT JOIN users u ON ot.assigned_to = u.id
        LEFT JOIN users cu ON ot.completed_by = cu.id
        WHERE ot.onboarding_id = ?
        ORDER BY ot.due_date, ot.id
      `).all(onboarding.id);
    }

    res.json(onboarding);
  } catch (error) {
    console.error('Error fetching onboarding:', error);
    res.status(500).json({ error: 'Failed to fetch onboarding' });
  }
});

// Start onboarding for new employee
router.post('/onboarding', authenticateToken, isAdmin, (req, res) => {
  try {
    const { user_id, template_id, start_date } = req.body;

    // Get template tasks
    const templateTasks = db.prepare(`
      SELECT * FROM onboarding_template_tasks WHERE template_id = ? ORDER BY order_index
    `).all(template_id);

    const onboardingId = `onb-${uuidv4()}`;
    const targetDate = new Date(start_date);
    targetDate.setDate(targetDate.getDate() + 30);

    db.prepare(`
      INSERT INTO employee_onboarding (id, user_id, template_id, start_date, target_completion_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(onboardingId, user_id, template_id, start_date, targetDate.toISOString().split('T')[0]);

    // Create onboarding tasks from template
    const insertTask = db.prepare(`
      INSERT INTO onboarding_tasks (id, onboarding_id, template_task_id, title, description, category, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const task of templateTasks) {
      const dueDate = new Date(start_date);
      dueDate.setDate(dueDate.getDate() + (task.due_days_after_joining || 0));

      insertTask.run(
        `obt-${uuidv4()}`,
        onboardingId,
        task.id,
        task.title,
        task.description,
        task.category,
        dueDate.toISOString().split('T')[0]
      );
    }

    const onboarding = db.prepare('SELECT * FROM employee_onboarding WHERE id = ?').get(onboardingId);
    res.status(201).json(onboarding);
  } catch (error) {
    console.error('Error starting onboarding:', error);
    res.status(500).json({ error: 'Failed to start onboarding' });
  }
});

// Complete onboarding task
router.post('/onboarding/tasks/:id/complete', authenticateToken, (req, res) => {
  try {
    const { notes } = req.body;

    db.prepare(`
      UPDATE onboarding_tasks SET status = 'completed', completed_at = CURRENT_TIMESTAMP, completed_by = ?, notes = ?
      WHERE id = ?
    `).run(req.user.id, notes, req.params.id);

    // Check if all tasks are completed
    const task = db.prepare('SELECT onboarding_id FROM onboarding_tasks WHERE id = ?').get(req.params.id);
    const pendingTasks = db.prepare(`
      SELECT COUNT(*) as count FROM onboarding_tasks WHERE onboarding_id = ? AND status != 'completed'
    `).get(task.onboarding_id);

    if (pendingTasks.count === 0) {
      db.prepare(`
        UPDATE employee_onboarding SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(task.onboarding_id);
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

router.get('/dashboard', authenticateToken, isAdmin, (req, res) => {
  try {
    const stats = {
      openPositions: db.prepare(`
        SELECT COUNT(*) as count FROM job_postings WHERE status = 'published'
      `).get().count,
      totalCandidates: db.prepare(`
        SELECT COUNT(*) as count FROM candidates WHERE created_at >= date('now', '-30 days')
      `).get().count,
      interviewsThisWeek: db.prepare(`
        SELECT COUNT(*) as count FROM interviews
        WHERE scheduled_date BETWEEN date('now') AND date('now', '+7 days')
        AND status = 'scheduled'
      `).get().count,
      pendingOffers: db.prepare(`
        SELECT COUNT(*) as count FROM offer_letters WHERE status IN ('draft', 'sent')
      `).get().count,
      hiredThisMonth: db.prepare(`
        SELECT COUNT(*) as count FROM candidates
        WHERE status = 'hired' AND created_at >= date('now', 'start of month')
      `).get().count,
      candidatesByStage: db.prepare(`
        SELECT stage, COUNT(*) as count FROM candidates
        WHERE status NOT IN ('hired', 'rejected')
        GROUP BY stage
      `).all(),
      sourceBreakdown: db.prepare(`
        SELECT source, COUNT(*) as count FROM candidates
        WHERE created_at >= date('now', '-90 days')
        GROUP BY source
      `).all(),
      activeOnboarding: db.prepare(`
        SELECT COUNT(*) as count FROM employee_onboarding WHERE status = 'in_progress'
      `).get().count
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
