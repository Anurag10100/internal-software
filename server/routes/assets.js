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
// ASSET CATEGORIES
// ==========================================

router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const { data: categories, error } = await req.supabase
      .from('asset_categories')
      .select('*, parent:asset_categories!parent_category_id(name)')
      .eq('is_active', 1)
      .order('name');
    if (error) throw error;
    const list = categories || [];
    const categoryIds = list.map((c) => c.id);
    const { data: assetCounts } = categoryIds.length ? await req.supabase.from('assets').select('category_id').in('category_id', categoryIds) : { data: [] };
    const countByCat = (assetCounts || []).reduce((acc, r) => { acc[r.category_id] = (acc[r.category_id] || 0) + 1; return acc; }, {});
    const formatted = list.map((c) => ({
      ...c,
      parent_name: c.parent?.name,
      assets_count: countByCat[c.id] || 0,
      parent: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/categories', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, description, depreciation_rate, useful_life_years, parent_category_id } = req.body;
    const id = `ac-${uuidv4()}`;
    const { error } = await req.supabase.from('asset_categories').insert({
      id, name, description, depreciation_rate: depreciation_rate || 0, useful_life_years, parent_category_id,
    });
    if (error) throw error;
    const { data: category, error: e2 } = await req.supabase.from('asset_categories').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// ==========================================
// ASSETS
// ==========================================

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category_id, status, condition } = req.query;
    let q = req.supabase
      .from('assets')
      .select('*, category:asset_categories!category_id(name)')
      .order('created_at', { ascending: false });
    if (category_id) q = q.eq('category_id', category_id);
    if (status) q = q.eq('status', status);
    if (condition) q = q.eq('condition', condition);
    const { data: assets, error } = await q;
    if (error) throw error;
    const list = assets || [];
    const assetIds = list.map((a) => a.id);
    const { data: activeAssignments } = assetIds.length ? await req.supabase.from('asset_assignments').select('asset_id, user_id').eq('status', 'active').in('asset_id', assetIds) : { data: [] };
    const userIds = [...new Set((activeAssignments || []).map((a) => a.user_id))];
    const { data: users } = userIds.length ? await req.supabase.from('users').select('id, name').in('id', userIds) : { data: [] };
    const userByName = new Map((users || []).map((u) => [u.id, u.name]));
    const assignByAsset = (activeAssignments || []).reduce((acc, a) => { acc[a.asset_id] = a; return acc; }, {});
    const formatted = list.map((a) => {
      const assign = assignByAsset[a.id];
      return {
        ...a,
        category_name: a.category?.name,
        assigned_to_name: assign ? userByName.get(assign.user_id) : null,
        assigned_to_id: assign?.user_id ?? null,
        category: undefined,
      };
    });
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data: asset, error } = await req.supabase
      .from('assets')
      .select('*, category:asset_categories!category_id(name)')
      .eq('id', req.params.id)
      .single();
    if (error || !asset) {
      if (error?.code === 'PGRST116') return res.status(404).json({ error: 'Asset not found' });
      throw error || new Error('Not found');
    }
    const category_name = asset.category?.name;
    delete asset.category;
    const { data: assignments } = await req.supabase
      .from('asset_assignments')
      .select('*, user:users!user_id(name), assigned_by_user:users!assigned_by(name)')
      .eq('asset_id', req.params.id)
      .order('assigned_at', { ascending: false });
    const { data: maintenance } = await req.supabase
      .from('asset_maintenance')
      .select('*, created_by_user:users!created_by(name)')
      .eq('asset_id', req.params.id)
      .order('scheduled_date', { ascending: false });
    asset.assignments = (assignments || []).map((a) => ({
      ...a,
      user_name: a.user?.name,
      assigned_by_name: a.assigned_by_user?.name,
      user: undefined,
      assigned_by_user: undefined,
    }));
    asset.maintenance = (maintenance || []).map((m) => ({
      ...m,
      created_by_name: m.created_by_user?.name,
      created_by_user: undefined,
    }));
    res.json({ ...asset, category_name });
  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

router.get('/assigned/my-assets', authenticateToken, async (req, res) => {
  try {
    const { data: assignments, error } = await req.supabase
      .from('asset_assignments')
      .select('*, asset:assets!asset_id(*), assigned_by_user:users!assigned_by(name)')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .order('assigned_at', { ascending: false });
    if (error) throw error;
    const list = assignments || [];
    const assetIds = list.map((a) => a.asset_id).filter(Boolean);
    const { data: categories } = assetIds.length ? await req.supabase.from('assets').select('id, category_id').in('id', assetIds) : { data: [] };
    const categoryIds = [...new Set((categories || []).map((c) => c.category_id).filter(Boolean))];
    const { data: catNames } = categoryIds.length ? await req.supabase.from('asset_categories').select('id, name').in('id', categoryIds) : { data: [] };
    const nameByCatId = new Map((catNames || []).map((c) => [c.id, c.name]));
    const catByAssetId = new Map((categories || []).map((c) => [c.id, c.category_id]));
    const formatted = list.map((a) => {
      const asset = a.asset || {};
      const category_name = nameByCatId.get(catByAssetId.get(a.asset_id));
      return {
        ...asset,
        assigned_at: a.assigned_at,
        assigned_by_name: a.assigned_by_user?.name,
        category_name,
      };
    });
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { asset_tag, name, category_id, description, brand, model, serial_number, purchase_date, purchase_cost, vendor, warranty_end_date, current_value, location, status, condition, notes } = req.body;
    const id = `asset-${uuidv4()}`;
    const { error } = await req.supabase.from('assets').insert({
      id, asset_tag, name, category_id, description, brand, model, serial_number, purchase_date, purchase_cost, vendor, warranty_end_date, current_value: current_value ?? purchase_cost, location, status: status || 'available', condition: condition || 'good', notes,
    });
    if (error) throw error;
    const { data: asset, error: e2 } = await req.supabase.from('assets').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(asset);
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, category_id, description, brand, model, serial_number, purchase_date, purchase_cost, vendor, warranty_end_date, current_value, location, status, condition, notes } = req.body;
    const { error } = await req.supabase.from('assets').update({
      name, category_id, description, brand, model, serial_number, purchase_date, purchase_cost, vendor, warranty_end_date, current_value, location, status, condition, notes,
    }).eq('id', req.params.id);
    if (error) throw error;
    const { data: asset, error: e2 } = await req.supabase.from('assets').select('*').eq('id', req.params.id).single();
    if (e2) throw e2;
    res.json(asset);
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

// ==========================================
// ASSET ASSIGNMENTS
// ==========================================

router.post('/:id/assign', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { user_id, expected_return_date } = req.body;
    const { data: asset, error: fe } = await req.supabase.from('assets').select('status').eq('id', req.params.id).single();
    if (fe || !asset) return res.status(404).json({ error: 'Asset not found' });
    if (asset.status === 'assigned') return res.status(400).json({ error: 'Asset is already assigned' });
    const assignmentId = `aa-${uuidv4()}`;
    const { error } = await req.supabase.from('asset_assignments').insert({
      id: assignmentId, asset_id: req.params.id, user_id, assigned_by: req.user.id, expected_return_date,
    });
    if (error) throw error;
    await req.supabase.from('assets').update({ status: 'assigned' }).eq('id', req.params.id);
    res.json({ message: 'Asset assigned successfully' });
  } catch (error) {
    console.error('Error assigning asset:', error);
    res.status(500).json({ error: 'Failed to assign asset' });
  }
});

router.post('/:id/return', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { return_condition, return_notes } = req.body;
    const { data: assignment, error: fe } = await req.supabase.from('asset_assignments').select('id').eq('asset_id', req.params.id).eq('status', 'active').maybeSingle();
    if (fe || !assignment) return res.status(400).json({ error: 'Asset is not assigned' });
    await req.supabase.from('asset_assignments').update({
      status: 'returned', returned_at: new Date().toISOString(), return_condition, return_notes,
    }).eq('id', assignment.id);
    await req.supabase.from('assets').update({ status: 'available', condition: return_condition || 'good' }).eq('id', req.params.id);
    res.json({ message: 'Asset returned successfully' });
  } catch (error) {
    console.error('Error returning asset:', error);
    res.status(500).json({ error: 'Failed to return asset' });
  }
});

