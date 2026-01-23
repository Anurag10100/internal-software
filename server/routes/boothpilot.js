const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'wow-events-secret-key-2026';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ==========================================
// MIDDLEWARE
// ==========================================

function authenticateBoothPilot(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    // Verify this is a BoothPilot user
    if (!user.exhibitorId) {
      return res.status(403).json({ error: 'Invalid BoothPilot token' });
    }
    req.user = user;
    next();
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
    }
    next();
  };
}

// ==========================================
// AUTHENTICATION
// ==========================================

// Login
router.post('/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare(`
      SELECT u.*, e.company_name, e.event_name
      FROM bp_users u
      JOIN bp_exhibitors e ON u.exhibitor_id = e.id
      WHERE u.email = ? AND u.is_active = 1
    `).get(email.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    db.prepare('UPDATE bp_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        exhibitorId: user.exhibitor_id,
        companyName: user.company_name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        exhibitorId: user.exhibitor_id,
        companyName: user.company_name,
        eventName: user.event_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/auth/me', authenticateBoothPilot, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT u.*, e.company_name, e.event_name, e.booth_number, e.event_start_date, e.event_end_date
      FROM bp_users u
      JOIN bp_exhibitors e ON u.exhibitor_id = e.id
      WHERE u.id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
      exhibitorId: user.exhibitor_id,
      companyName: user.company_name,
      eventName: user.event_name,
      boothNumber: user.booth_number,
      eventStartDate: user.event_start_date,
      eventEndDate: user.event_end_date
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// LEADS CRUD
// ==========================================

// Create lead
router.post('/leads', authenticateBoothPilot, (req, res) => {
  try {
    const {
      fullName,
      companyName,
      designation,
      email,
      phone,
      industry,
      interestTag,
      notes,
      captureSource = 'manual',
      badgeScanData
    } = req.body;

    if (!fullName) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO bp_leads (id, exhibitor_id, captured_by_user_id, full_name, company_name, designation, email, phone, industry, interest_tag, notes, capture_source, badge_scan_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      req.user.exhibitorId,
      req.user.id,
      fullName,
      companyName || null,
      designation || null,
      email || null,
      phone || null,
      industry || null,
      interestTag || null,
      notes || null,
      captureSource,
      badgeScanData || null
    );

    // Log activity
    db.prepare(`
      INSERT INTO bp_lead_activities (id, lead_id, user_id, activity_type, description)
      VALUES (?, ?, ?, 'created', 'Lead captured')
    `).run(uuidv4(), id, req.user.id);

    const lead = db.prepare('SELECT * FROM bp_leads WHERE id = ?').get(id);

    res.status(201).json({
      id: lead.id,
      fullName: lead.full_name,
      companyName: lead.company_name,
      designation: lead.designation,
      email: lead.email,
      phone: lead.phone,
      industry: lead.industry,
      interestTag: lead.interest_tag,
      notes: lead.notes,
      captureSource: lead.capture_source,
      status: lead.status,
      createdAt: lead.created_at
    });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all leads (with filters)
router.get('/leads', authenticateBoothPilot, (req, res) => {
  try {
    const { label, status, search, capturedBy, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT
        l.*,
        u.name as captured_by_name,
        s.score,
        s.label,
        s.next_best_action
      FROM bp_leads l
      LEFT JOIN bp_users u ON l.captured_by_user_id = u.id
      LEFT JOIN bp_lead_scores s ON l.id = s.lead_id
      WHERE l.exhibitor_id = ?
    `;
    const params = [req.user.exhibitorId];

    if (label) {
      query += ' AND s.label = ?';
      params.push(label.toUpperCase());
    }

    if (status) {
      query += ' AND l.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (l.full_name LIKE ? OR l.company_name LIKE ? OR l.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (capturedBy) {
      query += ' AND l.captured_by_user_id = ?';
      params.push(capturedBy);
    }

    query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const leads = db.prepare(query).all(...params);

    const formattedLeads = leads.map(lead => ({
      id: lead.id,
      fullName: lead.full_name,
      companyName: lead.company_name,
      designation: lead.designation,
      email: lead.email,
      phone: lead.phone,
      industry: lead.industry,
      interestTag: lead.interest_tag,
      notes: lead.notes,
      captureSource: lead.capture_source,
      status: lead.status,
      capturedBy: {
        id: lead.captured_by_user_id,
        name: lead.captured_by_name
      },
      score: lead.score,
      label: lead.label,
      nextBestAction: lead.next_best_action,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at
    }));

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM bp_leads l LEFT JOIN bp_lead_scores s ON l.id = s.lead_id WHERE l.exhibitor_id = ?';
    const countParams = [req.user.exhibitorId];
    if (label) {
      countQuery += ' AND s.label = ?';
      countParams.push(label.toUpperCase());
    }
    if (status) {
      countQuery += ' AND l.status = ?';
      countParams.push(status);
    }
    const { count } = db.prepare(countQuery).get(...countParams);

    res.json({
      leads: formattedLeads,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single lead
router.get('/leads/:id', authenticateBoothPilot, (req, res) => {
  try {
    const lead = db.prepare(`
      SELECT
        l.*,
        u.name as captured_by_name,
        s.id as score_id,
        s.score,
        s.label,
        s.reasons_json,
        s.risk_flags_json,
        s.next_best_action,
        s.recommended_message_angle,
        s.scored_at
      FROM bp_leads l
      LEFT JOIN bp_users u ON l.captured_by_user_id = u.id
      LEFT JOIN bp_lead_scores s ON l.id = s.lead_id
      WHERE l.id = ? AND l.exhibitor_id = ?
    `).get(req.params.id, req.user.exhibitorId);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Get qualification answers
    const answers = db.prepare(`
      SELECT a.*, q.question_text, q.question_type
      FROM bp_qualification_answers a
      JOIN bp_qualification_questions q ON a.question_id = q.id
      WHERE a.lead_id = ?
      ORDER BY q.order_index
    `).all(req.params.id);

    // Get follow-ups
    const followups = db.prepare(`
      SELECT f.*, u.name as generated_by_name
      FROM bp_followups f
      LEFT JOIN bp_users u ON f.generated_by_user_id = u.id
      WHERE f.lead_id = ?
      ORDER BY f.created_at DESC
    `).all(req.params.id);

    // Get activities
    const activities = db.prepare(`
      SELECT a.*, u.name as user_name
      FROM bp_lead_activities a
      JOIN bp_users u ON a.user_id = u.id
      WHERE a.lead_id = ?
      ORDER BY a.created_at DESC
      LIMIT 20
    `).all(req.params.id);

    res.json({
      id: lead.id,
      fullName: lead.full_name,
      companyName: lead.company_name,
      designation: lead.designation,
      email: lead.email,
      phone: lead.phone,
      industry: lead.industry,
      interestTag: lead.interest_tag,
      notes: lead.notes,
      captureSource: lead.capture_source,
      status: lead.status,
      capturedBy: {
        id: lead.captured_by_user_id,
        name: lead.captured_by_name
      },
      scoring: lead.score_id ? {
        score: lead.score,
        label: lead.label,
        reasons: JSON.parse(lead.reasons_json || '[]'),
        riskFlags: JSON.parse(lead.risk_flags_json || '[]'),
        nextBestAction: lead.next_best_action,
        recommendedMessageAngle: lead.recommended_message_angle,
        scoredAt: lead.scored_at
      } : null,
      qualificationAnswers: answers.map(a => ({
        questionId: a.question_id,
        questionText: a.question_text,
        questionType: a.question_type,
        answer: a.answer_text
      })),
      followups: followups.map(f => ({
        id: f.id,
        channel: f.channel,
        subject: f.subject,
        message: f.message_text,
        status: f.status,
        generatedBy: f.generated_by_name,
        sentAt: f.sent_at,
        createdAt: f.created_at
      })),
      activities: activities.map(a => ({
        id: a.id,
        type: a.activity_type,
        description: a.description,
        userName: a.user_name,
        createdAt: a.created_at
      })),
      createdAt: lead.created_at,
      updatedAt: lead.updated_at
    });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update lead
router.patch('/leads/:id', authenticateBoothPilot, (req, res) => {
  try {
    const lead = db.prepare('SELECT * FROM bp_leads WHERE id = ? AND exhibitor_id = ?')
      .get(req.params.id, req.user.exhibitorId);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const {
      fullName,
      companyName,
      designation,
      email,
      phone,
      industry,
      interestTag,
      notes,
      status
    } = req.body;

    db.prepare(`
      UPDATE bp_leads SET
        full_name = COALESCE(?, full_name),
        company_name = COALESCE(?, company_name),
        designation = COALESCE(?, designation),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        industry = COALESCE(?, industry),
        interest_tag = COALESCE(?, interest_tag),
        notes = COALESCE(?, notes),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(fullName, companyName, designation, email, phone, industry, interestTag, notes, status, req.params.id);

    // Log activity
    db.prepare(`
      INSERT INTO bp_lead_activities (id, lead_id, user_id, activity_type, description)
      VALUES (?, ?, ?, 'updated', 'Lead information updated')
    `).run(uuidv4(), req.params.id, req.user.id);

    const updatedLead = db.prepare('SELECT * FROM bp_leads WHERE id = ?').get(req.params.id);

    res.json({
      id: updatedLead.id,
      fullName: updatedLead.full_name,
      companyName: updatedLead.company_name,
      designation: updatedLead.designation,
      email: updatedLead.email,
      phone: updatedLead.phone,
      industry: updatedLead.industry,
      interestTag: updatedLead.interest_tag,
      notes: updatedLead.notes,
      status: updatedLead.status,
      updatedAt: updatedLead.updated_at
    });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete lead (admin only)
router.delete('/leads/:id', authenticateBoothPilot, requireRole('admin'), (req, res) => {
  try {
    const lead = db.prepare('SELECT * FROM bp_leads WHERE id = ? AND exhibitor_id = ?')
      .get(req.params.id, req.user.exhibitorId);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Delete related data first
    db.prepare('DELETE FROM bp_lead_activities WHERE lead_id = ?').run(req.params.id);
    db.prepare('DELETE FROM bp_followups WHERE lead_id = ?').run(req.params.id);
    db.prepare('DELETE FROM bp_lead_scores WHERE lead_id = ?').run(req.params.id);
    db.prepare('DELETE FROM bp_qualification_answers WHERE lead_id = ?').run(req.params.id);
    db.prepare('DELETE FROM bp_leads WHERE id = ?').run(req.params.id);

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// QUALIFICATION QUESTIONS
// ==========================================

// Get questions
router.get('/questions', authenticateBoothPilot, (req, res) => {
  try {
    const questions = db.prepare(`
      SELECT * FROM bp_qualification_questions
      WHERE exhibitor_id = ? AND is_active = 1
      ORDER BY order_index
    `).all(req.user.exhibitorId);

    res.json(questions.map(q => ({
      id: q.id,
      questionText: q.question_text,
      questionType: q.question_type,
      options: JSON.parse(q.options_json || '[]'),
      orderIndex: q.order_index,
      isRequired: q.is_required === 1
    })));
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create question (admin only)
router.post('/questions', authenticateBoothPilot, requireRole('admin'), (req, res) => {
  try {
    const { questionText, questionType = 'text', options = [], orderIndex = 0, isRequired = false } = req.body;

    if (!questionText) {
      return res.status(400).json({ error: 'Question text is required' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO bp_qualification_questions (id, exhibitor_id, question_text, question_type, options_json, order_index, is_required)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.exhibitorId, questionText, questionType, JSON.stringify(options), orderIndex, isRequired ? 1 : 0);

    res.status(201).json({
      id,
      questionText,
      questionType,
      options,
      orderIndex,
      isRequired
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update question (admin only)
router.patch('/questions/:id', authenticateBoothPilot, requireRole('admin'), (req, res) => {
  try {
    const question = db.prepare('SELECT * FROM bp_qualification_questions WHERE id = ? AND exhibitor_id = ?')
      .get(req.params.id, req.user.exhibitorId);

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const { questionText, questionType, options, orderIndex, isRequired, isActive } = req.body;

    db.prepare(`
      UPDATE bp_qualification_questions SET
        question_text = COALESCE(?, question_text),
        question_type = COALESCE(?, question_type),
        options_json = COALESCE(?, options_json),
        order_index = COALESCE(?, order_index),
        is_required = COALESCE(?, is_required),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      questionText,
      questionType,
      options ? JSON.stringify(options) : null,
      orderIndex,
      isRequired !== undefined ? (isRequired ? 1 : 0) : null,
      isActive !== undefined ? (isActive ? 1 : 0) : null,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM bp_qualification_questions WHERE id = ?').get(req.params.id);

    res.json({
      id: updated.id,
      questionText: updated.question_text,
      questionType: updated.question_type,
      options: JSON.parse(updated.options_json || '[]'),
      orderIndex: updated.order_index,
      isRequired: updated.is_required === 1,
      isActive: updated.is_active === 1
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete question (admin only)
router.delete('/questions/:id', authenticateBoothPilot, requireRole('admin'), (req, res) => {
  try {
    const question = db.prepare('SELECT * FROM bp_qualification_questions WHERE id = ? AND exhibitor_id = ?')
      .get(req.params.id, req.user.exhibitorId);

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Soft delete - just mark as inactive
    db.prepare('UPDATE bp_qualification_questions SET is_active = 0 WHERE id = ?').run(req.params.id);

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save qualification answers for a lead
router.post('/leads/:id/answers', authenticateBoothPilot, (req, res) => {
  try {
    const lead = db.prepare('SELECT * FROM bp_leads WHERE id = ? AND exhibitor_id = ?')
      .get(req.params.id, req.user.exhibitorId);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers must be an array' });
    }

    // Delete existing answers
    db.prepare('DELETE FROM bp_qualification_answers WHERE lead_id = ?').run(req.params.id);

    // Insert new answers
    const insertStmt = db.prepare(`
      INSERT INTO bp_qualification_answers (id, lead_id, question_id, answer_text)
      VALUES (?, ?, ?, ?)
    `);

    for (const answer of answers) {
      if (answer.questionId && answer.answer) {
        insertStmt.run(uuidv4(), req.params.id, answer.questionId, answer.answer);
      }
    }

    // Log activity
    db.prepare(`
      INSERT INTO bp_lead_activities (id, lead_id, user_id, activity_type, description)
      VALUES (?, ?, ?, 'qualified', 'Qualification answers updated')
    `).run(uuidv4(), req.params.id, req.user.id);

    res.json({ message: 'Answers saved successfully' });
  } catch (error) {
    console.error('Save answers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// AI LEAD SCORING
// ==========================================

router.post('/leads/:id/score', authenticateBoothPilot, async (req, res) => {
  try {
    const lead = db.prepare(`
      SELECT l.*, e.icp_description
      FROM bp_leads l
      JOIN bp_exhibitors e ON l.exhibitor_id = e.id
      WHERE l.id = ? AND l.exhibitor_id = ?
    `).get(req.params.id, req.user.exhibitorId);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Get qualification answers
    const answers = db.prepare(`
      SELECT a.answer_text, q.question_text
      FROM bp_qualification_answers a
      JOIN bp_qualification_questions q ON a.question_id = q.id
      WHERE a.lead_id = ?
    `).all(req.params.id);

    // Build qualification object
    const qualification = {};
    answers.forEach(a => {
      const key = a.question_text.toLowerCase().replace(/[^a-z0-9]/g, '_');
      qualification[key] = a.answer_text;
    });

    // Prepare AI prompt
    const leadData = {
      lead: {
        name: lead.full_name,
        company: lead.company_name,
        designation: lead.designation,
        industry: lead.industry,
        interest: lead.interest_tag,
        notes: lead.notes
      },
      qualification,
      icpDescription: lead.icp_description
    };

    let scoringResult;

    if (OPENAI_API_KEY) {
      // Call OpenAI API
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are a B2B sales qualification expert. Analyze leads and score them based on buying intent, authority, budget, and timeline. Output only valid JSON with no additional text.

Your response must be a JSON object with exactly these fields:
- score: number 0-100
- label: "HOT" (score >= 70), "WARM" (score 40-69), or "COLD" (score < 40)
- reasons: array of strings explaining why this score
- riskFlags: array of strings with potential concerns
- nextBestAction: string with recommended next step
- recommendedMessageAngle: string with messaging suggestion`
              },
              {
                role: 'user',
                content: JSON.stringify(leadData)
              }
            ],
            temperature: 0.3,
            max_tokens: 500
          })
        });

        const data = await response.json();
        if (data.choices && data.choices[0]) {
          const content = data.choices[0].message.content;
          scoringResult = JSON.parse(content);
        }
      } catch (aiError) {
        console.error('OpenAI API error:', aiError);
      }
    }

    // Fallback to rule-based scoring if AI fails
    if (!scoringResult) {
      scoringResult = calculateFallbackScore(leadData);
    }

    // Ensure label matches score
    if (scoringResult.score >= 70) scoringResult.label = 'HOT';
    else if (scoringResult.score >= 40) scoringResult.label = 'WARM';
    else scoringResult.label = 'COLD';

    // Save or update score
    const existingScore = db.prepare('SELECT id FROM bp_lead_scores WHERE lead_id = ?').get(req.params.id);

    if (existingScore) {
      db.prepare(`
        UPDATE bp_lead_scores SET
          score = ?,
          label = ?,
          reasons_json = ?,
          risk_flags_json = ?,
          next_best_action = ?,
          recommended_message_angle = ?,
          ai_model = ?,
          scored_at = CURRENT_TIMESTAMP
        WHERE lead_id = ?
      `).run(
        scoringResult.score,
        scoringResult.label,
        JSON.stringify(scoringResult.reasons || []),
        JSON.stringify(scoringResult.riskFlags || []),
        scoringResult.nextBestAction,
        scoringResult.recommendedMessageAngle,
        OPENAI_API_KEY ? 'gpt-4o-mini' : 'rule-based',
        req.params.id
      );
    } else {
      db.prepare(`
        INSERT INTO bp_lead_scores (id, lead_id, score, label, reasons_json, risk_flags_json, next_best_action, recommended_message_angle, ai_model)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        req.params.id,
        scoringResult.score,
        scoringResult.label,
        JSON.stringify(scoringResult.reasons || []),
        JSON.stringify(scoringResult.riskFlags || []),
        scoringResult.nextBestAction,
        scoringResult.recommendedMessageAngle,
        OPENAI_API_KEY ? 'gpt-4o-mini' : 'rule-based'
      );
    }

    // Log activity
    db.prepare(`
      INSERT INTO bp_lead_activities (id, lead_id, user_id, activity_type, description, metadata_json)
      VALUES (?, ?, ?, 'scored', ?, ?)
    `).run(uuidv4(), req.params.id, req.user.id, `Lead scored: ${scoringResult.score} (${scoringResult.label})`, JSON.stringify(scoringResult));

    res.json({
      score: scoringResult.score,
      label: scoringResult.label,
      reasons: scoringResult.reasons,
      riskFlags: scoringResult.riskFlags,
      nextBestAction: scoringResult.nextBestAction,
      recommendedMessageAngle: scoringResult.recommendedMessageAngle
    });
  } catch (error) {
    console.error('Score lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fallback scoring function
function calculateFallbackScore(leadData) {
  let score = 50;
  const reasons = [];
  const riskFlags = [];

  // Check designation/authority
  const designation = (leadData.lead.designation || '').toLowerCase();
  if (designation.includes('ceo') || designation.includes('cio') || designation.includes('cto') || designation.includes('founder') || designation.includes('director')) {
    score += 15;
    reasons.push('Senior decision maker');
  } else if (designation.includes('head') || designation.includes('vp') || designation.includes('manager')) {
    score += 10;
    reasons.push('Management level contact');
  } else if (designation) {
    score += 5;
  }

  // Check company
  if (leadData.lead.company) {
    score += 5;
    reasons.push('Company information provided');
  }

  // Check qualification answers
  const qual = leadData.qualification || {};

  // Timeline
  const timelineKey = Object.keys(qual).find(k => k.includes('timeline'));
  if (timelineKey) {
    const timeline = qual[timelineKey].toLowerCase();
    if (timeline.includes('immediate') || timeline.includes('1-30') || timeline.includes('30 day')) {
      score += 15;
      reasons.push('Immediate timeline');
    } else if (timeline.includes('1-3') || timeline.includes('3 month')) {
      score += 10;
      reasons.push('Near-term timeline');
    } else if (timeline.includes('exploring') || timeline.includes('just')) {
      score -= 10;
      riskFlags.push('Just exploring, no defined timeline');
    }
  }

  // Budget
  const budgetKey = Object.keys(qual).find(k => k.includes('budget'));
  if (budgetKey) {
    const budget = qual[budgetKey].toLowerCase();
    if (budget.includes('crore') || budget.includes('100k') || budget.includes('above')) {
      score += 15;
      reasons.push('High budget range');
    } else if (budget.includes('50') || budget.includes('lakh')) {
      score += 10;
      reasons.push('Good budget range');
    } else if (budget.includes('under') || budget.includes('low') || budget.includes('10')) {
      score -= 5;
      riskFlags.push('Limited budget');
    }
  }

  // Decision maker
  const decisionKey = Object.keys(qual).find(k => k.includes('decision') || k.includes('role'));
  if (decisionKey) {
    const role = qual[decisionKey].toLowerCase();
    if (role.includes('final') || role.includes('decision maker')) {
      score += 10;
      reasons.push('Final decision maker');
    } else if (role.includes('influencer') || role.includes('key')) {
      score += 5;
      reasons.push('Key influencer');
    } else if (role.includes('researching') || role.includes('just')) {
      score -= 10;
      riskFlags.push('Not involved in buying decision');
    }
  }

  // Notes analysis
  const notes = (leadData.lead.notes || '').toLowerCase();
  if (notes.includes('demo') || notes.includes('meeting') || notes.includes('call')) {
    score += 5;
    reasons.push('Requested demo or meeting');
  }
  if (notes.includes('urgent') || notes.includes('asap') || notes.includes('immediate')) {
    score += 5;
    reasons.push('Expressed urgency');
  }
  if (notes.includes('pricing') || notes.includes('quote') || notes.includes('cost')) {
    score += 5;
    reasons.push('Asking about pricing');
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));

  // Determine label
  let label;
  if (score >= 70) label = 'HOT';
  else if (score >= 40) label = 'WARM';
  else label = 'COLD';

  // Generate action based on score
  let nextBestAction, recommendedMessageAngle;
  if (label === 'HOT') {
    nextBestAction = 'Schedule a demo or meeting within 24-48 hours';
    recommendedMessageAngle = 'Focus on ROI and quick implementation';
  } else if (label === 'WARM') {
    nextBestAction = 'Send case studies and schedule a follow-up call';
    recommendedMessageAngle = 'Share relevant success stories and build trust';
  } else {
    nextBestAction = 'Add to nurture sequence for long-term engagement';
    recommendedMessageAngle = 'Focus on education and building awareness';
  }

  return {
    score,
    label,
    reasons,
    riskFlags,
    nextBestAction,
    recommendedMessageAngle
  };
}

// ==========================================
// AI FOLLOW-UP GENERATION
// ==========================================

router.post('/leads/:id/followup', authenticateBoothPilot, async (req, res) => {
  try {
    const { channel } = req.body;

    if (!channel || !['whatsapp', 'email'].includes(channel)) {
      return res.status(400).json({ error: 'Valid channel (whatsapp or email) is required' });
    }

    const lead = db.prepare(`
      SELECT l.*, e.company_name as exhibitor_company, e.event_name, s.label, s.recommended_message_angle
      FROM bp_leads l
      JOIN bp_exhibitors e ON l.exhibitor_id = e.id
      LEFT JOIN bp_lead_scores s ON l.id = s.lead_id
      WHERE l.id = ? AND l.exhibitor_id = ?
    `).get(req.params.id, req.user.exhibitorId);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    let followupResult;

    if (OPENAI_API_KEY) {
      try {
        const promptContext = {
          lead: {
            name: lead.full_name.split(' ')[0], // First name
            fullName: lead.full_name,
            company: lead.company_name,
            designation: lead.designation,
            interest: lead.interest_tag,
            notes: lead.notes
          },
          exhibitor: {
            company: lead.exhibitor_company,
            event: lead.event_name
          },
          scoring: {
            label: lead.label,
            messageAngle: lead.recommended_message_angle
          },
          channel,
          senderName: req.user.name
        };

        const systemPrompt = channel === 'whatsapp'
          ? `You are a sales follow-up expert. Generate a WhatsApp follow-up message for a trade show lead. The message should be:
- Friendly but professional
- Include context about meeting at the booth/event
- Include a clear CTA (schedule call, share deck, etc.)
- Maximum 400 characters
- No markdown formatting

Output only valid JSON with exactly this field:
- message: string`
          : `You are a sales follow-up expert. Generate an email follow-up for a trade show lead. The email should be:
- Professional and personalized
- Include context about meeting at the booth/event
- Include a clear CTA (schedule call, share deck, demo, etc.)
- Well formatted with paragraphs
- No markdown, use plain text with line breaks

Output only valid JSON with exactly these fields:
- subject: string (email subject line)
- body: string (email body text)`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: JSON.stringify(promptContext) }
            ],
            temperature: 0.7,
            max_tokens: 500
          })
        });

        const data = await response.json();
        if (data.choices && data.choices[0]) {
          followupResult = JSON.parse(data.choices[0].message.content);
        }
      } catch (aiError) {
        console.error('OpenAI API error:', aiError);
      }
    }

    // Fallback templates
    if (!followupResult) {
      const firstName = lead.full_name.split(' ')[0];
      if (channel === 'whatsapp') {
        followupResult = {
          message: `Hi ${firstName}! Great meeting you at ${lead.event_name} today. I enjoyed our conversation about ${lead.interest_tag || 'your needs'}. Would love to schedule a quick call to discuss how ${lead.exhibitor_company} can help. When works best for you this week? - ${req.user.name}`
        };
      } else {
        followupResult = {
          subject: `Great connecting at ${lead.event_name} - Next Steps`,
          body: `Hi ${firstName},\n\nIt was a pleasure meeting you at our booth at ${lead.event_name} today.\n\n${lead.notes ? `I noted your interest in ${lead.interest_tag || 'our solutions'}. ` : ''}I'd love to schedule a brief call to discuss how ${lead.exhibitor_company} can help address your needs.\n\nWould you have 15-20 minutes available this week for a quick conversation?\n\nLooking forward to hearing from you.\n\nBest regards,\n${req.user.name}\n${lead.exhibitor_company}`
        };
      }
    }

    // Save follow-up
    const followupId = uuidv4();
    db.prepare(`
      INSERT INTO bp_followups (id, lead_id, channel, subject, message_text, generated_by_user_id, ai_model)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      followupId,
      req.params.id,
      channel,
      followupResult.subject || null,
      followupResult.message || followupResult.body,
      req.user.id,
      OPENAI_API_KEY ? 'gpt-4o-mini' : 'template'
    );

    // Log activity
    db.prepare(`
      INSERT INTO bp_lead_activities (id, lead_id, user_id, activity_type, description)
      VALUES (?, ?, ?, 'followup_generated', ?)
    `).run(uuidv4(), req.params.id, req.user.id, `${channel} follow-up generated`);

    res.json({
      id: followupId,
      channel,
      subject: followupResult.subject || null,
      message: followupResult.message || followupResult.body
    });
  } catch (error) {
    console.error('Generate followup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark follow-up as sent
router.patch('/followups/:id/sent', authenticateBoothPilot, (req, res) => {
  try {
    const followup = db.prepare(`
      SELECT f.*, l.exhibitor_id
      FROM bp_followups f
      JOIN bp_leads l ON f.lead_id = l.id
      WHERE f.id = ?
    `).get(req.params.id);

    if (!followup || followup.exhibitor_id !== req.user.exhibitorId) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }

    db.prepare(`
      UPDATE bp_followups SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(req.params.id);

    // Log activity
    db.prepare(`
      INSERT INTO bp_lead_activities (id, lead_id, user_id, activity_type, description)
      VALUES (?, ?, ?, 'followup_sent', ?)
    `).run(uuidv4(), followup.lead_id, req.user.id, `${followup.channel} follow-up marked as sent`);

    res.json({ message: 'Follow-up marked as sent' });
  } catch (error) {
    console.error('Mark followup sent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// DASHBOARD ANALYTICS
// ==========================================

router.get('/analytics/summary', authenticateBoothPilot, (req, res) => {
  try {
    const exhibitorId = req.user.exhibitorId;

    // Total leads
    const { totalLeads } = db.prepare('SELECT COUNT(*) as totalLeads FROM bp_leads WHERE exhibitor_id = ?').get(exhibitorId);

    // Leads by label
    const leadsByLabel = db.prepare(`
      SELECT COALESCE(s.label, 'UNSCORED') as label, COUNT(*) as count
      FROM bp_leads l
      LEFT JOIN bp_lead_scores s ON l.id = s.lead_id
      WHERE l.exhibitor_id = ?
      GROUP BY COALESCE(s.label, 'UNSCORED')
    `).all(exhibitorId);

    const labelCounts = { HOT: 0, WARM: 0, COLD: 0, UNSCORED: 0 };
    leadsByLabel.forEach(row => {
      labelCounts[row.label] = row.count;
    });

    // Top industries
    const topIndustries = db.prepare(`
      SELECT industry, COUNT(*) as count
      FROM bp_leads
      WHERE exhibitor_id = ? AND industry IS NOT NULL AND industry != ''
      GROUP BY industry
      ORDER BY count DESC
      LIMIT 5
    `).all(exhibitorId);

    // Top interest tags
    const topInterests = db.prepare(`
      SELECT interest_tag, COUNT(*) as count
      FROM bp_leads
      WHERE exhibitor_id = ? AND interest_tag IS NOT NULL AND interest_tag != ''
      GROUP BY interest_tag
      ORDER BY count DESC
      LIMIT 5
    `).all(exhibitorId);

    // Staff leaderboard
    const staffLeaderboard = db.prepare(`
      SELECT
        u.id,
        u.name,
        COUNT(l.id) as total_leads,
        SUM(CASE WHEN s.label = 'HOT' THEN 1 ELSE 0 END) as hot_leads
      FROM bp_users u
      LEFT JOIN bp_leads l ON u.id = l.captured_by_user_id
      LEFT JOIN bp_lead_scores s ON l.id = s.lead_id
      WHERE u.exhibitor_id = ? AND u.role = 'staff'
      GROUP BY u.id
      ORDER BY total_leads DESC
    `).all(exhibitorId);

    // Leads by day (last 7 days)
    const leadsByDay = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM bp_leads
      WHERE exhibitor_id = ? AND created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all(exhibitorId);

    // Follow-up stats
    const { totalFollowups } = db.prepare('SELECT COUNT(*) as totalFollowups FROM bp_followups f JOIN bp_leads l ON f.lead_id = l.id WHERE l.exhibitor_id = ?').get(exhibitorId);
    const { sentFollowups } = db.prepare("SELECT COUNT(*) as sentFollowups FROM bp_followups f JOIN bp_leads l ON f.lead_id = l.id WHERE l.exhibitor_id = ? AND f.status = 'sent'").get(exhibitorId);

    res.json({
      totalLeads,
      hotLeads: labelCounts.HOT,
      warmLeads: labelCounts.WARM,
      coldLeads: labelCounts.COLD,
      unscoredLeads: labelCounts.UNSCORED,
      topIndustries: topIndustries.map(i => ({ name: i.industry, count: i.count })),
      topInterests: topInterests.map(i => ({ name: i.interest_tag, count: i.count })),
      staffLeaderboard: staffLeaderboard.map(s => ({
        id: s.id,
        name: s.name,
        totalLeads: s.total_leads,
        hotLeads: s.hot_leads
      })),
      leadsByDay: leadsByDay.map(d => ({ date: d.date, count: d.count })),
      followups: {
        total: totalFollowups,
        sent: sentFollowups
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// CSV EXPORT
// ==========================================

router.get('/export/leads', authenticateBoothPilot, requireRole('admin', 'manager'), (req, res) => {
  try {
    const leads = db.prepare(`
      SELECT
        l.*,
        u.name as captured_by_name,
        s.score,
        s.label,
        s.next_best_action
      FROM bp_leads l
      LEFT JOIN bp_users u ON l.captured_by_user_id = u.id
      LEFT JOIN bp_lead_scores s ON l.id = s.lead_id
      WHERE l.exhibitor_id = ?
      ORDER BY l.created_at DESC
    `).all(req.user.exhibitorId);

    // Get all qualification answers
    const allAnswers = db.prepare(`
      SELECT a.lead_id, q.question_text, a.answer_text
      FROM bp_qualification_answers a
      JOIN bp_qualification_questions q ON a.question_id = q.id
      WHERE q.exhibitor_id = ?
    `).all(req.user.exhibitorId);

    // Group answers by lead
    const answersByLead = {};
    allAnswers.forEach(a => {
      if (!answersByLead[a.lead_id]) answersByLead[a.lead_id] = {};
      answersByLead[a.lead_id][a.question_text] = a.answer_text;
    });

    // Get follow-up status
    const followupStatus = db.prepare(`
      SELECT lead_id,
        MAX(CASE WHEN channel = 'whatsapp' AND status = 'sent' THEN 1 ELSE 0 END) as whatsapp_sent,
        MAX(CASE WHEN channel = 'email' AND status = 'sent' THEN 1 ELSE 0 END) as email_sent
      FROM bp_followups
      GROUP BY lead_id
    `).all();

    const followupByLead = {};
    followupStatus.forEach(f => {
      followupByLead[f.lead_id] = { whatsappSent: f.whatsapp_sent === 1, emailSent: f.email_sent === 1 };
    });

    // Get unique question texts for headers
    const questions = db.prepare(`
      SELECT DISTINCT question_text FROM bp_qualification_questions WHERE exhibitor_id = ? AND is_active = 1 ORDER BY order_index
    `).all(req.user.exhibitorId);

    // Build CSV
    const headers = [
      'Full Name', 'Company', 'Designation', 'Email', 'Phone', 'Industry', 'Interest',
      'Notes', 'Score', 'Label', 'Next Action', 'Captured By', 'Capture Source',
      ...questions.map(q => q.question_text),
      'WhatsApp Sent', 'Email Sent', 'Created At'
    ];

    const rows = leads.map(lead => {
      const answers = answersByLead[lead.id] || {};
      const followup = followupByLead[lead.id] || { whatsappSent: false, emailSent: false };

      return [
        lead.full_name,
        lead.company_name || '',
        lead.designation || '',
        lead.email || '',
        lead.phone || '',
        lead.industry || '',
        lead.interest_tag || '',
        (lead.notes || '').replace(/"/g, '""'),
        lead.score || '',
        lead.label || '',
        lead.next_best_action || '',
        lead.captured_by_name,
        lead.capture_source,
        ...questions.map(q => (answers[q.question_text] || '').replace(/"/g, '""')),
        followup.whatsappSent ? 'Yes' : 'No',
        followup.emailSent ? 'Yes' : 'No',
        lead.created_at
      ];
    });

    // Generate CSV content
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads-export-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// USER MANAGEMENT (Admin only)
// ==========================================

router.get('/users', authenticateBoothPilot, requireRole('admin', 'manager'), (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, name, email, phone, role, avatar, is_active, last_login_at, created_at
      FROM bp_users
      WHERE exhibitor_id = ?
      ORDER BY created_at DESC
    `).all(req.user.exhibitorId);

    res.json(users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      avatar: u.avatar,
      isActive: u.is_active === 1,
      lastLoginAt: u.last_login_at,
      createdAt: u.created_at
    })));
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users', authenticateBoothPilot, requireRole('admin'), (req, res) => {
  try {
    const { name, email, password, phone, role = 'staff' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (!['staff', 'manager', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if email exists
    const existing = db.prepare('SELECT id FROM bp_users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const id = uuidv4();
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO bp_users (id, exhibitor_id, name, email, password, phone, role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.exhibitorId, name, email.toLowerCase(), hashedPassword, phone || null, role);

    res.status(201).json({
      id,
      name,
      email: email.toLowerCase(),
      phone,
      role,
      isActive: true
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/users/:id', authenticateBoothPilot, requireRole('admin'), (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM bp_users WHERE id = ? AND exhibitor_id = ?')
      .get(req.params.id, req.user.exhibitorId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { name, phone, role, isActive, password } = req.body;

    let updateQuery = `
      UPDATE bp_users SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        role = COALESCE(?, role),
        is_active = COALESCE(?, is_active)
    `;
    const params = [name, phone, role, isActive !== undefined ? (isActive ? 1 : 0) : null];

    if (password) {
      updateQuery += ', password = ?';
      params.push(bcrypt.hashSync(password, 10));
    }

    updateQuery += ' WHERE id = ?';
    params.push(req.params.id);

    db.prepare(updateQuery).run(...params);

    const updated = db.prepare('SELECT id, name, email, phone, role, is_active FROM bp_users WHERE id = ?').get(req.params.id);

    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      role: updated.role,
      isActive: updated.is_active === 1
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/users/:id', authenticateBoothPilot, requireRole('admin'), (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM bp_users WHERE id = ? AND exhibitor_id = ?')
      .get(req.params.id, req.user.exhibitorId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    // Soft delete
    db.prepare('UPDATE bp_users SET is_active = 0 WHERE id = ?').run(req.params.id);

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// EXHIBITOR SETTINGS
// ==========================================

router.get('/exhibitor', authenticateBoothPilot, (req, res) => {
  try {
    const exhibitor = db.prepare('SELECT * FROM bp_exhibitors WHERE id = ?').get(req.user.exhibitorId);

    if (!exhibitor) {
      return res.status(404).json({ error: 'Exhibitor not found' });
    }

    res.json({
      id: exhibitor.id,
      companyName: exhibitor.company_name,
      companyLogo: exhibitor.company_logo,
      industry: exhibitor.industry,
      website: exhibitor.website,
      icpDescription: exhibitor.icp_description,
      eventName: exhibitor.event_name,
      eventLocation: exhibitor.event_location,
      eventStartDate: exhibitor.event_start_date,
      eventEndDate: exhibitor.event_end_date,
      boothNumber: exhibitor.booth_number,
      settings: JSON.parse(exhibitor.settings_json || '{}')
    });
  } catch (error) {
    console.error('Get exhibitor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/exhibitor', authenticateBoothPilot, requireRole('admin'), (req, res) => {
  try {
    const {
      companyName,
      companyLogo,
      industry,
      website,
      icpDescription,
      eventName,
      eventLocation,
      eventStartDate,
      eventEndDate,
      boothNumber,
      settings
    } = req.body;

    db.prepare(`
      UPDATE bp_exhibitors SET
        company_name = COALESCE(?, company_name),
        company_logo = COALESCE(?, company_logo),
        industry = COALESCE(?, industry),
        website = COALESCE(?, website),
        icp_description = COALESCE(?, icp_description),
        event_name = COALESCE(?, event_name),
        event_location = COALESCE(?, event_location),
        event_start_date = COALESCE(?, event_start_date),
        event_end_date = COALESCE(?, event_end_date),
        booth_number = COALESCE(?, booth_number),
        settings_json = COALESCE(?, settings_json),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      companyName,
      companyLogo,
      industry,
      website,
      icpDescription,
      eventName,
      eventLocation,
      eventStartDate,
      eventEndDate,
      boothNumber,
      settings ? JSON.stringify(settings) : null,
      req.user.exhibitorId
    );

    const updated = db.prepare('SELECT * FROM bp_exhibitors WHERE id = ?').get(req.user.exhibitorId);

    res.json({
      id: updated.id,
      companyName: updated.company_name,
      eventName: updated.event_name,
      boothNumber: updated.booth_number
    });
  } catch (error) {
    console.error('Update exhibitor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
