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

    console.log('Default data seeded successfully!');
  }
}

module.exports = { db, initializeDatabase };