// ==========================================
// ASSET REQUESTS
// ==========================================

router.get('/requests/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let q = req.supabase
      .from('asset_requests')
      .select('*, user:users!user_id(name, department), category:asset_categories!category_id(name), asset:assets!asset_id(name, asset_tag), approved_by_user:users!approved_by(name)')
      .order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    const { data: requests, error } = await q;
    if (error) throw error;
    const formatted = (requests || []).map((r) => ({
      ...r,
      user_name: r.user?.name,
      department: r.user?.department,
      category_name: r.category?.name,
      asset_name: r.asset?.name,
      asset_tag: r.asset?.asset_tag,
      approved_by_name: r.approved_by_user?.name,
      user: undefined,
      category: undefined,
      asset: undefined,
      approved_by_user: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

router.get('/requests/my-requests', authenticateToken, async (req, res) => {
  try {
    const { data: requests, error } = await req.supabase
      .from('asset_requests')
      .select('*, category:asset_categories!category_id(name), asset:assets!asset_id(name, asset_tag), approved_by_user:users!approved_by(name)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const formatted = (requests || []).map((r) => ({
      ...r,
      category_name: r.category?.name,
      asset_name: r.asset?.name,
      asset_tag: r.asset?.asset_tag,
      approved_by_name: r.approved_by_user?.name,
      category: undefined,
      asset: undefined,
      approved_by_user: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

router.post('/requests', authenticateToken, async (req, res) => {
  try {
    const { category_id, asset_id, request_type, reason, urgency } = req.body;
    const id = `ar-${uuidv4()}`;
    const { error } = await req.supabase.from('asset_requests').insert({
      id, user_id: req.user.id, category_id, asset_id, request_type: request_type || 'new', reason, urgency: urgency || 'normal',
    });
    if (error) throw error;
    const { data: request, error: e2 } = await req.supabase.from('asset_requests').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(request);
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

router.put('/requests/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status, rejection_reason, asset_id } = req.body;
    const updates = { status, approved_by: req.user.id, approved_at: new Date().toISOString(), rejection_reason };
    if (status === 'fulfilled') updates.fulfilled_at = new Date().toISOString();
    const { error } = await req.supabase.from('asset_requests').update(updates).eq('id', req.params.id);
    if (error) throw error;
    if (status === 'approved' && asset_id) {
      const { data: reqRow } = await req.supabase.from('asset_requests').select('user_id').eq('id', req.params.id).single();
      if (reqRow) {
        const assignmentId = `aa-${uuidv4()}`;
        await req.supabase.from('asset_assignments').insert({
          id: assignmentId, asset_id, user_id: reqRow.user_id, assigned_by: req.user.id,
        });
        await req.supabase.from('assets').update({ status: 'assigned' }).eq('id', asset_id);
        await req.supabase.from('asset_requests').update({ status: 'fulfilled', asset_id, fulfilled_at: new Date().toISOString() }).eq('id', req.params.id);
      }
    }
    const { data: updatedRequest, error: e2 } = await req.supabase.from('asset_requests').select('*').eq('id', req.params.id).single();
    if (e2) throw e2;
    res.json(updatedRequest);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// ==========================================
// ASSET MAINTENANCE
// ==========================================

router.get('/maintenance/schedule', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { data: maintenance, error } = await req.supabase
      .from('asset_maintenance')
      .select('*, asset:assets!asset_id(name, asset_tag, category_id), created_by_user:users!created_by(name)')
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_date');
    if (error) throw error;
    const list = maintenance || [];
    const categoryIds = [...new Set(list.map((m) => m.asset?.category_id).filter(Boolean))];
    const { data: catNames } = categoryIds.length ? await req.supabase.from('asset_categories').select('id, name').in('id', categoryIds) : { data: [] };
    const nameByCatId = new Map((catNames || []).map((c) => [c.id, c.name]));
    const formatted = list.map((m) => ({
      ...m,
      asset_name: m.asset?.name,
      asset_tag: m.asset?.asset_tag,
      category_name: nameByCatId.get(m.asset?.category_id) ?? null,
      created_by_name: m.created_by_user?.name,
      asset: undefined,
      created_by_user: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching maintenance:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance' });
  }
});

router.post('/maintenance', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { asset_id, maintenance_type, description, scheduled_date, vendor, cost } = req.body;
    const id = `am-${uuidv4()}`;
    const { error } = await req.supabase.from('asset_maintenance').insert({
      id, asset_id, maintenance_type, description, scheduled_date, vendor, cost, created_by: req.user.id,
    });
    if (error) throw error;
    if (maintenance_type === 'repair') await req.supabase.from('assets').update({ status: 'maintenance' }).eq('id', asset_id);
    const { data: maintenance, error: e2 } = await req.supabase.from('asset_maintenance').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(maintenance);
  } catch (error) {
    console.error('Error creating maintenance:', error);
    res.status(500).json({ error: 'Failed to create maintenance' });
  }
});

router.post('/maintenance/:id/complete', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { notes, cost } = req.body;
    const { data: maintenance, error: fe } = await req.supabase.from('asset_maintenance').select('asset_id').eq('id', req.params.id).single();
    if (fe || !maintenance) return res.status(404).json({ error: 'Maintenance not found' });
    const updates = { status: 'completed', completed_date: new Date().toISOString().slice(0, 10), notes };
    if (cost != null) updates.cost = cost;
    await req.supabase.from('asset_maintenance').update(updates).eq('id', req.params.id);
    await req.supabase.from('assets').update({ status: 'available' }).eq('id', maintenance.asset_id);
    res.json({ message: 'Maintenance completed' });
  } catch (error) {
    console.error('Error completing maintenance:', error);
    res.status(500).json({ error: 'Failed to complete maintenance' });
  }
});

// ==========================================
// SOFTWARE LICENSES
// ==========================================

router.get('/licenses/all', authenticateToken, async (req, res) => {
  try {
    const { data: licenses, error } = await req.supabase.from('software_licenses').select('*').order('software_name');
    if (error) throw error;
    const list = licenses || [];
    for (const lic of list) {
      const { data: assignments } = await req.supabase
        .from('license_assignments')
        .select('*, user:users!user_id(name, department), assigned_by_user:users!assigned_by(name)')
        .eq('license_id', lic.id)
        .eq('status', 'active');
      lic.assignments = (assignments || []).map((a) => ({
        ...a,
        user_name: a.user?.name,
        department: a.user?.department,
        assigned_by_name: a.assigned_by_user?.name,
        user: undefined,
        assigned_by_user: undefined,
      }));
    }
    res.json(list);
  } catch (error) {
    console.error('Error fetching licenses:', error);
    res.status(500).json({ error: 'Failed to fetch licenses' });
  }
});

router.get('/licenses/my-licenses', authenticateToken, async (req, res) => {
  try {
    const { data: assignments, error } = await req.supabase
      .from('license_assignments')
      .select('*, license:software_licenses!license_id(*), assigned_by_user:users!assigned_by(name)')
      .eq('user_id', req.user.id)
      .eq('status', 'active');
    if (error) throw error;
    const list = assignments || [];
    const formatted = list.map((a) => {
      const lic = a.license || {};
      return {
        ...lic,
        assigned_at: a.assigned_at,
        assigned_by_name: a.assigned_by_user?.name,
      };
    });
    formatted.sort((a, b) => (a.software_name || '').localeCompare(b.software_name || ''));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching licenses:', error);
    res.status(500).json({ error: 'Failed to fetch licenses' });
  }
});

router.post('/licenses', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { software_name, vendor, license_type, license_key, total_seats, purchase_date, expiry_date, cost, renewal_cost, notes } = req.body;
    const id = `lic-${uuidv4()}`;
    const { error } = await req.supabase.from('software_licenses').insert({
      id, software_name, vendor, license_type: license_type || 'perpetual', license_key, total_seats: total_seats || 1, purchase_date, expiry_date, cost, renewal_cost, notes,
    });
    if (error) throw error;
    const { data: license, error: e2 } = await req.supabase.from('software_licenses').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(license);
  } catch (error) {
    console.error('Error creating license:', error);
    res.status(500).json({ error: 'Failed to create license' });
  }
});

router.post('/licenses/:id/assign', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { user_id } = req.body;
    const { data: license, error: fe } = await req.supabase.from('software_licenses').select('total_seats, used_seats').eq('id', req.params.id).single();
    if (fe || !license) return res.status(404).json({ error: 'License not found' });
    if ((license.used_seats || 0) >= (license.total_seats || 1)) return res.status(400).json({ error: 'No available seats' });
    const { data: existing } = await req.supabase.from('license_assignments').select('id').eq('license_id', req.params.id).eq('user_id', user_id).eq('status', 'active').maybeSingle();
    if (existing) return res.status(400).json({ error: 'License already assigned to user' });
    const assignmentId = `la-${uuidv4()}`;
    await req.supabase.from('license_assignments').insert({
      id: assignmentId, license_id: req.params.id, user_id, assigned_by: req.user.id,
    });
    await req.supabase.from('software_licenses').update({ used_seats: (license.used_seats || 0) + 1 }).eq('id', req.params.id);
    res.json({ message: 'License assigned' });
  } catch (error) {
    console.error('Error assigning license:', error);
    res.status(500).json({ error: 'Failed to assign license' });
  }
});

router.post('/licenses/:id/revoke', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { user_id } = req.body;
    const { data: license } = await req.supabase.from('software_licenses').select('used_seats').eq('id', req.params.id).single();
    await req.supabase.from('license_assignments').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('license_id', req.params.id).eq('user_id', user_id).eq('status', 'active');
    if (license && (license.used_seats || 0) > 0) await req.supabase.from('software_licenses').update({ used_seats: Math.max(0, (license.used_seats || 0) - 1) }).eq('id', req.params.id);
    res.json({ message: 'License revoked' });
  } catch (error) {
    console.error('Error revoking license:', error);
    res.status(500).json({ error: 'Failed to revoke license' });
  }
});

// ==========================================
// ASSETS DASHBOARD
// ==========================================

router.get('/dashboard', authenticateToken, isAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    const in30Str = in30.toISOString().slice(0, 10);
    const in90 = new Date();
    in90.setDate(in90.getDate() + 90);
    const in90Str = in90.toISOString().slice(0, 10);
    const [totalRes, availableRes, assignedRes, maintenanceRes, pendingRes, maintenanceScheduleRes, valueRes, categoriesRes, licensesExpiringRes, totalLicensesRes] = await Promise.all([
      req.supabase.from('assets').select('*', { count: 'exact', head: true }),
      req.supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'available'),
      req.supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'assigned'),
      req.supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'maintenance'),
      req.supabase.from('asset_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      req.supabase.from('asset_maintenance').select('*', { count: 'exact', head: true }).eq('status', 'scheduled').gte('scheduled_date', today).lte('scheduled_date', in30Str),
      req.supabase.from('assets').select('current_value'),
      req.supabase.from('asset_categories').select('id, name').eq('is_active', 1),
      req.supabase.from('software_licenses').select('id').gte('expiry_date', today).lte('expiry_date', in90Str),
      req.supabase.from('software_licenses').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    ]);
    const totalAssetValue = (valueRes.data || []).reduce((s, a) => s + (a.current_value || 0), 0);
    const categoryIds = (categoriesRes.data || []).map((c) => c.id);
    const { data: assetsByCat } = categoryIds.length ? await req.supabase.from('assets').select('category_id').in('category_id', categoryIds) : { data: [] };
    const countByCat = (assetsByCat || []).reduce((acc, r) => { acc[r.category_id] = (acc[r.category_id] || 0) + 1; return acc; }, {});
    const assetsByCategory = (categoriesRes.data || []).map((c) => ({ name: c.name, count: countByCat[c.id] || 0 }));
    res.json({
      totalAssets: totalRes.count ?? 0,
      availableAssets: availableRes.count ?? 0,
      assignedAssets: assignedRes.count ?? 0,
      maintenanceAssets: maintenanceRes.count ?? 0,
      pendingRequests: pendingRes.count ?? 0,
      upcomingMaintenance: maintenanceScheduleRes.count ?? 0,
      totalAssetValue,
      assetsByCategory,
      licensesExpiringSoon: (licensesExpiringRes.data || []).length,
      totalLicenses: totalLicensesRes.count ?? 0,
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
