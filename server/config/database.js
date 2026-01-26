const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const { createExtendedTables, seedExtendedData } = require('./schema-extensions');
const { createBoothPilotTables, seedBoothPilotData } = require('./boothpilot-schema');

// Determine database mode
const DATABASE_MODE = process.env.DATABASE_MODE || 'sqlite';
const useSupabase = DATABASE_MODE === 'supabase' &&
                    process.env.SUPABASE_URL &&
                    process.env.SUPABASE_SERVICE_ROLE_KEY;

let sqliteDb = null;
let supabase = null;

if (useSupabase) {
  console.log('🔌 Using Supabase (PostgreSQL) database');
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
} else {
  console.log('🔌 Using SQLite database');
  const dbPath = path.join(__dirname, '..', 'data', 'database.sqlite');
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('foreign_keys = ON');
}

// ==========================================
// UNIFIED DATABASE INTERFACE
// ==========================================

const db = {
  // Prepare and execute a query (returns object with get, all, run methods)
  prepare: (sql) => {
    if (useSupabase) {
      return createSupabaseStatement(sql);
    }
    return sqliteDb.prepare(sql);
  },

  // Execute raw SQL (for CREATE TABLE, etc.)
  exec: (sql) => {
    if (useSupabase) {
      // Supabase tables are created via migrations, skip exec
      return;
    }
    return sqliteDb.exec(sql);
  },

  // Pragma (SQLite only)
  pragma: (pragma) => {
    if (!useSupabase && sqliteDb) {
      return sqliteDb.pragma(pragma);
    }
  },

  // Transaction wrapper
  transaction: (fn) => {
    if (useSupabase) {
      // Supabase doesn't support client-side transactions the same way
      return () => fn();
    }
    return sqliteDb.transaction(fn);
  }
};

// ==========================================
// SUPABASE STATEMENT WRAPPER
// ==========================================

function createSupabaseStatement(sql) {
  return {
    get: async (...params) => {
      const result = await executeSupabaseQuery(sql, params, 'single');
      return result;
    },
    all: async (...params) => {
      const result = await executeSupabaseQuery(sql, params, 'all');
      return result || [];
    },
    run: async (...params) => {
      await executeSupabaseQuery(sql, params, 'run');
      return { changes: 1 };
    }
  };
}

async function executeSupabaseQuery(sql, params, mode) {
  const sqlLower = sql.trim().toLowerCase();

  try {
    // Parse SELECT queries
    if (sqlLower.startsWith('select')) {
      return await handleSelect(sql, params, mode);
    }

    // Parse INSERT queries
    if (sqlLower.startsWith('insert')) {
      return await handleInsert(sql, params);
    }

    // Parse UPDATE queries
    if (sqlLower.startsWith('update')) {
      return await handleUpdate(sql, params);
    }

    // Parse DELETE queries
    if (sqlLower.startsWith('delete')) {
      return await handleDelete(sql, params);
    }

    console.warn('Unhandled SQL query type:', sql.substring(0, 50));
    return mode === 'all' ? [] : null;

  } catch (error) {
    console.error('Supabase query error:', error.message);
    console.error('SQL:', sql.substring(0, 100));
    throw error;
  }
}

async function handleSelect(sql, params, mode) {
  // Extract table name and parse query
  const tableMatch = sql.match(/from\s+(\w+)/i);
  if (!tableMatch) {
    console.error('Could not parse table from SELECT:', sql);
    return mode === 'all' ? [] : null;
  }

  const tableName = tableMatch[1];

  // Handle JOINs by using raw SQL via RPC or simplified queries
  if (sql.toLowerCase().includes('join')) {
    // For complex queries with JOINs, we'll use a simplified approach
    // Fetch from main table and handle relations separately
    return await handleComplexSelect(sql, params, mode, tableName);
  }

  // Simple SELECT query
  let query = supabase.from(tableName).select('*');

  // Parse WHERE clause
  const whereMatch = sql.match(/where\s+(.+?)(?:\s+order|\s+limit|\s+group|\s*$)/i);
  if (whereMatch) {
    query = applyWhereClause(query, whereMatch[1], params);
  }

  // Parse ORDER BY
  const orderMatch = sql.match(/order\s+by\s+(\w+)(?:\s+(asc|desc))?/i);
  if (orderMatch) {
    const column = orderMatch[1];
    const ascending = !orderMatch[2] || orderMatch[2].toLowerCase() === 'asc';
    query = query.order(column, { ascending });
  }

  // Parse LIMIT
  const limitMatch = sql.match(/limit\s+(\d+|\?)/i);
  if (limitMatch) {
    const limit = limitMatch[1] === '?' ? params[params.length - 1] : parseInt(limitMatch[1]);
    query = query.limit(limit);
  }

  if (mode === 'single') {
    query = query.limit(1).single();
  }

  const { data, error } = await query;

  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    throw error;
  }

  return data;
}

