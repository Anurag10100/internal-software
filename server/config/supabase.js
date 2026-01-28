// Supabase Configuration and Client (main HRMS backend)
// Uses SERVICE_ROLE_KEY only - one client for all server-side operations.
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Single server-side client (bypasses RLS)
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

const supabaseAdmin = supabase;

function isSupabaseConfigured() {
  return !!(supabaseUrl && supabaseServiceKey);
}

function getSupabaseClient() {
  return supabase;
}

// Database operation helpers for consistent error handling
async function query(table, options = {}) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured');
  }

  let queryBuilder = client.from(table).select(options.select || '*');

  if (options.eq) {
    Object.entries(options.eq).forEach(([key, value]) => {
      queryBuilder = queryBuilder.eq(key, value);
    });
  }

  if (options.neq) {
    Object.entries(options.neq).forEach(([key, value]) => {
      queryBuilder = queryBuilder.neq(key, value);
    });
  }

  if (options.in) {
    Object.entries(options.in).forEach(([key, value]) => {
      queryBuilder = queryBuilder.in(key, value);
    });
  }

  if (options.like) {
    Object.entries(options.like).forEach(([key, value]) => {
      queryBuilder = queryBuilder.ilike(key, `%${value}%`);
    });
  }

  if (options.gte) {
    Object.entries(options.gte).forEach(([key, value]) => {
      queryBuilder = queryBuilder.gte(key, value);
    });
  }

  if (options.lte) {
    Object.entries(options.lte).forEach(([key, value]) => {
      queryBuilder = queryBuilder.lte(key, value);
    });
  }

  if (options.order) {
    queryBuilder = queryBuilder.order(options.order.column, {
      ascending: options.order.ascending ?? true
    });
  }

  if (options.limit) {
    queryBuilder = queryBuilder.limit(options.limit);
  }

  if (options.offset) {
    queryBuilder = queryBuilder.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  if (options.single) {
    queryBuilder = queryBuilder.single();
  }

  const { data, error } = await queryBuilder;

  if (error) {
    throw error;
  }

  return data;
}

async function insert(table, data, options = {}) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured');
  }

  const queryBuilder = client.from(table).insert(data);

  if (options.select) {
    queryBuilder.select(options.select);
  }

  if (options.single) {
    queryBuilder.single();
  }

  const { data: result, error } = await queryBuilder;

  if (error) {
    throw error;
  }

  return result;
}

async function update(table, data, match, options = {}) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured');
  }

  let queryBuilder = client.from(table).update(data);

  Object.entries(match).forEach(([key, value]) => {
    queryBuilder = queryBuilder.eq(key, value);
  });

  if (options.select) {
    queryBuilder.select(options.select);
  }

  if (options.single) {
    queryBuilder.single();
  }

  const { data: result, error } = await queryBuilder;

  if (error) {
    throw error;
  }

  return result;
}

async function remove(table, match, options = {}) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured');
  }

  let queryBuilder = client.from(table).delete();

  Object.entries(match).forEach(([key, value]) => {
    queryBuilder = queryBuilder.eq(key, value);
  });

  const { data, error } = await queryBuilder;

  if (error) {
    throw error;
  }

  return data;
}

async function upsert(table, data, options = {}) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured');
  }

  const queryBuilder = client.from(table).upsert(data, {
    onConflict: options.onConflict
  });

  if (options.select) {
    queryBuilder.select(options.select);
  }

  const { data: result, error } = await queryBuilder;

  if (error) {
    throw error;
  }

  return result;
}

// RPC (stored procedure) call helper
async function rpc(functionName, params = {}, options = {}) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await client.rpc(functionName, params);

  if (error) {
    throw error;
  }

  return data;
}

module.exports = {
  supabase,
  supabaseAdmin,
  isSupabaseConfigured,
  getSupabaseClient,
  query,
  insert,
  update,
  remove,
  upsert,
  rpc
};
