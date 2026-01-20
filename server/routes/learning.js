const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// ==========================================
// COURSES
// ==========================================

// Get all courses
router.get('/courses', authenticateToken, (req, res) => {
  try {
    const { category, difficulty_level, is_mandatory } = req.query;
    let query = `
      SELECT c.*, u.name as instructor_name, cb.name as created_by_name,
             (SELECT COUNT(*) FROM course_enrollments WHERE course_id = c.id) as enrolled_count,
             (SELECT COUNT(*) FROM course_modules WHERE course_id = c.id) as modules_count
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN users cb ON c.created_by = cb.id
      WHERE c.is_active = 1
    `;
    const params = [];

    if (category) {
      query += ' AND c.category = ?';
      params.push(category);
    }
    if (difficulty_level) {
      query += ' AND c.difficulty_level = ?';
      params.push(difficulty_level);
    }
    if (is_mandatory === 'true') {
      query += ' AND c.is_mandatory = 1';
    }

    query += ' ORDER BY c.created_at DESC';

    const courses = db.prepare(query).all(...params);
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get single course with modules
router.get('/courses/:id', authenticateToken, (req, res) => {
  try {
    const course = db.prepare(`
      SELECT c.*, u.name as instructor_name
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    course.modules = db.prepare(`
      SELECT * FROM course_modules WHERE course_id = ? ORDER BY order_index
    `).all(req.params.id);

    // Get user's enrollment if exists
    const enrollment = db.prepare(`
      SELECT * FROM course_enrollments WHERE course_id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (enrollment) {
      course.enrollment = enrollment;
      course.moduleProgress = db.prepare(`
        SELECT * FROM module_progress WHERE enrollment_id = ?
      `).all(enrollment.id);
    }

    res.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Create course
router.post('/courses', authenticateToken, isAdmin, (req, res) => {
  try {
    const { title, description, category, skill_tags, instructor, instructor_id, duration_hours, course_type, difficulty_level, content_url, thumbnail_url, syllabus, prerequisites, max_participants, is_mandatory } = req.body;

    const id = `course-${uuidv4()}`;
    db.prepare(`
      INSERT INTO courses (id, title, description, category, skill_tags, instructor, instructor_id, duration_hours, course_type, difficulty_level, content_url, thumbnail_url, syllabus, prerequisites, max_participants, is_mandatory, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description, category, skill_tags, instructor, instructor_id, duration_hours, course_type || 'online', difficulty_level || 'beginner', content_url, thumbnail_url, syllabus, prerequisites, max_participants, is_mandatory ? 1 : 0, req.user.id);

    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
    res.status(201).json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Update course
router.put('/courses/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { title, description, category, skill_tags, instructor, instructor_id, duration_hours, course_type, difficulty_level, content_url, thumbnail_url, syllabus, prerequisites, max_participants, is_mandatory, is_active } = req.body;

    db.prepare(`
      UPDATE courses SET title = ?, description = ?, category = ?, skill_tags = ?, instructor = ?, instructor_id = ?, duration_hours = ?, course_type = ?, difficulty_level = ?, content_url = ?, thumbnail_url = ?, syllabus = ?, prerequisites = ?, max_participants = ?, is_mandatory = ?, is_active = ?
      WHERE id = ?
    `).run(title, description, category, skill_tags, instructor, instructor_id, duration_hours, course_type, difficulty_level, content_url, thumbnail_url, syllabus, prerequisites, max_participants, is_mandatory ? 1 : 0, is_active ? 1 : 0, req.params.id);

    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
    res.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// Add course module
router.post('/courses/:id/modules', authenticateToken, isAdmin, (req, res) => {
  try {
    const { title, description, content_type, content_url, duration_minutes, order_index, is_mandatory } = req.body;

    const id = `mod-${uuidv4()}`;
    db.prepare(`
      INSERT INTO course_modules (id, course_id, title, description, content_type, content_url, duration_minutes, order_index, is_mandatory)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, title, description, content_type || 'video', content_url, duration_minutes, order_index || 0, is_mandatory !== false ? 1 : 0);

    const module = db.prepare('SELECT * FROM course_modules WHERE id = ?').get(id);
    res.status(201).json(module);
  } catch (error) {
    console.error('Error creating module:', error);
    res.status(500).json({ error: 'Failed to create module' });
  }
});

// ==========================================
// ENROLLMENTS
// ==========================================

// Get my enrollments
router.get('/enrollments/my-enrollments', authenticateToken, (req, res) => {
  try {
    const enrollments = db.prepare(`
      SELECT ce.*, c.title as course_title, c.description as course_description,
             c.category, c.duration_hours, c.thumbnail_url, c.difficulty_level,
             (SELECT COUNT(*) FROM course_modules WHERE course_id = c.id) as total_modules,
             (SELECT COUNT(*) FROM module_progress mp WHERE mp.enrollment_id = ce.id AND mp.status = 'completed') as completed_modules
      FROM course_enrollments ce
      JOIN courses c ON ce.course_id = c.id
      WHERE ce.user_id = ?
      ORDER BY ce.enrolled_at DESC
    `).all(req.user.id);
    res.json(enrollments);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// Get all enrollments (admin)
router.get('/enrollments', authenticateToken, isAdmin, (req, res) => {
  try {
    const { course_id, status } = req.query;
    let query = `
      SELECT ce.*, c.title as course_title, u.name as user_name, u.department
      FROM course_enrollments ce
      JOIN courses c ON ce.course_id = c.id
      JOIN users u ON ce.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (course_id) {
      query += ' AND ce.course_id = ?';
      params.push(course_id);
    }
    if (status) {
      query += ' AND ce.status = ?';
      params.push(status);
    }

    query += ' ORDER BY ce.enrolled_at DESC';

    const enrollments = db.prepare(query).all(...params);
    res.json(enrollments);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// Enroll in course
router.post('/enrollments', authenticateToken, (req, res) => {
  try {
    const { course_id } = req.body;

    // Check if already enrolled
    const existing = db.prepare('SELECT id FROM course_enrollments WHERE course_id = ? AND user_id = ?').get(course_id, req.user.id);
    if (existing) {
      return res.status(400).json({ error: 'Already enrolled' });
    }

    // Check capacity
    const course = db.prepare('SELECT max_participants FROM courses WHERE id = ?').get(course_id);
    if (course.max_participants) {
      const enrolled = db.prepare('SELECT COUNT(*) as count FROM course_enrollments WHERE course_id = ?').get(course_id);
      if (enrolled.count >= course.max_participants) {
        return res.status(400).json({ error: 'Course is full' });
      }
    }

    const id = `enroll-${uuidv4()}`;
    db.prepare(`
      INSERT INTO course_enrollments (id, course_id, user_id)
      VALUES (?, ?, ?)
    `).run(id, course_id, req.user.id);

    // Create module progress entries
    const modules = db.prepare('SELECT id FROM course_modules WHERE course_id = ?').all(course_id);
    const insertProgress = db.prepare(`
      INSERT INTO module_progress (id, enrollment_id, module_id, status)
      VALUES (?, ?, ?, 'not_started')
    `);

    for (const mod of modules) {
      insertProgress.run(`mp-${uuidv4()}`, id, mod.id);
    }

    const enrollment = db.prepare('SELECT * FROM course_enrollments WHERE id = ?').get(id);
    res.status(201).json(enrollment);
  } catch (error) {
    console.error('Error enrolling:', error);
    res.status(500).json({ error: 'Failed to enroll' });
  }
});

// Update module progress
router.post('/enrollments/:id/progress', authenticateToken, (req, res) => {
  try {
    const { module_id, status, time_spent_minutes } = req.body;

    // Verify enrollment belongs to user
    const enrollment = db.prepare('SELECT * FROM course_enrollments WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!enrollment) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE module_progress SET
        status = ?,
        started_at = COALESCE(started_at, ?),
        completed_at = CASE WHEN ? = 'completed' THEN ? ELSE completed_at END,
        time_spent_minutes = COALESCE(time_spent_minutes, 0) + ?
      WHERE enrollment_id = ? AND module_id = ?
    `).run(status, now, status, now, time_spent_minutes || 0, req.params.id, module_id);

    // Update enrollment progress
    const totalModules = db.prepare('SELECT COUNT(*) as count FROM module_progress WHERE enrollment_id = ?').get(req.params.id).count;
    const completedModules = db.prepare('SELECT COUNT(*) as count FROM module_progress WHERE enrollment_id = ? AND status = ?').get(req.params.id, 'completed').count;
    const progress = Math.round((completedModules / totalModules) * 100);

    let enrollmentStatus = enrollment.status;
    if (progress > 0 && enrollmentStatus === 'enrolled') {
      enrollmentStatus = 'in_progress';
      db.prepare('UPDATE course_enrollments SET started_at = ? WHERE id = ?').run(now, req.params.id);
    }
    if (progress === 100) {
      enrollmentStatus = 'completed';
      db.prepare('UPDATE course_enrollments SET completed_at = ? WHERE id = ?').run(now, req.params.id);
    }

    db.prepare('UPDATE course_enrollments SET progress_percentage = ?, status = ? WHERE id = ?').run(progress, enrollmentStatus, req.params.id);

    res.json({ message: 'Progress updated', progress_percentage: progress });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// ==========================================
// SKILLS
// ==========================================

// Get all skills
router.get('/skills', authenticateToken, (req, res) => {
  try {
    const skills = db.prepare(`
      SELECT s.*,
             (SELECT COUNT(*) FROM employee_skills WHERE skill_id = s.id) as employees_count
      FROM skills s
      WHERE s.is_active = 1
      ORDER BY s.category, s.name
    `).all();
    res.json(skills);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// Create skill
router.post('/skills', authenticateToken, isAdmin, (req, res) => {
  try {
    const { name, category, description } = req.body;

    const id = `skill-${uuidv4()}`;
    db.prepare(`
      INSERT INTO skills (id, name, category, description)
      VALUES (?, ?, ?, ?)
    `).run(id, name, category, description);

    const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(id);
    res.status(201).json(skill);
  } catch (error) {
    console.error('Error creating skill:', error);
    res.status(500).json({ error: 'Failed to create skill' });
  }
});

// Get my skills
router.get('/skills/my-skills', authenticateToken, (req, res) => {
  try {
    const skills = db.prepare(`
      SELECT es.*, s.name as skill_name, s.category, v.name as verified_by_name
      FROM employee_skills es
      JOIN skills s ON es.skill_id = s.id
      LEFT JOIN users v ON es.verified_by = v.id
      WHERE es.user_id = ?
      ORDER BY es.is_primary DESC, s.category, s.name
    `).all(req.user.id);
    res.json(skills);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// Get skills by user
router.get('/skills/user/:userId', authenticateToken, (req, res) => {
  try {
    const skills = db.prepare(`
      SELECT es.*, s.name as skill_name, s.category, v.name as verified_by_name
      FROM employee_skills es
      JOIN skills s ON es.skill_id = s.id
      LEFT JOIN users v ON es.verified_by = v.id
      WHERE es.user_id = ?
      ORDER BY es.is_primary DESC, s.category, s.name
    `).all(req.params.userId);
    res.json(skills);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// Add/Update my skill
router.post('/skills/my-skills', authenticateToken, (req, res) => {
  try {
    const { skill_id, proficiency_level, years_experience, is_primary, last_used_at } = req.body;

    const existing = db.prepare('SELECT id FROM employee_skills WHERE user_id = ? AND skill_id = ?').get(req.user.id, skill_id);

    if (existing) {
      db.prepare(`
        UPDATE employee_skills SET proficiency_level = ?, years_experience = ?, is_primary = ?, last_used_at = ?
        WHERE id = ?
      `).run(proficiency_level, years_experience, is_primary ? 1 : 0, last_used_at, existing.id);
    } else {
      const id = `es-${uuidv4()}`;
      db.prepare(`
        INSERT INTO employee_skills (id, user_id, skill_id, proficiency_level, years_experience, is_primary, last_used_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, req.user.id, skill_id, proficiency_level || 'beginner', years_experience, is_primary ? 1 : 0, last_used_at);
    }

    res.json({ message: 'Skill saved' });
  } catch (error) {
    console.error('Error saving skill:', error);
    res.status(500).json({ error: 'Failed to save skill' });
  }
});

// Verify skill (admin/manager)
router.post('/skills/:id/verify', authenticateToken, isAdmin, (req, res) => {
  try {
    db.prepare(`
      UPDATE employee_skills SET verified_by = ?, verified_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(req.user.id, req.params.id);
    res.json({ message: 'Skill verified' });
  } catch (error) {
    console.error('Error verifying skill:', error);
    res.status(500).json({ error: 'Failed to verify skill' });
  }
});

// ==========================================
// CERTIFICATIONS
// ==========================================

// Get all certifications catalog
router.get('/certifications', authenticateToken, (req, res) => {
  try {
    const certifications = db.prepare(`
      SELECT * FROM certifications WHERE is_active = 1 ORDER BY name
    `).all();
    res.json(certifications);
  } catch (error) {
    console.error('Error fetching certifications:', error);
    res.status(500).json({ error: 'Failed to fetch certifications' });
  }
});

// Get my certifications
router.get('/certifications/my-certifications', authenticateToken, (req, res) => {
  try {
    const certifications = db.prepare(`
      SELECT ec.*, c.name as certification_name, c.issuing_organization
      FROM employee_certifications ec
      JOIN certifications c ON ec.certification_id = c.id
      WHERE ec.user_id = ?
      ORDER BY ec.issue_date DESC
    `).all(req.user.id);
    res.json(certifications);
  } catch (error) {
    console.error('Error fetching certifications:', error);
    res.status(500).json({ error: 'Failed to fetch certifications' });
  }
});

// Add my certification
router.post('/certifications/my-certifications', authenticateToken, (req, res) => {
  try {
    const { certification_id, credential_id, issue_date, expiry_date, certificate_url, verification_url } = req.body;

    const id = `ec-${uuidv4()}`;
    db.prepare(`
      INSERT INTO employee_certifications (id, user_id, certification_id, credential_id, issue_date, expiry_date, certificate_url, verification_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, certification_id, credential_id, issue_date, expiry_date, certificate_url, verification_url);

    const certification = db.prepare(`
      SELECT ec.*, c.name as certification_name
      FROM employee_certifications ec
      JOIN certifications c ON ec.certification_id = c.id
      WHERE ec.id = ?
    `).get(id);
    res.status(201).json(certification);
  } catch (error) {
    console.error('Error adding certification:', error);
    res.status(500).json({ error: 'Failed to add certification' });
  }
});

// ==========================================
// LEARNING PATHS
// ==========================================

// Get all learning paths
router.get('/paths', authenticateToken, (req, res) => {
  try {
    const paths = db.prepare(`
      SELECT lp.*, u.name as created_by_name,
             (SELECT COUNT(*) FROM learning_path_courses WHERE learning_path_id = lp.id) as courses_count,
             (SELECT COUNT(*) FROM employee_learning_paths WHERE learning_path_id = lp.id) as enrolled_count
      FROM learning_paths lp
      LEFT JOIN users u ON lp.created_by = u.id
      WHERE lp.is_active = 1
      ORDER BY lp.title
    `).all();

    for (const path of paths) {
      path.courses = db.prepare(`
        SELECT lpc.*, c.title, c.description, c.duration_hours, c.difficulty_level, c.thumbnail_url
        FROM learning_path_courses lpc
        JOIN courses c ON lpc.course_id = c.id
        ORDER BY lpc.order_index
      `).all();
    }

    res.json(paths);
  } catch (error) {
    console.error('Error fetching paths:', error);
    res.status(500).json({ error: 'Failed to fetch paths' });
  }
});

// Get my learning paths
router.get('/paths/my-paths', authenticateToken, (req, res) => {
  try {
    const paths = db.prepare(`
      SELECT elp.*, lp.title, lp.description, lp.estimated_hours, lp.difficulty_level,
             a.name as assigned_by_name
      FROM employee_learning_paths elp
      JOIN learning_paths lp ON elp.learning_path_id = lp.id
      LEFT JOIN users a ON elp.assigned_by = a.id
      WHERE elp.user_id = ?
      ORDER BY elp.assigned_at DESC
    `).all(req.user.id);

    for (const path of paths) {
      const pathCourses = db.prepare(`
        SELECT lpc.course_id, c.title,
               ce.status as enrollment_status, ce.progress_percentage
        FROM learning_path_courses lpc
        JOIN courses c ON lpc.course_id = c.id
        LEFT JOIN course_enrollments ce ON lpc.course_id = ce.course_id AND ce.user_id = ?
        WHERE lpc.learning_path_id = ?
        ORDER BY lpc.order_index
      `).all(req.user.id, path.learning_path_id);
      path.courses = pathCourses;
    }

    res.json(paths);
  } catch (error) {
    console.error('Error fetching paths:', error);
    res.status(500).json({ error: 'Failed to fetch paths' });
  }
});

// Create learning path
router.post('/paths', authenticateToken, isAdmin, (req, res) => {
  try {
    const { title, description, target_role, skill_tags, estimated_hours, difficulty_level, course_ids } = req.body;

    const id = `lp-${uuidv4()}`;
    db.prepare(`
      INSERT INTO learning_paths (id, title, description, target_role, skill_tags, estimated_hours, difficulty_level, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description, target_role, skill_tags, estimated_hours, difficulty_level || 'intermediate', req.user.id);

    // Add courses
    if (course_ids && course_ids.length > 0) {
      const insertCourse = db.prepare(`
        INSERT INTO learning_path_courses (id, learning_path_id, course_id, order_index, is_mandatory)
        VALUES (?, ?, ?, ?, 1)
      `);
      course_ids.forEach((courseId, index) => {
        insertCourse.run(`lpc-${uuidv4()}`, id, courseId, index);
      });
    }

    const path = db.prepare('SELECT * FROM learning_paths WHERE id = ?').get(id);
    res.status(201).json(path);
  } catch (error) {
    console.error('Error creating path:', error);
    res.status(500).json({ error: 'Failed to create path' });
  }
});

// Assign learning path to employee
router.post('/paths/:id/assign', authenticateToken, isAdmin, (req, res) => {
  try {
    const { user_id, target_completion_date } = req.body;

    // Check if already assigned
    const existing = db.prepare('SELECT id FROM employee_learning_paths WHERE learning_path_id = ? AND user_id = ?').get(req.params.id, user_id);
    if (existing) {
      return res.status(400).json({ error: 'Already assigned' });
    }

    const id = `elp-${uuidv4()}`;
    db.prepare(`
      INSERT INTO employee_learning_paths (id, user_id, learning_path_id, assigned_by, target_completion_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, user_id, req.params.id, req.user.id, target_completion_date);

    res.json({ message: 'Learning path assigned' });
  } catch (error) {
    console.error('Error assigning path:', error);
    res.status(500).json({ error: 'Failed to assign path' });
  }
});

// ==========================================
// TRAINING SESSIONS
// ==========================================

// Get training sessions
router.get('/sessions', authenticateToken, (req, res) => {
  try {
    const { date, status } = req.query;
    let query = `
      SELECT ts.*, c.title as course_title, t.name as trainer_name, cb.name as created_by_name,
             (SELECT COUNT(*) FROM training_registrations WHERE session_id = ts.id) as registered_count
      FROM training_sessions ts
      LEFT JOIN courses c ON ts.course_id = c.id
      LEFT JOIN users t ON ts.trainer_id = t.id
      LEFT JOIN users cb ON ts.created_by = cb.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ' AND ts.session_date = ?';
      params.push(date);
    }
    if (status) {
      query += ' AND ts.status = ?';
      params.push(status);
    }

    query += ' ORDER BY ts.session_date DESC, ts.start_time';

    const sessions = db.prepare(query).all(...params);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get upcoming sessions
router.get('/sessions/upcoming', authenticateToken, (req, res) => {
  try {
    const sessions = db.prepare(`
      SELECT ts.*, c.title as course_title, t.name as trainer_name,
             (SELECT COUNT(*) FROM training_registrations WHERE session_id = ts.id) as registered_count,
             (SELECT id FROM training_registrations WHERE session_id = ts.id AND user_id = ?) as my_registration
      FROM training_sessions ts
      LEFT JOIN courses c ON ts.course_id = c.id
      LEFT JOIN users t ON ts.trainer_id = t.id
      WHERE ts.session_date >= date('now') AND ts.status = 'scheduled'
      ORDER BY ts.session_date, ts.start_time
    `).all(req.user.id);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Create training session
router.post('/sessions', authenticateToken, isAdmin, (req, res) => {
  try {
    const { course_id, title, description, trainer_id, trainer_name, session_date, start_time, end_time, location, meeting_link, max_participants } = req.body;

    const id = `ts-${uuidv4()}`;
    db.prepare(`
      INSERT INTO training_sessions (id, course_id, title, description, trainer_id, trainer_name, session_date, start_time, end_time, location, meeting_link, max_participants, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, course_id, title, description, trainer_id, trainer_name, session_date, start_time, end_time, location, meeting_link, max_participants, req.user.id);

    const session = db.prepare('SELECT * FROM training_sessions WHERE id = ?').get(id);
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Register for session
router.post('/sessions/:id/register', authenticateToken, (req, res) => {
  try {
    // Check if already registered
    const existing = db.prepare('SELECT id FROM training_registrations WHERE session_id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (existing) {
      return res.status(400).json({ error: 'Already registered' });
    }

    // Check capacity
    const session = db.prepare('SELECT max_participants FROM training_sessions WHERE id = ?').get(req.params.id);
    if (session.max_participants) {
      const registered = db.prepare('SELECT COUNT(*) as count FROM training_registrations WHERE session_id = ?').get(req.params.id);
      if (registered.count >= session.max_participants) {
        return res.status(400).json({ error: 'Session is full' });
      }
    }

    const id = `tr-${uuidv4()}`;
    db.prepare(`
      INSERT INTO training_registrations (id, session_id, user_id)
      VALUES (?, ?, ?)
    `).run(id, req.params.id, req.user.id);

    res.json({ message: 'Registered successfully' });
  } catch (error) {
    console.error('Error registering:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
});

// Submit feedback for session
router.post('/sessions/:id/feedback', authenticateToken, (req, res) => {
  try {
    const { feedback_rating, feedback_comments } = req.body;

    db.prepare(`
      UPDATE training_registrations SET feedback_rating = ?, feedback_comments = ?, attended = 1
      WHERE session_id = ? AND user_id = ?
    `).run(feedback_rating, feedback_comments, req.params.id, req.user.id);

    res.json({ message: 'Feedback submitted' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// ==========================================
// LEARNING DASHBOARD
// ==========================================

router.get('/dashboard', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const myStats = {
      coursesEnrolled: db.prepare('SELECT COUNT(*) as count FROM course_enrollments WHERE user_id = ?').get(userId).count,
      coursesCompleted: db.prepare('SELECT COUNT(*) as count FROM course_enrollments WHERE user_id = ? AND status = ?').get(userId, 'completed').count,
      coursesInProgress: db.prepare('SELECT COUNT(*) as count FROM course_enrollments WHERE user_id = ? AND status = ?').get(userId, 'in_progress').count,
      skillsCount: db.prepare('SELECT COUNT(*) as count FROM employee_skills WHERE user_id = ?').get(userId).count,
      certificationsCount: db.prepare('SELECT COUNT(*) as count FROM employee_certifications WHERE user_id = ? AND status = ?').get(userId, 'active').count,
      learningPathsAssigned: db.prepare('SELECT COUNT(*) as count FROM employee_learning_paths WHERE user_id = ?').get(userId).count,
      upcomingSessions: db.prepare(`
        SELECT COUNT(*) as count FROM training_registrations tr
        JOIN training_sessions ts ON tr.session_id = ts.id
        WHERE tr.user_id = ? AND ts.session_date >= date('now')
      `).get(userId).count,
      totalLearningHours: db.prepare(`
        SELECT COALESCE(SUM(c.duration_hours * ce.progress_percentage / 100), 0) as hours
        FROM course_enrollments ce
        JOIN courses c ON ce.course_id = c.id
        WHERE ce.user_id = ?
      `).get(userId).hours
    };

    let orgStats = null;
    if (isAdmin) {
      orgStats = {
        totalCourses: db.prepare('SELECT COUNT(*) as count FROM courses WHERE is_active = 1').get().count,
        totalEnrollments: db.prepare('SELECT COUNT(*) as count FROM course_enrollments').get().count,
        completionRate: db.prepare(`
          SELECT ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as rate
          FROM course_enrollments
        `).get().rate || 0,
        activeTrainingSessions: db.prepare(`
          SELECT COUNT(*) as count FROM training_sessions WHERE session_date >= date('now') AND status = 'scheduled'
        `).get().count,
        skillsInSystem: db.prepare('SELECT COUNT(*) as count FROM skills WHERE is_active = 1').get().count,
        certificationsExpiringSoon: db.prepare(`
          SELECT COUNT(*) as count FROM employee_certifications
          WHERE expiry_date BETWEEN date('now') AND date('now', '+90 days')
        `).get().count
      };
    }

    res.json({ myStats, orgStats });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