async function handleComplexSelect(sql, params, mode, mainTable) {
  // For complex JOINs, fetch from main table with foreign key references
  // This is a simplified approach - complex queries may need adjustment

  // Extract what columns we need
  let selectColumns = '*';
  const selectMatch = sql.match(/select\s+(.+?)\s+from/i);
  if (selectMatch) {
    // Parse column aliases and build Supabase select
    selectColumns = parseSelectColumns(selectMatch[1], sql);
  }

  let query = supabase.from(mainTable).select(selectColumns);

  // Parse WHERE clause and apply
  const whereMatch = sql.match(/where\s+(.+?)(?:\s+order|\s+limit|\s+group|\s*$)/i);
  if (whereMatch) {
    query = applyWhereClause(query, whereMatch[1], params, mainTable);
  }

  // Parse ORDER BY
  const orderMatch = sql.match(/order\s+by\s+(?:\w+\.)?(\w+)(?:\s+(asc|desc))?/i);
  if (orderMatch) {
    const column = orderMatch[1];
    const ascending = !orderMatch[2] || orderMatch[2].toLowerCase() === 'asc';
    query = query.order(column, { ascending });
  }

  // Parse LIMIT
  const limitMatch = sql.match(/limit\s+(\d+|\?)/i);
  if (limitMatch) {
    const limit = limitMatch[1] === '?' ? params[params.length - 1] : parseInt(limitMatch[1]);
    query = query.limit(limit);
  }

  if (mode === 'single') {
    query = query.limit(1).maybeSingle();
  }

  const { data, error } = await query;

  if (error) {
    console.error('Complex select error:', error);
    throw error;
  }

  // Flatten nested objects from foreign key references
  if (data) {
    if (Array.isArray(data)) {
      return data.map(row => flattenRow(row, sql));
    }
    return flattenRow(data, sql);
  }

  return mode === 'all' ? [] : null;
}

function parseSelectColumns(columnsStr, fullSql) {
  // Check for common JOIN patterns and build Supabase select with relations
  const joins = [];
  const joinRegex = /join\s+(\w+)\s+(\w+)?\s*on\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/gi;
  let match;

  while ((match = joinRegex.exec(fullSql)) !== null) {
    joins.push({
      table: match[1],
      alias: match[2] || match[1],
      leftTable: match[3],
      leftCol: match[4],
      rightTable: match[5],
      rightCol: match[6]
    });
  }

  // Build select with foreign key references
  let select = '*';

  if (joins.length > 0) {
    const relations = joins.map(j => {
      // Determine the foreign key relationship
      if (j.table === 'users') {
        return `${j.leftCol.replace('_id', '').replace('_user', '')}:users!${j.leftCol}(*)`;
      }
      return `${j.table}(*)`;
    });

    select = `*, ${relations.join(', ')}`;
  }

  return select;
}

