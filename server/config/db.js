// Database Abstraction Layer
// Supports both SQLite (local development) and Supabase (production)

const { db: sqliteDb, initializeDatabase } = require('./database');
const {
  supabase,
  supabaseAdmin,
  isSupabaseConfigured,
  query: supabaseQuery,
  insert: supabaseInsert,
  update: supabaseUpdate,
  remove: supabaseRemove,
  upsert: supabaseUpsert
} = require('./supabase');

// Determine which database to use
const DATABASE_MODE = process.env.DATABASE_MODE || 'sqlite';
const useSupabase = DATABASE_MODE === 'supabase' && isSupabaseConfigured();

if (useSupabase) {
  console.log('Using Supabase (PostgreSQL) database');
} else {
  console.log('Using SQLite database');
  // Initialize SQLite if using it
  initializeDatabase();
}

// Export the database mode
const getDatabaseMode = () => useSupabase ? 'supabase' : 'sqlite';

// ==========================================
// UNIFIED DATABASE OPERATIONS
// ==========================================

/**
 * Query records from a table
 * @param {string} table - Table name
 * @param {object} options - Query options
 * @returns {Promise<Array>} Query results
 */
async function query(table, options = {}) {
  if (useSupabase) {
    return await supabaseQuery(table, options);
  }

  // SQLite implementation
  let sql = `SELECT ${options.select || '*'} FROM ${table}`;
  const params = [];
  const whereClauses = [];

  if (options.eq) {
    Object.entries(options.eq).forEach(([key, value]) => {
      whereClauses.push(`${key} = ?`);
      params.push(value);
    });
  }

  if (options.neq) {
    Object.entries(options.neq).forEach(([key, value]) => {
      whereClauses.push(`${key} != ?`);
      params.push(value);
    });
  }

  if (options.in) {
    Object.entries(options.in).forEach(([key, values]) => {
      const placeholders = values.map(() => '?').join(', ');
      whereClauses.push(`${key} IN (${placeholders})`);
      params.push(...values);
    });
  }

  if (options.like) {
    Object.entries(options.like).forEach(([key, value]) => {
      whereClauses.push(`${key} LIKE ?`);
      params.push(`%${value}%`);
    });
  }

  if (options.gte) {
    Object.entries(options.gte).forEach(([key, value]) => {
      whereClauses.push(`${key} >= ?`);
      params.push(value);
    });
  }

  if (options.lte) {
    Object.entries(options.lte).forEach(([key, value]) => {
      whereClauses.push(`${key} <= ?`);
      params.push(value);
    });
  }

  if (whereClauses.length > 0) {
    sql += ` WHERE ${whereClauses.join(' AND ')}`;
  }

  if (options.order) {
    sql += ` ORDER BY ${options.order.column} ${options.order.ascending ? 'ASC' : 'DESC'}`;
  }

  if (options.limit) {
    sql += ` LIMIT ?`;
    params.push(options.limit);
  }

  if (options.offset) {
    sql += ` OFFSET ?`;
    params.push(options.offset);
  }

  const stmt = sqliteDb.prepare(sql);

  if (options.single) {
    return stmt.get(...params);
  }

  return stmt.all(...params);
}

/**
 * Insert record(s) into a table
 * @param {string} table - Table name
 * @param {object|Array} data - Data to insert
 * @param {object} options - Insert options
 * @returns {Promise<object>} Inserted record(s)
 */
async function insert(table, data, options = {}) {
  if (useSupabase) {
    return await supabaseInsert(table, data, options);
  }

  // SQLite implementation
  const records = Array.isArray(data) ? data : [data];
  const results = [];

  for (const record of records) {
    const columns = Object.keys(record);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(record);

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    const stmt = sqliteDb.prepare(sql);

    try {
      stmt.run(...values);
      results.push(record);
    } catch (error) {
      throw error;
    }
  }

  return Array.isArray(data) ? results : results[0];
}

/**
 * Update record(s) in a table
 * @param {string} table - Table name
 * @param {object} data - Data to update
 * @param {object} match - Match conditions
 * @param {object} options - Update options
 * @returns {Promise<object>} Updated record(s)
 */
