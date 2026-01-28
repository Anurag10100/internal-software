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
// COURSES
// ==========================================

router.get('/courses', authenticateToken, async (req, res) => {
  try {
    const { category, difficulty_level, is_mandatory } = req.query;
    let q = req.supabase
      .from('courses')
      .select('*, instructor:users!instructor_id(name), created_by_user:users!created_by(name)')
      .eq('is_active', 1)
      .order('created_at', { ascending: false });
    if (category) q = q.eq('category', category);
    if (difficulty_level) q = q.eq('difficulty_level', difficulty_level);
    if (is_mandatory === 'true') q = q.eq('is_mandatory', 1);
    const { data: courses, error } = await q;
    if (error) throw error;
    const list = courses || [];
    const courseIds = list.map((c) => c.id);
    const [enrollCounts, moduleCounts] = await Promise.all([
      courseIds.length ? req.supabase.from('course_enrollments').select('course_id').in('course_id', courseIds) : { data: [] },
      courseIds.length ? req.supabase.from('course_modules').select('course_id').in('course_id', courseIds) : { data: [] },
    ]);
    const enrolledByCourse = (enrollCounts.data || []).reduce((acc, r) => { acc[r.course_id] = (acc[r.course_id] || 0) + 1; return acc; }, {});
    const modulesByCourse = (moduleCounts.data || []).reduce((acc, r) => { acc[r.course_id] = (acc[r.course_id] || 0) + 1; return acc; }, {});
    const formatted = list.map((c) => ({
      ...c,
      instructor_name: c.instructor?.name,
      created_by_name: c.created_by_user?.name,
      enrolled_count: enrolledByCourse[c.id] || 0,
      modules_count: modulesByCourse[c.id] || 0,
      instructor: undefined,
      created_by_user: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

router.get('/courses/:id', authenticateToken, async (req, res) => {
  try {
    const { data: course, error } = await req.supabase
      .from('courses')
      .select('*, instructor:users!instructor_id(name)')
      .eq('id', req.params.id)
      .single();
    if (error || !course) {
      if (error?.code === 'PGRST116') return res.status(404).json({ error: 'Course not found' });
      throw error || new Error('Not found');
    }
    const instructor_name = course.instructor?.name;
    delete course.instructor;
    const { data: modules } = await req.supabase.from('course_modules').select('*').eq('course_id', req.params.id).order('order_index', { ascending: true });
    course.modules = modules || [];
    const { data: enrollment } = await req.supabase.from('course_enrollments').select('*').eq('course_id', req.params.id).eq('user_id', req.user.id).maybeSingle();
    if (enrollment) {
      course.enrollment = enrollment;
      const { data: moduleProgress } = await req.supabase.from('module_progress').select('*').eq('enrollment_id', enrollment.id);
      course.moduleProgress = moduleProgress || [];
    }
    course.instructor_name = instructor_name;
    res.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

router.post('/courses', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, description, category, skill_tags, instructor, instructor_id, duration_hours, course_type, difficulty_level, content_url, thumbnail_url, syllabus, prerequisites, max_participants, is_mandatory } = req.body;
    const id = `course-${uuidv4()}`;
    const { error } = await req.supabase.from('courses').insert({
      id, title, description, category, skill_tags, instructor, instructor_id, duration_hours,
      course_type: course_type || 'online', difficulty_level: difficulty_level || 'beginner', content_url, thumbnail_url, syllabus, prerequisites, max_participants,
      is_mandatory: is_mandatory ? 1 : 0, created_by: req.user.id,
    });
    if (error) throw error;
    const { data: course, error: e2 } = await req.supabase.from('courses').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

router.put('/courses/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, description, category, skill_tags, instructor, instructor_id, duration_hours, course_type, difficulty_level, content_url, thumbnail_url, syllabus, prerequisites, max_participants, is_mandatory, is_active } = req.body;
    const { error } = await req.supabase.from('courses').update({
      title, description, category, skill_tags, instructor, instructor_id, duration_hours, course_type, difficulty_level, content_url, thumbnail_url, syllabus, prerequisites, max_participants,
      is_mandatory: is_mandatory ? 1 : 0, is_active: is_active ? 1 : 0,
    }).eq('id', req.params.id);
    if (error) throw error;
    const { data: course, error: e2 } = await req.supabase.from('courses').select('*').eq('id', req.params.id).single();
    if (e2) throw e2;
    res.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

router.post('/courses/:id/modules', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, description, content_type, content_url, duration_minutes, order_index, is_mandatory } = req.body;
    const id = `mod-${uuidv4()}`;
    const { error } = await req.supabase.from('course_modules').insert({
      id, course_id: req.params.id, title, description, content_type: content_type || 'video', content_url, duration_minutes, order_index: order_index ?? 0, is_mandatory: is_mandatory !== false ? 1 : 0,
    });
    if (error) throw error;
    const { data: module, error: e2 } = await req.supabase.from('course_modules').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(module);
  } catch (error) {
    console.error('Error creating module:', error);
    res.status(500).json({ error: 'Failed to create module' });
  }
});

// ==========================================
// ENROLLMENTS
// ==========================================

router.get('/enrollments/my-enrollments', authenticateToken, async (req, res) => {
  try {
    const { data: enrollments, error } = await req.supabase
      .from('course_enrollments')
      .select('*, course:courses!course_id(title, description, category, duration_hours, thumbnail_url, difficulty_level)')
      .eq('user_id', req.user.id)
      .order('enrolled_at', { ascending: false });
    if (error) throw error;
    const list = enrollments || [];
    const enrollIds = list.map((e) => e.id);
    const { data: moduleCounts } = enrollIds.length ? await req.supabase.from('module_progress').select('enrollment_id, status').in('enrollment_id', enrollIds) : { data: [] };
    const totalByEnroll = {};
    const completedByEnroll = {};
    (moduleCounts || []).forEach((r) => {
      totalByEnroll[r.enrollment_id] = (totalByEnroll[r.enrollment_id] || 0) + 1;
      if (r.status === 'completed') completedByEnroll[r.enrollment_id] = (completedByEnroll[r.enrollment_id] || 0) + 1;
    });
    const courseIds = [...new Set(list.map((e) => e.course_id))];
    const { data: modsPerCourse } = await req.supabase.from('course_modules').select('course_id').in('course_id', courseIds);
    const totalModulesByCourse = (modsPerCourse || []).reduce((acc, r) => { acc[r.course_id] = (acc[r.course_id] || 0) + 1; return acc; }, {});
    const formatted = list.map((e) => ({
      ...e,
      course_title: e.course?.title,
      course_description: e.course?.description,
      category: e.course?.category,
      duration_hours: e.course?.duration_hours,
      thumbnail_url: e.course?.thumbnail_url,
      difficulty_level: e.course?.difficulty_level,
      total_modules: totalModulesByCourse[e.course_id] || 0,
      completed_modules: completedByEnroll[e.id] || 0,
      course: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

router.get('/enrollments', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { course_id, status } = req.query;
    let q = req.supabase
      .from('course_enrollments')
      .select('*, course:courses!course_id(title), user:users!user_id(name, department)')
      .order('enrolled_at', { ascending: false });
    if (course_id) q = q.eq('course_id', course_id);
    if (status) q = q.eq('status', status);
    const { data: enrollments, error } = await q;
    if (error) throw error;
    const formatted = (enrollments || []).map((e) => ({
      ...e,
      course_title: e.course?.title,
      user_name: e.user?.name,
      department: e.user?.department,
      course: undefined,
      user: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

router.post('/enrollments', authenticateToken, async (req, res) => {
  try {
    const { course_id } = req.body;
    const { data: existing } = await req.supabase.from('course_enrollments').select('id').eq('course_id', course_id).eq('user_id', req.user.id).maybeSingle();
    if (existing) return res.status(400).json({ error: 'Already enrolled' });
    const { data: course } = await req.supabase.from('courses').select('max_participants').eq('id', course_id).single();
    if (course?.max_participants) {
      const { count } = await req.supabase.from('course_enrollments').select('*', { count: 'exact', head: true }).eq('course_id', course_id);
      if (count >= course.max_participants) return res.status(400).json({ error: 'Course is full' });
    }
    const id = `enroll-${uuidv4()}`;
    const { error } = await req.supabase.from('course_enrollments').insert({ id, course_id, user_id: req.user.id });
    if (error) throw error;
    const { data: modules } = await req.supabase.from('course_modules').select('id').eq('course_id', course_id);
    if (modules?.length) {
      const rows = modules.map((m) => ({ id: `mp-${uuidv4()}`, enrollment_id: id, module_id: m.id, status: 'not_started' }));
      await req.supabase.from('module_progress').insert(rows);
    }
    const { data: enrollment, error: e2 } = await req.supabase.from('course_enrollments').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(enrollment);
  } catch (error) {
    console.error('Error enrolling:', error);
    res.status(500).json({ error: 'Failed to enroll' });
  }
});

router.post('/enrollments/:id/progress', authenticateToken, async (req, res) => {
  try {
    const { module_id, status, time_spent_minutes } = req.body;
    const { data: enrollment, error: fe } = await req.supabase.from('course_enrollments').select('*').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (fe || !enrollment) return res.status(403).json({ error: 'Not authorized' });
    const now = new Date().toISOString();
    const { data: currentProg } = await req.supabase.from('module_progress').select('started_at, time_spent_minutes').eq('enrollment_id', req.params.id).eq('module_id', module_id).single();
    const updates = { status, started_at: currentProg?.started_at || now };
    if (status === 'completed') updates.completed_at = now;
    updates.time_spent_minutes = (currentProg?.time_spent_minutes || 0) + (time_spent_minutes || 0);
    const { error: upErr } = await req.supabase.from('module_progress').update(updates).eq('enrollment_id', req.params.id).eq('module_id', module_id);
    if (upErr) throw upErr;
    const { data: allProg } = await req.supabase.from('module_progress').select('status').eq('enrollment_id', req.params.id);
    const total = (allProg || []).length;
    const completed = (allProg || []).filter((p) => p.status === 'completed').length;
    const progress = total ? Math.round((completed / total) * 100) : 0;
    let enrollmentStatus = enrollment.status;
    if (progress > 0 && enrollmentStatus === 'enrolled') enrollmentStatus = 'in_progress';
    if (progress === 100) enrollmentStatus = 'completed';
    await req.supabase.from('course_enrollments').update({
      progress_percentage: progress,
      status: enrollmentStatus,
      ...(progress > 0 && enrollmentStatus === 'in_progress' ? { started_at: now } : {}),
      ...(progress === 100 ? { completed_at: now } : {}),
    }).eq('id', req.params.id);
    res.json({ message: 'Progress updated', progress_percentage: progress });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// ==========================================
// SKILLS
// ==========================================

router.get('/skills', authenticateToken, async (req, res) => {
  try {
    const { data: skills, error } = await req.supabase.from('skills').select('*').eq('is_active', 1).order('category').order('name');
    if (error) throw error;
    const list = skills || [];
    const skillIds = list.map((s) => s.id);
    const { data: empSkills } = skillIds.length ? await req.supabase.from('employee_skills').select('skill_id').in('skill_id', skillIds) : { data: [] };
    const countBySkill = (empSkills || []).reduce((acc, r) => { acc[r.skill_id] = (acc[r.skill_id] || 0) + 1; return acc; }, {});
    const formatted = list.map((s) => ({ ...s, employees_count: countBySkill[s.id] || 0 }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

router.post('/skills', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, category, description } = req.body;
    const id = `skill-${uuidv4()}`;
    const { error } = await req.supabase.from('skills').insert({ id, name, category, description });
    if (error) throw error;
    const { data: skill, error: e2 } = await req.supabase.from('skills').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(skill);
  } catch (error) {
    console.error('Error creating skill:', error);
    res.status(500).json({ error: 'Failed to create skill' });
  }
});

router.get('/skills/my-skills', authenticateToken, async (req, res) => {
  try {
    const { data: items, error } = await req.supabase
      .from('employee_skills')
      .select('*, skill:skills!skill_id(name, category), verified_by_user:users!verified_by(name)')
      .eq('user_id', req.user.id)
      .order('is_primary', { ascending: false })
      .order('category', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw error;
    const formatted = (items || []).map((e) => ({
      ...e,
      skill_name: e.skill?.name,
      category: e.skill?.category,
      verified_by_name: e.verified_by_user?.name,
      skill: undefined,
      verified_by_user: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

router.get('/skills/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { data: items, error } = await req.supabase
      .from('employee_skills')
      .select('*, skill:skills!skill_id(name, category), verified_by_user:users!verified_by(name)')
      .eq('user_id', req.params.userId)
      .order('is_primary', { ascending: false });
    if (error) throw error;
    const formatted = (items || []).map((e) => ({
      ...e,
      skill_name: e.skill?.name,
      category: e.skill?.category,
      verified_by_name: e.verified_by_user?.name,
      skill: undefined,
      verified_by_user: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

router.post('/skills/my-skills', authenticateToken, async (req, res) => {
  try {
    const { skill_id, proficiency_level, years_experience, is_primary, last_used_at } = req.body;
    const { data: existing } = await req.supabase.from('employee_skills').select('id').eq('user_id', req.user.id).eq('skill_id', skill_id).maybeSingle();
    if (existing) {
      await req.supabase.from('employee_skills').update({
        proficiency_level, years_experience, is_primary: is_primary ? 1 : 0, last_used_at,
      }).eq('id', existing.id);
    } else {
      const id = `es-${uuidv4()}`;
      await req.supabase.from('employee_skills').insert({
        id, user_id: req.user.id, skill_id, proficiency_level: proficiency_level || 'beginner', years_experience, is_primary: is_primary ? 1 : 0, last_used_at,
      });
    }
    res.json({ message: 'Skill saved' });
  } catch (error) {
    console.error('Error saving skill:', error);
    res.status(500).json({ error: 'Failed to save skill' });
  }
});

router.post('/skills/:id/verify', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { error } = await req.supabase.from('employee_skills').update({ verified_by: req.user.id, verified_at: new Date().toISOString() }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Skill verified' });
  } catch (error) {
    console.error('Error verifying skill:', error);
    res.status(500).json({ error: 'Failed to verify skill' });
  }
});

// ==========================================
// CERTIFICATIONS
// ==========================================

router.get('/certifications', authenticateToken, async (req, res) => {
  try {
    const { data: certifications, error } = await req.supabase.from('certifications').select('*').eq('is_active', 1).order('name');
    if (error) throw error;
    res.json(certifications || []);
  } catch (error) {
    console.error('Error fetching certifications:', error);
    res.status(500).json({ error: 'Failed to fetch certifications' });
  }
});

router.get('/certifications/my-certifications', authenticateToken, async (req, res) => {
  try {
    const { data: items, error } = await req.supabase
      .from('employee_certifications')
      .select('*, certification:certifications!certification_id(name, issuing_organization)')
      .eq('user_id', req.user.id)
      .order('issue_date', { ascending: false });
    if (error) throw error;
    const formatted = (items || []).map((e) => ({
      ...e,
      certification_name: e.certification?.name,
      issuing_organization: e.certification?.issuing_organization,
      certification: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching certifications:', error);
    res.status(500).json({ error: 'Failed to fetch certifications' });
  }
});

router.post('/certifications/my-certifications', authenticateToken, async (req, res) => {
  try {
    const { certification_id, credential_id, issue_date, expiry_date, certificate_url, verification_url } = req.body;
    const id = `ec-${uuidv4()}`;
    const { error } = await req.supabase.from('employee_certifications').insert({
      id, user_id: req.user.id, certification_id, credential_id, issue_date, expiry_date, certificate_url, verification_url,
    });
    if (error) throw error;
    const { data: item, error: e2 } = await req.supabase
      .from('employee_certifications')
      .select('*, certification:certifications!certification_id(name)')
      .eq('id', id)
      .single();
    if (e2) throw e2;
    const out = { ...item, certification_name: item.certification?.name, certification: undefined };
    res.status(201).json(out);
  } catch (error) {
    console.error('Error adding certification:', error);
    res.status(500).json({ error: 'Failed to add certification' });
  }
});

// ==========================================
// LEARNING PATHS
// ==========================================

router.get('/paths', authenticateToken, async (req, res) => {
  try {
    const { data: paths, error } = await req.supabase
      .from('learning_paths')
      .select('*, created_by_user:users!created_by(name)')
      .eq('is_active', 1)
      .order('title');
    if (error) throw error;
    const list = paths || [];
    const pathIds = list.map((p) => p.id);
    const [coursesCount, enrolledCount] = await Promise.all([
      pathIds.length ? req.supabase.from('learning_path_courses').select('learning_path_id').in('learning_path_id', pathIds) : { data: [] },
      pathIds.length ? req.supabase.from('employee_learning_paths').select('learning_path_id').in('learning_path_id', pathIds) : { data: [] },
    ]);
    const coursesByPath = (coursesCount.data || []).reduce((acc, r) => { acc[r.learning_path_id] = (acc[r.learning_path_id] || 0) + 1; return acc; }, {});
    const enrolledByPath = (enrolledCount.data || []).reduce((acc, r) => { acc[r.learning_path_id] = (acc[r.learning_path_id] || 0) + 1; return acc; }, {});
    const withCourses = await Promise.all(list.map(async (path) => {
      const { data: pathCourses } = await req.supabase.from('learning_path_courses').select('*, course:courses!course_id(title, description, duration_hours, difficulty_level, thumbnail_url)').eq('learning_path_id', path.id).order('order_index');
      return {
        ...path,
        created_by_name: path.created_by_user?.name,
        courses_count: coursesByPath[path.id] || 0,
        enrolled_count: enrolledByPath[path.id] || 0,
        courses: (pathCourses || []).map((pc) => ({ ...pc, title: pc.course?.title, description: pc.course?.description, duration_hours: pc.course?.duration_hours, difficulty_level: pc.course?.difficulty_level, thumbnail_url: pc.course?.thumbnail_url })),
        created_by_user: undefined,
      };
    }));
    res.json(withCourses);
  } catch (error) {
    console.error('Error fetching paths:', error);
    res.status(500).json({ error: 'Failed to fetch paths' });
  }
});

router.get('/paths/my-paths', authenticateToken, async (req, res) => {
  try {
    const { data: list, error } = await req.supabase
      .from('employee_learning_paths')
      .select('*, path:learning_paths!learning_path_id(title, description, estimated_hours, difficulty_level), assigned_by_user:users!assigned_by(name)')
      .eq('user_id', req.user.id)
      .order('assigned_at', { ascending: false });
    if (error) throw error;
    const formatted = (list || []).map((e) => ({
      ...e,
      title: e.path?.title,
      description: e.path?.description,
      estimated_hours: e.path?.estimated_hours,
      difficulty_level: e.path?.difficulty_level,
      assigned_by_name: e.assigned_by_user?.name,
      path: undefined,
      assigned_by_user: undefined,
    }));
    for (const path of formatted) {
      const { data: pathCourses } = await req.supabase
        .from('learning_path_courses')
        .select('course_id, course:courses!course_id(title)')
        .eq('learning_path_id', path.learning_path_id)
        .order('order_index');
      const courseIds = (pathCourses || []).map((c) => c.course_id);
      const { data: enrollments } = await req.supabase.from('course_enrollments').select('course_id, status, progress_percentage').eq('user_id', req.user.id).in('course_id', courseIds);
      const enrollMap = new Map((enrollments || []).map((e) => [e.course_id, e]));
      path.courses = (pathCourses || []).map((pc) => ({
        course_id: pc.course_id,
        title: pc.course?.title,
        enrollment_status: enrollMap.get(pc.course_id)?.status,
        progress_percentage: enrollMap.get(pc.course_id)?.progress_percentage,
      }));
    }
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching paths:', error);
    res.status(500).json({ error: 'Failed to fetch paths' });
  }
});

router.post('/paths', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, description, target_role, skill_tags, estimated_hours, difficulty_level, course_ids } = req.body;
    const id = `lp-${uuidv4()}`;
    const { error } = await req.supabase.from('learning_paths').insert({
      id, title, description, target_role, skill_tags, estimated_hours, difficulty_level: difficulty_level || 'intermediate', created_by: req.user.id,
    });
    if (error) throw error;
    if (course_ids?.length) {
      const rows = course_ids.map((courseId, index) => ({ id: `lpc-${uuidv4()}`, learning_path_id: id, course_id: courseId, order_index: index, is_mandatory: 1 }));
      await req.supabase.from('learning_path_courses').insert(rows);
    }
    const { data: path, error: e2 } = await req.supabase.from('learning_paths').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(path);
  } catch (error) {
    console.error('Error creating path:', error);
    res.status(500).json({ error: 'Failed to create path' });
  }
});

router.post('/paths/:id/assign', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { user_id, target_completion_date } = req.body;
    const { data: existing } = await req.supabase.from('employee_learning_paths').select('id').eq('learning_path_id', req.params.id).eq('user_id', user_id).maybeSingle();
    if (existing) return res.status(400).json({ error: 'Already assigned' });
    const id = `elp-${uuidv4()}`;
    const { error } = await req.supabase.from('employee_learning_paths').insert({
      id, user_id, learning_path_id: req.params.id, assigned_by: req.user.id, target_completion_date,
    });
    if (error) throw error;
    res.json({ message: 'Learning path assigned' });
  } catch (error) {
    console.error('Error assigning path:', error);
    res.status(500).json({ error: 'Failed to assign path' });
  }
});

// ==========================================
// TRAINING SESSIONS
// ==========================================

router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const { date, status } = req.query;
    let q = req.supabase
      .from('training_sessions')
      .select('*, course:courses!course_id(title), trainer:users!trainer_id(name), created_by_user:users!created_by(name)')
      .order('session_date', { ascending: false })
      .order('start_time');
    if (date) q = q.eq('session_date', date);
    if (status) q = q.eq('status', status);
    const { data: sessions, error } = await q;
    if (error) throw error;
    const list = sessions || [];
    const sessionIds = list.map((s) => s.id);
    const { data: regs } = sessionIds.length ? await req.supabase.from('training_registrations').select('session_id').in('session_id', sessionIds) : { data: [] };
    const countBySession = (regs || []).reduce((acc, r) => { acc[r.session_id] = (acc[r.session_id] || 0) + 1; return acc; }, {});
    const formatted = list.map((s) => ({
      ...s,
      course_title: s.course?.title,
      trainer_name: s.trainer?.name,
      created_by_name: s.created_by_user?.name,
      registered_count: countBySession[s.id] || 0,
      course: undefined,
      trainer: undefined,
      created_by_user: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.get('/sessions/upcoming', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data: sessions, error } = await req.supabase
      .from('training_sessions')
      .select('*, course:courses!course_id(title), trainer:users!trainer_id(name)')
      .gte('session_date', today)
      .eq('status', 'scheduled')
      .order('session_date')
      .order('start_time');
    if (error) throw error;
    const list = sessions || [];
    const sessionIds = list.map((s) => s.id);
    const [regCounts, myRegs] = await Promise.all([
      sessionIds.length ? req.supabase.from('training_registrations').select('session_id').in('session_id', sessionIds) : { data: [] },
      sessionIds.length ? req.supabase.from('training_registrations').select('session_id, id').eq('user_id', req.user.id).in('session_id', sessionIds) : { data: [] },
    ]);
    const countBySession = (regCounts.data || []).reduce((acc, r) => { acc[r.session_id] = (acc[r.session_id] || 0) + 1; return acc; }, {});
    const myRegBySession = new Map((myRegs.data || []).map((r) => [r.session_id, r.id]));
    const formatted = list.map((s) => ({
      ...s,
      course_title: s.course?.title,
      trainer_name: s.trainer?.name,
      registered_count: countBySession[s.id] || 0,
      my_registration: myRegBySession.get(s.id),
      course: undefined,
      trainer: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.post('/sessions', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { course_id, title, description, trainer_id, trainer_name, session_date, start_time, end_time, location, meeting_link, max_participants } = req.body;
    const id = `ts-${uuidv4()}`;
    const { error } = await req.supabase.from('training_sessions').insert({
      id, course_id, title, description, trainer_id, trainer_name, session_date, start_time, end_time, location, meeting_link, max_participants, created_by: req.user.id,
    });
    if (error) throw error;
    const { data: session, error: e2 } = await req.supabase.from('training_sessions').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

router.post('/sessions/:id/register', authenticateToken, async (req, res) => {
  try {
    const { data: existing } = await req.supabase.from('training_registrations').select('id').eq('session_id', req.params.id).eq('user_id', req.user.id).maybeSingle();
    if (existing) return res.status(400).json({ error: 'Already registered' });
    const { data: session } = await req.supabase.from('training_sessions').select('max_participants').eq('id', req.params.id).single();
    if (session?.max_participants) {
      const { count } = await req.supabase.from('training_registrations').select('*', { count: 'exact', head: true }).eq('session_id', req.params.id);
      if (count >= session.max_participants) return res.status(400).json({ error: 'Session is full' });
    }
    const id = `tr-${uuidv4()}`;
    const { error } = await req.supabase.from('training_registrations').insert({ id, session_id: req.params.id, user_id: req.user.id });
    if (error) throw error;
    res.json({ message: 'Registered successfully' });
  } catch (error) {
    console.error('Error registering:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
});

router.post('/sessions/:id/feedback', authenticateToken, async (req, res) => {
  try {
    const { feedback_rating, feedback_comments } = req.body;
    const { error } = await req.supabase.from('training_registrations').update({
      feedback_rating, feedback_comments, attended: 1,
    }).eq('session_id', req.params.id).eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Feedback submitted' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// ==========================================
// LEARNING DASHBOARD
// ==========================================

router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdminUser = req.user.role === 'admin';
    const [
      coursesEnrolledRes,
      coursesCompletedRes,
      coursesInProgressRes,
      skillsCountRes,
      certsCountRes,
      pathsCountRes,
      upcomingSessionsRes,
      totalHoursRes,
    ] = await Promise.all([
      req.supabase.from('course_enrollments').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      req.supabase.from('course_enrollments').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed'),
      req.supabase.from('course_enrollments').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'in_progress'),
      req.supabase.from('employee_skills').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      req.supabase.from('employee_certifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active'),
      req.supabase.from('employee_learning_paths').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      req.supabase.from('training_registrations').select('session_id').eq('user_id', userId).then(async (r) => {
        const sessionIds = (r.data || []).map((x) => x.session_id);
        if (!sessionIds.length) return { count: 0 };
        const today = new Date().toISOString().slice(0, 10);
        const { count } = await req.supabase.from('training_sessions').select('*', { count: 'exact', head: true }).in('id', sessionIds).gte('session_date', today);
        return { count: count ?? 0 };
      }),
      req.supabase.from('course_enrollments').select('course_id, progress_percentage').eq('user_id', userId).then(async (r) => {
        const enrolls = r.data || [];
        if (!enrolls.length) return { hours: 0 };
        const courseIds = enrolls.map((e) => e.course_id);
        const { data: courses } = await req.supabase.from('courses').select('id, duration_hours').in('id', courseIds);
        const courseMap = new Map((courses || []).map((c) => [c.id, c.duration_hours || 0]));
        let hours = 0;
        enrolls.forEach((e) => { hours += (courseMap.get(e.course_id) || 0) * (e.progress_percentage || 0) / 100; });
        return { hours };
      }),
    ]);
    const myStats = {
      coursesEnrolled: coursesEnrolledRes.count ?? 0,
      coursesCompleted: coursesCompletedRes.count ?? 0,
      coursesInProgress: coursesInProgressRes.count ?? 0,
      skillsCount: skillsCountRes.count ?? 0,
      certificationsCount: certsCountRes.count ?? 0,
      learningPathsAssigned: pathsCountRes.count ?? 0,
      upcomingSessions: upcomingSessionsRes?.count ?? 0,
      totalLearningHours: totalHoursRes?.hours ?? 0,
    };
    let orgStats = null;
    if (isAdminUser) {
      const [totalCourses, totalEnrollments, enrollList, activeSessions, skillsInSystem, certsExpiring] = await Promise.all([
        req.supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_active', 1),
        req.supabase.from('course_enrollments').select('*', { count: 'exact', head: true }),
        req.supabase.from('course_enrollments').select('status'),
        req.supabase.from('training_sessions').select('*', { count: 'exact', head: true }).gte('session_date', new Date().toISOString().slice(0, 10)).eq('status', 'scheduled'),
        req.supabase.from('skills').select('*', { count: 'exact', head: true }).eq('is_active', 1),
        req.supabase.from('employee_certifications').select('id').not('expiry_date', 'is', null).gte('expiry_date', new Date().toISOString().slice(0, 10)).lte('expiry_date', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
      ]);
      const enrollListData = enrollList.data || [];
      const completed = enrollListData.filter((e) => e.status === 'completed').length;
      const total = enrollListData.length;
      orgStats = {
        totalCourses: totalCourses.count ?? 0,
        totalEnrollments: totalEnrollments.count ?? 0,
        completionRate: total ? Math.round((completed / total) * 1000) / 10 : 0,
        activeTrainingSessions: activeSessions.count ?? 0,
        skillsInSystem: skillsInSystem.count ?? 0,
        certificationsExpiringSoon: (certsExpiring.data || []).length,
      };
    }
    res.json({ myStats, orgStats });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