function flattenRow(row, sql) {
  if (!row || typeof row !== 'object') return row;

  const flattened = { ...row };

  // Flatten nested user objects
  for (const key of Object.keys(flattened)) {
    if (flattened[key] && typeof flattened[key] === 'object' && !Array.isArray(flattened[key])) {
      const nested = flattened[key];
      // Add common aliased fields
      if (nested.name) {
        // Determine alias based on key
        if (key.includes('author') || key === 'author') {
          flattened.author_name = nested.name;
        } else if (key.includes('manager') || key === 'manager') {
          flattened.manager_name = nested.name;
        } else if (key.includes('user') || key === 'user') {
          flattened.user_name = nested.name;
        } else if (key.includes('recipient')) {
          flattened.recipient_name = nested.name;
          flattened.recipient_department = nested.department;
        } else if (key.includes('nominator')) {
          flattened.nominator_name = nested.name;
        } else if (key.includes('reviewer') || key === 'reviewed_by') {
          flattened.reviewed_by_name = nested.name;
        } else {
          flattened[`${key}_name`] = nested.name;
        }
        if (nested.department) {
          flattened.department = flattened.department || nested.department;
        }
        if (nested.designation) {
          flattened.designation = flattened.designation || nested.designation;
        }
        if (nested.email) {
          flattened[`${key}_email`] = nested.email;
        }
      }
      delete flattened[key];
    }
  }

  return flattened;
}

function applyWhereClause(query, whereStr, params, mainTable = '') {
  let paramIndex = 0;

  // Split by AND (simple approach)
  const conditions = whereStr.split(/\s+and\s+/i);

  for (const condition of conditions) {
    const trimmed = condition.trim();

    // Handle different comparison operators
    let match;

    // Equality: column = ?
    if ((match = trimmed.match(/(?:(\w+)\.)?(\w+)\s*=\s*\?/))) {
      const column = match[2];
      const value = params[paramIndex++];
      query = query.eq(column, value);
    }
    // Equality with value: column = 'value' or column = number
    else if ((match = trimmed.match(/(?:(\w+)\.)?(\w+)\s*=\s*['"]?([^'"]+)['"]?/))) {
      const column = match[2];
      const value = match[3];
      if (value !== '?') {
        query = query.eq(column, value);
      }
    }
    // Greater than or equal: column >= ?
    else if ((match = trimmed.match(/(?:(\w+)\.)?(\w+)\s*>=\s*\?/))) {
      const column = match[2];
      const value = params[paramIndex++];
      query = query.gte(column, value);
    }
    // Less than or equal: column <= ?
    else if ((match = trimmed.match(/(?:(\w+)\.)?(\w+)\s*<=\s*\?/))) {
      const column = match[2];
      const value = params[paramIndex++];
      query = query.lte(column, value);
    }
    // IN clause: column IN (?, ?, ?)
    else if ((match = trimmed.match(/(?:(\w+)\.)?(\w+)\s+in\s*\(([^)]+)\)/i))) {
      const column = match[2];
      const placeholders = match[3].split(',').map(p => p.trim());
      const values = placeholders.map(() => params[paramIndex++]);
      query = query.in(column, values);
    }
    // LIKE: column LIKE ?
    else if ((match = trimmed.match(/(?:(\w+)\.)?(\w+)\s+like\s+\?/i))) {
      const column = match[2];
      const value = params[paramIndex++];
      query = query.ilike(column, value);
    }
    // IS NULL
    else if ((match = trimmed.match(/(?:(\w+)\.)?(\w+)\s+is\s+null/i))) {
      const column = match[2];
      query = query.is(column, null);
    }
    // IS NOT NULL
    else if ((match = trimmed.match(/(?:(\w+)\.)?(\w+)\s+is\s+not\s+null/i))) {
      const column = match[2];
      query = query.not(column, 'is', null);
    }
  }

  return query;
}

async function handleInsert(sql, params) {
  const tableMatch = sql.match(/insert\s+into\s+(\w+)/i);
  if (!tableMatch) {
    throw new Error('Could not parse INSERT table');
  }

  const tableName = tableMatch[1];

  // Extract columns
  const columnsMatch = sql.match(/\(([^)]+)\)\s*values/i);
  if (!columnsMatch) {
    throw new Error('Could not parse INSERT columns');
  }

  const columns = columnsMatch[1].split(',').map(c => c.trim());

  // Build data object
  const data = {};
  columns.forEach((col, i) => {
    data[col] = params[i];
  });

  const { error } = await supabase.from(tableName).insert(data);

  if (error) {
    throw error;
  }

  return { changes: 1 };
}