async function update(table, data, match, options = {}) {
  if (useSupabase) {
    return await supabaseUpdate(table, data, match, options);
  }

  // SQLite implementation
  const setClauses = Object.keys(data).map(key => `${key} = ?`);
  const whereClauses = Object.keys(match).map(key => `${key} = ?`);
  const values = [...Object.values(data), ...Object.values(match)];

  const sql = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`;
  const stmt = sqliteDb.prepare(sql);

  stmt.run(...values);

  // Return updated record
  return await query(table, { eq: match, single: options.single });
}

/**
 * Delete record(s) from a table
 * @param {string} table - Table name
 * @param {object} match - Match conditions
 * @param {object} options - Delete options
 * @returns {Promise<void>}
 */
async function remove(table, match, options = {}) {
  if (useSupabase) {
    return await supabaseRemove(table, match, options);
  }

  // SQLite implementation
  const whereClauses = Object.keys(match).map(key => `${key} = ?`);
  const values = Object.values(match);

  const sql = `DELETE FROM ${table} WHERE ${whereClauses.join(' AND ')}`;
  const stmt = sqliteDb.prepare(sql);

  stmt.run(...values);
}

/**
 * Upsert record(s) into a table
 * @param {string} table - Table name
 * @param {object|Array} data - Data to upsert
 * @param {object} options - Upsert options
 * @returns {Promise<object>} Upserted record(s)
 */
async function upsert(table, data, options = {}) {
  if (useSupabase) {
    return await supabaseUpsert(table, data, options);
  }

  // SQLite implementation using INSERT OR REPLACE
  const records = Array.isArray(data) ? data : [data];
  const results = [];

  for (const record of records) {
    const columns = Object.keys(record);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(record);

    const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    const stmt = sqliteDb.prepare(sql);

    stmt.run(...values);
    results.push(record);
  }

  return Array.isArray(data) ? results : results[0];
}

/**
 * Execute raw SQL (SQLite only, for complex queries)
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {any} Query result
 */
function rawQuery(sql, params = []) {
  if (useSupabase) {
    throw new Error('Raw queries not supported with Supabase. Use RPC functions instead.');
  }

  const stmt = sqliteDb.prepare(sql);

  if (sql.trim().toUpperCase().startsWith('SELECT')) {
    return stmt.all(...params);
  }

  return stmt.run(...params);
}

/**
 * Get a single record by ID
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @returns {Promise<object|null>} Found record or null
 */
async function getById(table, id) {
  return await query(table, { eq: { id }, single: true });
}

/**
 * Count records in a table
 * @param {string} table - Table name
 * @param {object} match - Match conditions
 * @returns {Promise<number>} Count of records
 */
async function count(table, match = {}) {
  if (useSupabase) {
    const client = supabaseAdmin || supabase;
    let queryBuilder = client.from(table).select('*', { count: 'exact', head: true });

    Object.entries(match).forEach(([key, value]) => {
      queryBuilder = queryBuilder.eq(key, value);
    });

    const { count: total, error } = await queryBuilder;

    if (error) throw error;
    return total;
  }

  // SQLite implementation
  let sql = `SELECT COUNT(*) as count FROM ${table}`;
  const params = [];
  const whereClauses = [];

  Object.entries(match).forEach(([key, value]) => {
    whereClauses.push(`${key} = ?`);
    params.push(value);
  });

  if (whereClauses.length > 0) {
    sql += ` WHERE ${whereClauses.join(' AND ')}`;
  }

  const stmt = sqliteDb.prepare(sql);
  const result = stmt.get(...params);

  return result.count;
}

/**
 * Check if a record exists
 * @param {string} table - Table name
 * @param {object} match - Match conditions
 * @returns {Promise<boolean>} True if exists
 */
async function exists(table, match) {
  const total = await count(table, match);
  return total > 0;
}

/**
 * Transaction wrapper (SQLite only)
 * @param {Function} callback - Transaction callback
 * @returns {any} Transaction result
 */
function transaction(callback) {
  if (useSupabase) {
    // Supabase handles transactions at the RPC level
    return callback();
  }

  return sqliteDb.transaction(callback)();
}

// ==========================================
// EXPORT DATABASE INTERFACE
// ==========================================

module.exports = {
  // Database mode
  getDatabaseMode,
  useSupabase,

  // Raw clients (use with caution)
  sqliteDb,
  supabase,
  supabaseAdmin,

  // Unified operations
  query,
  insert,
  update,
  remove,
  upsert,
  rawQuery,

  // Convenience methods
  getById,
  count,
  exists,
  transaction
};
