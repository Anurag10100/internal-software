const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'data', 'database.sqlite');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      department TEXT NOT NULL,
      designation TEXT,
      role TEXT DEFAULT 'employee',
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      assigned_by_user_id TEXT NOT NULL,
      assigned_to_user_id TEXT NOT NULL,
      due_date TEXT NOT NULL,
      due_time TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_by_user_id) REFERENCES users(id),
      FOREIGN KEY (assigned_to_user_id) REFERENCES users(id)
    )
  `);

  // Leave requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      leave_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      approved_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Check-ins table
  db.exec(`
    CREATE TABLE IF NOT EXISTS check_ins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      check_in_time TEXT,
      check_out_time TEXT,
      location TEXT,
      status TEXT DEFAULT 'present',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Team members table (for team management)
  db.exec(`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      profile TEXT DEFAULT 'Standard',
      in_probation INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Active',
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // HRMS Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS hrms_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      late_time TEXT DEFAULT '10:30 AM',
      half_day_time TEXT DEFAULT '11:00 AM',
      settings_json TEXT
    )
  `);

  // ==========================================
  // PROBATION MANAGEMENT TABLES
  // ==========================================

  // Probations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS probations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      duration_days INTEGER DEFAULT 90,
      status TEXT DEFAULT 'ongoing',
      extended_till TEXT,
      extension_reason TEXT,
      confirmed_by TEXT,
      confirmed_at TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (confirmed_by) REFERENCES users(id)
    )
  `);

  // Probation reviews table
  db.exec(`
    CREATE TABLE IF NOT EXISTS probation_reviews (
      id TEXT PRIMARY KEY,
      probation_id TEXT NOT NULL,
      reviewer_id TEXT NOT NULL,
      review_date TEXT NOT NULL,
      milestone TEXT,
      rating INTEGER,
      feedback TEXT,
      recommendation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (probation_id) REFERENCES probations(id),
      FOREIGN KEY (reviewer_id) REFERENCES users(id)
    )
  `);

  // Probation checklists table
  db.exec(`
    CREATE TABLE IF NOT EXISTS probation_checklists (
      id TEXT PRIMARY KEY,
      probation_id TEXT NOT NULL,
      item TEXT NOT NULL,
      is_completed INTEGER DEFAULT 0,
      completed_at TEXT,
      completed_by TEXT,
      FOREIGN KEY (probation_id) REFERENCES probations(id)
    )
  `);

  // ==========================================
  // APPRAISAL SYSTEM TABLES
  // ==========================================

  // Appraisal cycles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS appraisal_cycles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Appraisals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS appraisals (
      id TEXT PRIMARY KEY,
      cycle_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      manager_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      self_rating REAL,
      manager_rating REAL,
      final_rating REAL,
      self_comments TEXT,
      manager_comments TEXT,
      submitted_at TEXT,
      reviewed_at TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cycle_id) REFERENCES appraisal_cycles(id),
      FOREIGN KEY (employee_id) REFERENCES users(id),
      FOREIGN KEY (manager_id) REFERENCES users(id)
    )
  `);

  // Goals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      appraisal_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      target_date TEXT,
      weightage INTEGER DEFAULT 0,
      progress INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      self_rating INTEGER,
      manager_rating INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (appraisal_id) REFERENCES appraisals(id)
    )
  `);

  // 360 Feedback table
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback_360 (
      id TEXT PRIMARY KEY,
      appraisal_id TEXT NOT NULL,
      reviewer_id TEXT NOT NULL,
      reviewer_type TEXT,
      rating INTEGER,
      strengths TEXT,
      improvements TEXT,
      comments TEXT,
      is_anonymous INTEGER DEFAULT 1,
      submitted_at TEXT,
      FOREIGN KEY (appraisal_id) REFERENCES appraisals(id),
      FOREIGN KEY (reviewer_id) REFERENCES users(id)
    )
  `);

  // ==========================================
  // PERFORMANCE MANAGEMENT TABLES
  // ==========================================

  // KPIs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS kpis (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      metric_type TEXT,
      target_value REAL,
      current_value REAL DEFAULT 0,
      unit TEXT,
      period TEXT,
      status TEXT DEFAULT 'on_track',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Performance notes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS performance_notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      type TEXT,
      content TEXT NOT NULL,
      is_private INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  // PIPs table (Performance Improvement Plans)
  db.exec(`
    CREATE TABLE IF NOT EXISTS pips (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      manager_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      goals TEXT,
      status TEXT DEFAULT 'active',
      outcome TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (manager_id) REFERENCES users(id)
    )
  `);

  // PIP checkpoints table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pip_checkpoints (
      id TEXT PRIMARY KEY,
      pip_id TEXT NOT NULL,
      checkpoint_date TEXT NOT NULL,
      progress_notes TEXT,
      rating INTEGER,
      reviewed_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pip_id) REFERENCES pips(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    )
  `);

  // Recognitions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS recognitions (
      id TEXT PRIMARY KEY,
      recipient_id TEXT NOT NULL,
      nominator_id TEXT NOT NULL,
      type TEXT,
      badge TEXT,
      title TEXT,
      message TEXT,
      is_public INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recipient_id) REFERENCES users(id),
      FOREIGN KEY (nominator_id) REFERENCES users(id)
    )
  `);

  // Seed default data if empty
  seedDefaultData();
}