async function handleUpdate(sql, params) {
  const tableMatch = sql.match(/update\s+(\w+)/i);
  if (!tableMatch) {
    throw new Error('Could not parse UPDATE table');
  }

  const tableName = tableMatch[1];

  // Extract SET clause
  const setMatch = sql.match(/set\s+(.+?)\s+where/i);
  if (!setMatch) {
    throw new Error('Could not parse UPDATE SET clause');
  }

  // Parse SET columns (handle COALESCE)
  const setStr = setMatch[1];
  const setParts = [];
  let depth = 0;
  let current = '';

  for (const char of setStr) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === ',' && depth === 0) {
      setParts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) setParts.push(current.trim());

  const data = {};
  let paramIndex = 0;

  for (const part of setParts) {
    // Handle COALESCE(?, column) pattern
    const coalesceMatch = part.match(/(\w+)\s*=\s*coalesce\s*\(\s*\?\s*,\s*\w+\s*\)/i);
    if (coalesceMatch) {
      const column = coalesceMatch[1];
      const value = params[paramIndex++];
      if (value !== null && value !== undefined) {
        data[column] = value;
      }
    } else {
      // Simple column = ?
      const simpleMatch = part.match(/(\w+)\s*=\s*\?/);
      if (simpleMatch) {
        const column = simpleMatch[1];
        data[column] = params[paramIndex++];
      }
    }
  }

  // Parse WHERE clause
  const whereMatch = sql.match(/where\s+(.+)$/i);
  if (!whereMatch) {
    throw new Error('UPDATE without WHERE clause');
  }

  let query = supabase.from(tableName).update(data);
  query = applyWhereClause(query, whereMatch[1], params.slice(paramIndex));

  const { error } = await query;

  if (error) {
    throw error;
  }

  return { changes: 1 };
}

async function handleDelete(sql, params) {
  const tableMatch = sql.match(/delete\s+from\s+(\w+)/i);
  if (!tableMatch) {
    throw new Error('Could not parse DELETE table');
  }

  const tableName = tableMatch[1];

  // Parse WHERE clause
  const whereMatch = sql.match(/where\s+(.+)$/i);
  if (!whereMatch) {
    throw new Error('DELETE without WHERE clause');
  }

  let query = supabase.from(tableName).delete();
  query = applyWhereClause(query, whereMatch[1], params);

  const { error } = await query;

  if (error) {
    throw error;
  }

  return { changes: 1 };
}

// ==========================================
// INITIALIZATION
// ==========================================