function seedDefaultData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();

  if (userCount.count === 0) {
    console.log('Seeding default data...');

    // Create default users
    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, password, department, designation, role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const hashedPassword = bcrypt.hashSync('admin123', 10);
    const userPassword = bcrypt.hashSync('user123', 10);

    // Admin users
    insertUser.run('admin-1', 'Sachin Talwar', 'admin@wowevents.com', hashedPassword, 'Management', 'CEO', 'admin');
    insertUser.run('admin-2', 'Priya Sharma', 'hr@wowevents.com', hashedPassword, 'HR', 'HR Manager', 'admin');

    // Employee users
    insertUser.run('user-1', 'Amit Talwar', 'amit@wowevents.com', userPassword, 'Tech', 'Tech Lead', 'employee');
    insertUser.run('user-2', 'Neeti Choudhary', 'neeti@wowevents.com', userPassword, 'Concept & Copy', 'Content Writer', 'employee');
    insertUser.run('user-3', 'Animesh', 'animesh@wowevents.com', userPassword, '2D', 'Graphic Designer', 'employee');
    insertUser.run('user-4', 'Rahul Kumar', 'rahul@wowevents.com', userPassword, '3D', '3D Artist', 'employee');
    insertUser.run('user-5', 'Tarun Fuloria', 'tarun@wowevents.com', userPassword, 'Tech', 'Developer', 'employee');
    insertUser.run('user-6', 'Mahima', 'mahima@wowevents.com', userPassword, 'Concept & Copy', 'Copywriter', 'employee');

    // Add team members
    const insertTeamMember = db.prepare(`
      INSERT INTO team_members (id, user_id, profile, in_probation, status)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertTeamMember.run('tm-1', 'admin-1', 'Admin', 0, 'Active');
    insertTeamMember.run('tm-2', 'admin-2', 'Admin', 0, 'Active');
    insertTeamMember.run('tm-3', 'user-1', 'Manager', 0, 'Active');
    insertTeamMember.run('tm-4', 'user-2', 'Standard', 0, 'Active');
    insertTeamMember.run('tm-5', 'user-3', 'Standard', 0, 'Active');
    insertTeamMember.run('tm-6', 'user-4', 'Standard', 1, 'Active');
    insertTeamMember.run('tm-7', 'user-5', 'Standard', 0, 'Active');
    insertTeamMember.run('tm-8', 'user-6', 'Standard', 1, 'Active');

    // Seed some tasks
    const insertTask = db.prepare(`
      INSERT INTO tasks (id, title, description, assigned_by_user_id, assigned_to_user_id, due_date, due_time, status, priority, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTask.run('task-1', 'Complete API Integration', 'Integrate the new payment API', 'admin-1', 'user-1', '2026-01-20', '5:00 PM', 'in_progress', 'high', 'tech,urgent');
    insertTask.run('task-2', 'Design Event Poster', 'Create poster for upcoming corporate event', 'admin-1', 'user-3', '2026-01-18', '3:00 PM', 'pending', 'medium', 'design,creative');
    insertTask.run('task-3', 'Write Blog Content', 'Write 3 blog posts for company website', 'admin-2', 'user-2', '2026-01-22', '6:00 PM', 'in_progress', 'low', 'content,marketing');
    insertTask.run('task-4', '3D Model Review', 'Review 3D models for client presentation', 'user-1', 'user-4', '2026-01-19', '2:00 PM', 'pending', 'high', '3d,review');
    insertTask.run('task-5', 'Update Dashboard UI', 'Implement new dashboard design', 'admin-1', 'user-5', '2026-01-25', '5:00 PM', 'pending', 'medium', 'tech,ui');
    insertTask.run('task-6', 'Social Media Copy', 'Write copy for social media campaign', 'admin-2', 'user-6', '2026-01-17', '4:00 PM', 'completed', 'medium', 'content,social');

    // Seed some leave requests
    const insertLeave = db.prepare(`
      INSERT INTO leave_requests (id, user_id, leave_type, start_date, end_date, reason, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertLeave.run('leave-1', 'user-1', 'Casual Leave', '2026-01-20', '2026-01-21', 'Family function', 'pending');
    insertLeave.run('leave-2', 'user-2', 'Sick Leave', '2026-01-15', '2026-01-15', 'Not feeling well', 'approved');
    insertLeave.run('leave-3', 'user-3', 'Work from Home', '2026-01-18', '2026-01-18', 'Internet installation at home', 'approved');

    // Seed HRMS settings
    const settingsJson = JSON.stringify({
      locationOptions: [
        { id: '1', name: 'In Office (Gurugram)', isVisible: true },
        { id: '2', name: 'In Office (Delhi)', isVisible: true },
        { id: '3', name: 'In Meeting', isVisible: true },
        { id: '4', name: 'Work From Home', isVisible: true },
        { id: '5', name: 'At Event', isVisible: true },
      ],
      leaveTypes: [
        { id: '1', name: 'Casual Leave', daysPerYear: 7, requiresDocument: false, isActive: true },
        { id: '2', name: 'Earned Leaves', daysPerYear: 12, requiresDocument: false, isActive: true },
        { id: '3', name: 'Sick Leave', daysPerYear: 7, requiresDocument: true, isActive: true },
        { id: '4', name: 'Unpaid Leave', daysPerYear: 'unlimited', requiresDocument: false, isActive: true },
        { id: '5', name: 'Work from Home', daysPerYear: 'unlimited', requiresDocument: false, isActive: true },
      ],
      weeklyOffSettings: {
        sunday: 'both_weeks',
        saturday: 'week1_only',
      },
      holidays: [
        { id: '1', name: 'New Year', date: '2026-01-01' },
        { id: '2', name: 'Republic Day', date: '2026-01-26' },
        { id: '3', name: 'Holi', date: '2026-03-04' },
        { id: '4', name: 'Independence Day', date: '2026-08-15' },
        { id: '5', name: 'Diwali', date: '2026-11-08' },
      ],
    });

    db.prepare(`INSERT INTO hrms_settings (id, late_time, half_day_time, settings_json) VALUES (1, '10:30 AM', '11:00 AM', ?)`).run(settingsJson);

    // Seed probations for users in probation
    const insertProbation = db.prepare(`
      INSERT INTO probations (id, user_id, start_date, end_date, duration_days, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertProbation.run('prob-1', 'user-4', '2025-11-01', '2026-01-30', 90, 'ongoing', 'New hire - 3D Artist');
    insertProbation.run('prob-2', 'user-6', '2025-12-01', '2026-02-28', 90, 'ongoing', 'New hire - Copywriter');

    // Seed probation checklists
    const insertChecklist = db.prepare(`
      INSERT INTO probation_checklists (id, probation_id, item, is_completed, completed_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertChecklist.run('pc-1', 'prob-1', 'Complete onboarding documentation', 1, '2025-11-05');
    insertChecklist.run('pc-2', 'prob-1', 'Set up workstation and tools', 1, '2025-11-03');
    insertChecklist.run('pc-3', 'prob-1', 'Complete 3D software training', 1, '2025-11-20');
    insertChecklist.run('pc-4', 'prob-1', 'First project assignment', 0, null);
    insertChecklist.run('pc-5', 'prob-1', '30-day review', 0, null);

    insertChecklist.run('pc-6', 'prob-2', 'Complete onboarding documentation', 1, '2025-12-05');
    insertChecklist.run('pc-7', 'prob-2', 'Set up workstation and tools', 1, '2025-12-03');
    insertChecklist.run('pc-8', 'prob-2', 'Brand guidelines training', 0, null);
    insertChecklist.run('pc-9', 'prob-2', 'First writing assignment', 0, null);

    // Seed probation reviews
    const insertReview = db.prepare(`
      INSERT INTO probation_reviews (id, probation_id, reviewer_id, review_date, milestone, rating, feedback, recommendation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertReview.run('pr-1', 'prob-1', 'admin-1', '2025-12-01', '30-day', 4, 'Good progress on technical skills. Needs to improve communication.', 'continue');

    // Seed goals
    const insertGoal = db.prepare(`
      INSERT INTO goals (id, user_id, title, description, category, target_date, weightage, progress, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertGoal.run('goal-1', 'user-1', 'Complete API Migration', 'Migrate all legacy APIs to new architecture', 'performance', '2026-03-31', 30, 45, 'active');
    insertGoal.run('goal-2', 'user-1', 'Learn Cloud Architecture', 'Complete AWS certification', 'learning', '2026-06-30', 20, 20, 'active');
    insertGoal.run('goal-3', 'user-2', 'Content Quality Score', 'Achieve 95% content quality score', 'performance', '2026-03-31', 40, 80, 'active');
    insertGoal.run('goal-4', 'user-3', 'Design System Update', 'Update all brand assets to new guidelines', 'project', '2026-02-28', 35, 60, 'active');
    insertGoal.run('goal-5', 'user-5', 'Code Coverage', 'Achieve 80% unit test coverage', 'performance', '2026-03-31', 25, 35, 'active');

    // Seed KPIs
    const insertKPI = db.prepare(`
      INSERT INTO kpis (id, user_id, title, description, metric_type, target_value, current_value, unit, period, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertKPI.run('kpi-1', 'user-1', 'Sprint Velocity', 'Story points completed per sprint', 'number', 40, 35, 'points', 'monthly', 'on_track');
    insertKPI.run('kpi-2', 'user-1', 'Bug Fix Rate', 'Bugs fixed within SLA', 'percentage', 95, 92, '%', 'monthly', 'at_risk');
    insertKPI.run('kpi-3', 'user-2', 'Content Output', 'Articles published per month', 'number', 8, 6, 'articles', 'monthly', 'on_track');
    insertKPI.run('kpi-4', 'user-3', 'Design Delivery', 'Designs delivered on time', 'percentage', 100, 100, '%', 'monthly', 'achieved');
    insertKPI.run('kpi-5', 'user-4', '3D Render Quality', 'Client approval rate', 'percentage', 90, 85, '%', 'monthly', 'on_track');
    insertKPI.run('kpi-6', 'user-5', 'Code Review Turnaround', 'Reviews completed within 24hrs', 'percentage', 90, 88, '%', 'monthly', 'on_track');

    // Seed performance notes
    const insertNote = db.prepare(`
      INSERT INTO performance_notes (id, user_id, author_id, type, content, is_private)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertNote.run('note-1', 'user-1', 'admin-1', 'praise', 'Excellent work on the payment integration. Delivered ahead of schedule!', 0);
    insertNote.run('note-2', 'user-3', 'admin-2', 'praise', 'The event poster designs were outstanding. Client loved them!', 0);
    insertNote.run('note-3', 'user-2', 'admin-2', 'observation', 'May need additional support on technical writing tasks.', 1);

    // Seed recognitions
    const insertRecognition = db.prepare(`
      INSERT INTO recognitions (id, recipient_id, nominator_id, type, badge, title, message, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertRecognition.run('rec-1', 'user-1', 'admin-1', 'award', 'star_performer', 'Star Performer', 'For exceptional work on Q4 projects!', 1);
    insertRecognition.run('rec-2', 'user-3', 'user-2', 'appreciation', 'team_player', 'Team Player', 'Always helpful and collaborative!', 1);
    insertRecognition.run('rec-3', 'user-2', 'admin-2', 'appreciation', 'innovator', 'Creative Excellence', 'Brought fresh ideas to content strategy!', 1);

    console.log('Default data seeded successfully!');
  }
}

module.exports = { db, initializeDatabase };