function initializeDatabase() {
  if (useSupabase) {
    console.log('✅ Supabase database ready (tables created via migrations)');
    return;
  }

  // SQLite initialization
  // Users table
  sqliteDb.exec(`
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
  sqliteDb.exec(`
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
  sqliteDb.exec(`
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
  sqliteDb.exec(`
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

  // Team members table
  sqliteDb.exec(`
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
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS hrms_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      late_time TEXT DEFAULT '10:30 AM',
      half_day_time TEXT DEFAULT '11:00 AM',
      settings_json TEXT
    )
  `);

  // Probations table
  sqliteDb.exec(`
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
  sqliteDb.exec(`
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
  sqliteDb.exec(`
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

  // Appraisal cycles table
  sqliteDb.exec(`
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
  sqliteDb.exec(`
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
  sqliteDb.exec(`
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
  sqliteDb.exec(`
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

  // KPIs table
  sqliteDb.exec(`
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
  sqliteDb.exec(`
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

  // PIPs table
  sqliteDb.exec(`
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
  sqliteDb.exec(`
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
  sqliteDb.exec(`
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

  // Create extended enterprise tables
  createExtendedTables(sqliteDb);
  seedExtendedData(sqliteDb);

  // Create BoothPilot AI tables
  createBoothPilotTables(sqliteDb);
  seedBoothPilotData(sqliteDb);
}

function seedDefaultData() {
  const userCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM users').get();

  if (userCount.count === 0) {
    console.log('Seeding default data...');

    const insertUser = sqliteDb.prepare(`
      INSERT INTO users (id, name, email, password, department, designation, role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const hashedPassword = bcrypt.hashSync('admin123', 10);
    const userPassword = bcrypt.hashSync('user123', 10);

    insertUser.run('admin-1', 'Sachin Talwar', 'admin@wowevents.com', hashedPassword, 'Management', 'CEO', 'admin');
    insertUser.run('admin-2', 'Priya Sharma', 'hr@wowevents.com', hashedPassword, 'HR', 'HR Manager', 'admin');
    insertUser.run('user-1', 'Amit Talwar', 'amit@wowevents.com', userPassword, 'Tech', 'Tech Lead', 'employee');
    insertUser.run('user-2', 'Neeti Choudhary', 'neeti@wowevents.com', userPassword, 'Concept & Copy', 'Content Writer', 'employee');
    insertUser.run('user-3', 'Animesh', 'animesh@wowevents.com', userPassword, '2D', 'Graphic Designer', 'employee');
    insertUser.run('user-4', 'Rahul Kumar', 'rahul@wowevents.com', userPassword, '3D', '3D Artist', 'employee');
    insertUser.run('user-5', 'Tarun Fuloria', 'tarun@wowevents.com', userPassword, 'Tech', 'Developer', 'employee');
    insertUser.run('user-6', 'Mahima', 'mahima@wowevents.com', userPassword, 'Concept & Copy', 'Copywriter', 'employee');

    const insertTeamMember = sqliteDb.prepare(`
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

    const insertTask = sqliteDb.prepare(`
      INSERT INTO tasks (id, title, description, assigned_by_user_id, assigned_to_user_id, due_date, due_time, status, priority, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTask.run('task-1', 'Complete API Integration', 'Integrate the new payment API', 'admin-1', 'user-1', '2026-01-20', '5:00 PM', 'in_progress', 'high', 'tech,urgent');
    insertTask.run('task-2', 'Design Event Poster', 'Create poster for upcoming corporate event', 'admin-1', 'user-3', '2026-01-18', '3:00 PM', 'pending', 'medium', 'design,creative');
    insertTask.run('task-3', 'Write Blog Content', 'Write 3 blog posts for company website', 'admin-2', 'user-2', '2026-01-22', '6:00 PM', 'in_progress', 'low', 'content,marketing');
    insertTask.run('task-4', '3D Model Review', 'Review 3D models for client presentation', 'user-1', 'user-4', '2026-01-19', '2:00 PM', 'pending', 'high', '3d,review');
    insertTask.run('task-5', 'Update Dashboard UI', 'Implement new dashboard design', 'admin-1', 'user-5', '2026-01-25', '5:00 PM', 'pending', 'medium', 'tech,ui');
    insertTask.run('task-6', 'Social Media Copy', 'Write copy for social media campaign', 'admin-2', 'user-6', '2026-01-17', '4:00 PM', 'completed', 'medium', 'content,social');

    const insertLeave = sqliteDb.prepare(`
      INSERT INTO leave_requests (id, user_id, leave_type, start_date, end_date, reason, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertLeave.run('leave-1', 'user-1', 'Casual Leave', '2026-01-20', '2026-01-21', 'Family function', 'pending');
    insertLeave.run('leave-2', 'user-2', 'Sick Leave', '2026-01-15', '2026-01-15', 'Not feeling well', 'approved');
    insertLeave.run('leave-3', 'user-3', 'Work from Home', '2026-01-18', '2026-01-18', 'Internet installation at home', 'approved');

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
      weeklyOffSettings: { sunday: 'both_weeks', saturday: 'week1_only' },
      holidays: [
        { id: '1', name: 'New Year', date: '2026-01-01' },
        { id: '2', name: 'Republic Day', date: '2026-01-26' },
        { id: '3', name: 'Holi', date: '2026-03-04' },
        { id: '4', name: 'Independence Day', date: '2026-08-15' },
        { id: '5', name: 'Diwali', date: '2026-11-08' },
      ],
    });

    sqliteDb.prepare(`INSERT INTO hrms_settings (id, late_time, half_day_time, settings_json) VALUES (1, '10:30 AM', '11:00 AM', ?)`).run(settingsJson);

    const insertProbation = sqliteDb.prepare(`
      INSERT INTO probations (id, user_id, start_date, end_date, duration_days, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertProbation.run('prob-1', 'user-4', '2025-11-01', '2026-01-30', 90, 'ongoing', 'New hire - 3D Artist');
    insertProbation.run('prob-2', 'user-6', '2025-12-01', '2026-02-28', 90, 'ongoing', 'New hire - Copywriter');

    const insertChecklist = sqliteDb.prepare(`
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

    const insertReview = sqliteDb.prepare(`
      INSERT INTO probation_reviews (id, probation_id, reviewer_id, review_date, milestone, rating, feedback, recommendation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertReview.run('pr-1', 'prob-1', 'admin-1', '2025-12-01', '30-day', 4, 'Good progress on technical skills. Needs to improve communication.', 'continue');

    const insertGoal = sqliteDb.prepare(`
      INSERT INTO goals (id, user_id, title, description, category, target_date, weightage, progress, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertGoal.run('goal-1', 'user-1', 'Complete API Migration', 'Migrate all legacy APIs to new architecture', 'performance', '2026-03-31', 30, 45, 'active');
    insertGoal.run('goal-2', 'user-1', 'Learn Cloud Architecture', 'Complete AWS certification', 'learning', '2026-06-30', 20, 20, 'active');
    insertGoal.run('goal-3', 'user-2', 'Content Quality Score', 'Achieve 95% content quality score', 'performance', '2026-03-31', 40, 80, 'active');
    insertGoal.run('goal-4', 'user-3', 'Design System Update', 'Update all brand assets to new guidelines', 'project', '2026-02-28', 35, 60, 'active');
    insertGoal.run('goal-5', 'user-5', 'Code Coverage', 'Achieve 80% unit test coverage', 'performance', '2026-03-31', 25, 35, 'active');

    const insertKPI = sqliteDb.prepare(`
      INSERT INTO kpis (id, user_id, title, description, metric_type, target_value, current_value, unit, period, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertKPI.run('kpi-1', 'user-1', 'Sprint Velocity', 'Story points completed per sprint', 'number', 40, 35, 'points', 'monthly', 'on_track');
    insertKPI.run('kpi-2', 'user-1', 'Bug Fix Rate', 'Bugs fixed within SLA', 'percentage', 95, 92, '%', 'monthly', 'at_risk');
    insertKPI.run('kpi-3', 'user-2', 'Content Output', 'Articles published per month', 'number', 8, 6, 'articles', 'monthly', 'on_track');
    insertKPI.run('kpi-4', 'user-3', 'Design Delivery', 'Designs delivered on time', 'percentage', 100, 100, '%', 'monthly', 'achieved');
    insertKPI.run('kpi-5', 'user-4', '3D Render Quality', 'Client approval rate', 'percentage', 90, 85, '%', 'monthly', 'on_track');
    insertKPI.run('kpi-6', 'user-5', 'Code Review Turnaround', 'Reviews completed within 24hrs', 'percentage', 90, 88, '%', 'monthly', 'on_track');

    const insertNote = sqliteDb.prepare(`
      INSERT INTO performance_notes (id, user_id, author_id, type, content, is_private)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertNote.run('note-1', 'user-1', 'admin-1', 'praise', 'Excellent work on the payment integration. Delivered ahead of schedule!', 0);
    insertNote.run('note-2', 'user-3', 'admin-2', 'praise', 'The event poster designs were outstanding. Client loved them!', 0);
    insertNote.run('note-3', 'user-2', 'admin-2', 'observation', 'May need additional support on technical writing tasks.', 1);

    const insertRecognition = sqliteDb.prepare(`
      INSERT INTO recognitions (id, recipient_id, nominator_id, type, badge, title, message, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertRecognition.run('rec-1', 'user-1', 'admin-1', 'award', 'star_performer', 'Star Performer', 'For exceptional work on Q4 projects!', 1);
    insertRecognition.run('rec-2', 'user-3', 'user-2', 'appreciation', 'team_player', 'Team Player', 'Always helpful and collaborative!', 1);
    insertRecognition.run('rec-3', 'user-2', 'admin-2', 'appreciation', 'innovator', 'Creative Excellence', 'Brought fresh ideas to content strategy!', 1);

    console.log('Default data seeded successfully!');
  }
}

// Export for use
module.exports = { db, initializeDatabase, useSupabase };
