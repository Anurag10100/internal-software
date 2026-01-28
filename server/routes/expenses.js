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
// EXPENSE CATEGORIES
// ==========================================

router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const { data: categories, error } = await req.supabase
      .from('expense_categories')
      .select('*, parent:expense_categories!parent_category_id(name)')
      .eq('is_active', 1)
      .order('name');
    if (error) throw error;
    const formatted = (categories || []).map((c) => ({ ...c, parent_name: c.parent?.name, parent: undefined }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/categories', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, description, max_amount, requires_receipt, requires_approval, parent_category_id, gl_code } = req.body;
    const id = `ec-${uuidv4()}`;
    const { error } = await req.supabase.from('expense_categories').insert({
      id, name, description, max_amount, requires_receipt: requires_receipt ? 1 : 0, requires_approval: requires_approval !== false ? 1 : 0, parent_category_id, gl_code,
    });
    if (error) throw error;
    const { data: category, error: e2 } = await req.supabase.from('expense_categories').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// ==========================================
// EXPENSE POLICIES
// ==========================================

router.get('/policies', authenticateToken, async (req, res) => {
  try {
    const { data: policies, error } = await req.supabase.from('expense_policies').select('*').eq('is_active', 1).order('name');
    if (error) throw error;
    res.json(policies || []);
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

router.post('/policies', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, description, applies_to, department, designation_level, daily_limit, monthly_limit, yearly_limit, auto_approve_limit } = req.body;
    const id = `ep-${uuidv4()}`;
    const { error } = await req.supabase.from('expense_policies').insert({
      id, name, description, applies_to: applies_to || 'all', department, designation_level, daily_limit, monthly_limit, yearly_limit, auto_approve_limit,
    });
    if (error) throw error;
    const { data: policy, error: e2 } = await req.supabase.from('expense_policies').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(policy);
  } catch (error) {
    console.error('Error creating policy:', error);
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

// ==========================================
// EXPENSE REPORTS
// ==========================================

router.get('/reports', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status, user_id } = req.query;
    let q = req.supabase
      .from('expense_reports')
      .select('*, user:users!user_id(name, department), approved_by_user:users!approved_by(name)')
      .order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    if (user_id) q = q.eq('user_id', user_id);
    const { data: reports, error } = await q;
    if (error) throw error;
    const list = reports || [];
    const reportIds = list.map((r) => r.id);
    const { data: items } = reportIds.length ? await req.supabase.from('expense_items').select('report_id').in('report_id', reportIds) : { data: [] };
    const countByReport = (items || []).reduce((acc, r) => { acc[r.report_id] = (acc[r.report_id] || 0) + 1; return acc; }, {});
    const formatted = list.map((r) => ({
      ...r,
      user_name: r.user?.name,
      department: r.user?.department,
      approved_by_name: r.approved_by_user?.name,
      items_count: countByReport[r.id] || 0,
      user: undefined,
      approved_by_user: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

router.get('/reports/my-reports', authenticateToken, async (req, res) => {
  try {
    const { data: reports, error } = await req.supabase
      .from('expense_reports')
      .select('*, approved_by_user:users!approved_by(name)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const list = reports || [];
    const reportIds = list.map((r) => r.id);
    const { data: items } = reportIds.length ? await req.supabase.from('expense_items').select('report_id').in('report_id', reportIds) : { data: [] };
    const countByReport = (items || []).reduce((acc, r) => { acc[r.report_id] = (acc[r.report_id] || 0) + 1; return acc; }, {});
    const formatted = list.map((r) => ({
      ...r,
      approved_by_name: r.approved_by_user?.name,
      items_count: countByReport[r.id] || 0,
      approved_by_user: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

router.get('/reports/:id', authenticateToken, async (req, res) => {
  try {
    const { data: report, error } = await req.supabase
      .from('expense_reports')
      .select('*, user:users!user_id(name, department), approved_by_user:users!approved_by(name)')
      .eq('id', req.params.id)
      .single();
    if (error || !report) {
      if (error?.code === 'PGRST116') return res.status(404).json({ error: 'Report not found' });
      throw error || new Error('Not found');
    }
    if (req.user.role !== 'admin' && report.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    const user_name = report.user?.name;
    const department = report.user?.department;
    const approved_by_name = report.approved_by_user?.name;
    delete report.user;
    delete report.approved_by_user;
    const { data: items } = await req.supabase.from('expense_items').select('*, category:expense_categories!category_id(name)').eq('report_id', req.params.id).order('expense_date');
    const { data: mileage } = await req.supabase.from('mileage_claims').select('*').eq('report_id', req.params.id).order('claim_date');
    const { data: perDiem } = await req.supabase.from('per_diem_claims').select('*').eq('report_id', req.params.id).order('claim_date');
    const itemsFormatted = (items || []).map((i) => ({ ...i, category_name: i.category?.name, category: undefined }));
    res.json({
      ...report,
      user_name,
      department,
      approved_by_name,
      items: itemsFormatted,
      mileage: mileage || [],
      perDiem: perDiem || [],
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

router.post('/reports', authenticateToken, async (req, res) => {
  try {
    const { title, description, trip_name, trip_start_date, trip_end_date } = req.body;
    const id = `er-${uuidv4()}`;
    const { error } = await req.supabase.from('expense_reports').insert({
      id, user_id: req.user.id, title, description, trip_name, trip_start_date, trip_end_date,
    });
    if (error) throw error;
    const { data: report, error: e2 } = await req.supabase.from('expense_reports').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

router.put('/reports/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, trip_name, trip_start_date, trip_end_date } = req.body;
    const { data: report, error: fe } = await req.supabase.from('expense_reports').select('user_id, status').eq('id', req.params.id).single();
    if (fe || !report) return res.status(404).json({ error: 'Report not found' });
    if (report.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (report.status !== 'draft') return res.status(400).json({ error: 'Cannot edit submitted report' });
    const { error } = await req.supabase.from('expense_reports').update({ title, description, trip_name, trip_start_date, trip_end_date }).eq('id', req.params.id);
    if (error) throw error;
    const { data: updatedReport, error: e2 } = await req.supabase.from('expense_reports').select('*').eq('id', req.params.id).single();
    if (e2) throw e2;
    res.json(updatedReport);
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

router.post('/reports/:id/submit', authenticateToken, async (req, res) => {
  try {
    const { data: report, error: fe } = await req.supabase.from('expense_reports').select('user_id, status').eq('id', req.params.id).single();
    if (fe || !report) return res.status(404).json({ error: 'Report not found' });
    if (report.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    const [{ data: items }, { data: mileage }, { data: perDiem }] = await Promise.all([
      req.supabase.from('expense_items').select('amount').eq('report_id', req.params.id),
      req.supabase.from('mileage_claims').select('amount').eq('report_id', req.params.id),
      req.supabase.from('per_diem_claims').select('amount').eq('report_id', req.params.id),
    ]);
    const total = (items || []).reduce((s, i) => s + (i.amount || 0), 0);
    const mileageTotal = (mileage || []).reduce((s, i) => s + (i.amount || 0), 0);
    const perDiemTotal = (perDiem || []).reduce((s, i) => s + (i.amount || 0), 0);
    const grandTotal = total + mileageTotal + perDiemTotal;
    const { error } = await req.supabase.from('expense_reports').update({
      status: 'submitted', total_amount: grandTotal, submitted_at: new Date().toISOString(),
    }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Report submitted', total_amount: grandTotal });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

router.post('/reports/:id/review', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status, rejection_reason } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const { error } = await req.supabase.from('expense_reports').update({
      status, approved_by: req.user.id, approved_at: new Date().toISOString(),
      rejection_reason: status === 'rejected' ? rejection_reason : null,
    }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: `Report ${status}` });
  } catch (error) {
    console.error('Error reviewing report:', error);
    res.status(500).json({ error: 'Failed to review report' });
  }
});

router.post('/reports/:id/pay', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { payment_reference } = req.body;
    const { error } = await req.supabase.from('expense_reports').update({
      status: 'paid', paid_at: new Date().toISOString(), payment_reference,
    }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Report marked as paid' });
  } catch (error) {
    console.error('Error marking paid:', error);
    res.status(500).json({ error: 'Failed to mark as paid' });
  }
});

router.delete('/reports/:id', authenticateToken, async (req, res) => {
  try {
    const { data: report, error: fe } = await req.supabase.from('expense_reports').select('user_id, status').eq('id', req.params.id).single();
    if (fe || !report) return res.status(404).json({ error: 'Report not found' });
    if (report.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
    if (report.status !== 'draft') return res.status(400).json({ error: 'Cannot delete submitted report' });
    await req.supabase.from('expense_items').delete().eq('report_id', req.params.id);
    await req.supabase.from('mileage_claims').delete().eq('report_id', req.params.id);
    await req.supabase.from('per_diem_claims').delete().eq('report_id', req.params.id);
    await req.supabase.from('expense_reports').delete().eq('id', req.params.id);
    res.json({ message: 'Report deleted' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// ==========================================
// EXPENSE ITEMS
// ==========================================

router.post('/reports/:reportId/items', authenticateToken, async (req, res) => {
  try {
    const { category_id, expense_date, merchant, description, amount, currency, exchange_rate, receipt_url, is_billable, project_code, client_name, notes } = req.body;
    const { data: report, error: fe } = await req.supabase.from('expense_reports').select('user_id, status').eq('id', req.params.reportId).single();
    if (fe || !report) return res.status(404).json({ error: 'Report not found' });
    if (report.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (report.status !== 'draft') return res.status(400).json({ error: 'Cannot add items to submitted report' });
    const id = `ei-${uuidv4()}`;
    const { error } = await req.supabase.from('expense_items').insert({
      id, report_id: req.params.reportId, category_id, expense_date, merchant, description, amount, currency: currency || 'INR', exchange_rate: exchange_rate || 1, receipt_url, is_billable: is_billable ? 1 : 0, project_code, client_name, notes,
    });
    if (error) throw error;
    const { data: items } = await req.supabase.from('expense_items').select('amount').eq('report_id', req.params.reportId);
    const total = (items || []).reduce((s, i) => s + (i.amount || 0), 0);
    await req.supabase.from('expense_reports').update({ total_amount: total }).eq('id', req.params.reportId);
    const { data: item, error: e2 } = await req.supabase.from('expense_items').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(item);
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

router.put('/items/:id', authenticateToken, async (req, res) => {
  try {
    const { category_id, expense_date, merchant, description, amount, currency, exchange_rate, receipt_url, is_billable, project_code, client_name, notes } = req.body;
    const { data: item, error: fe } = await req.supabase.from('expense_items').select('*, report:expense_reports!report_id(user_id, status)').eq('id', req.params.id).single();
    if (fe || !item) return res.status(404).json({ error: 'Item not found' });
    const report = item.report;
    if (report.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (report.status !== 'draft') return res.status(400).json({ error: 'Cannot edit submitted report' });
    const { error } = await req.supabase.from('expense_items').update({
      category_id, expense_date, merchant, description, amount, currency, exchange_rate, receipt_url, is_billable: is_billable ? 1 : 0, project_code, client_name, notes,
    }).eq('id', req.params.id);
    if (error) throw error;
    const { data: items } = await req.supabase.from('expense_items').select('amount').eq('report_id', item.report_id);
    const total = (items || []).reduce((s, i) => s + (i.amount || 0), 0);
    await req.supabase.from('expense_reports').update({ total_amount: total }).eq('id', item.report_id);
    const { data: updatedItem, error: e2 } = await req.supabase.from('expense_items').select('*').eq('id', req.params.id).single();
    if (e2) throw e2;
    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

router.delete('/items/:id', authenticateToken, async (req, res) => {
  try {
    const { data: item, error: fe } = await req.supabase.from('expense_items').select('*, report:expense_reports!report_id(user_id, status)').eq('id', req.params.id).single();
    if (fe || !item) return res.status(404).json({ error: 'Item not found' });
    if (item.report.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (item.report.status !== 'draft') return res.status(400).json({ error: 'Cannot delete from submitted report' });
    await req.supabase.from('expense_items').delete().eq('id', req.params.id);
    const { data: items } = await req.supabase.from('expense_items').select('amount').eq('report_id', item.report_id);
    const total = (items || []).reduce((s, i) => s + (i.amount || 0), 0);
    await req.supabase.from('expense_reports').update({ total_amount: total }).eq('id', item.report_id);
    res.json({ message: 'Item deleted' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ==========================================
// MILEAGE CLAIMS
// ==========================================

router.post('/reports/:reportId/mileage', authenticateToken, async (req, res) => {
  try {
    const { claim_date, from_location, to_location, distance_km, rate_per_km, purpose, vehicle_type } = req.body;
    const { data: report, error: fe } = await req.supabase.from('expense_reports').select('user_id, status').eq('id', req.params.reportId).single();
    if (fe || !report) return res.status(404).json({ error: 'Report not found' });
    if (report.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (report.status !== 'draft') return res.status(400).json({ error: 'Cannot add to submitted report' });
    const amount = distance_km * (rate_per_km || 8);
    const id = `mc-${uuidv4()}`;
    const { error } = await req.supabase.from('mileage_claims').insert({
      id, report_id: req.params.reportId, claim_date, from_location, to_location, distance_km, rate_per_km: rate_per_km || 8, amount, purpose, vehicle_type: vehicle_type || 'car',
    });
    if (error) throw error;
    const { data: claim, error: e2 } = await req.supabase.from('mileage_claims').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(claim);
  } catch (error) {
    console.error('Error adding mileage:', error);
    res.status(500).json({ error: 'Failed to add mileage claim' });
  }
});

router.delete('/mileage/:id', authenticateToken, async (req, res) => {
  try {
    const { data: claim, error: fe } = await req.supabase.from('mileage_claims').select('*, report:expense_reports!report_id(user_id, status)').eq('id', req.params.id).single();
    if (fe || !claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.report.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (claim.report.status !== 'draft') return res.status(400).json({ error: 'Cannot delete from submitted report' });
    await req.supabase.from('mileage_claims').delete().eq('id', req.params.id);
    res.json({ message: 'Mileage claim deleted' });
  } catch (error) {
    console.error('Error deleting mileage:', error);
    res.status(500).json({ error: 'Failed to delete mileage claim' });
  }
});

// ==========================================
// PER DIEM CLAIMS
// ==========================================

router.post('/reports/:reportId/per-diem', authenticateToken, async (req, res) => {
  try {
    const { claim_date, city, country, day_type, breakfast_included, lunch_included, dinner_included, rate } = req.body;
    const { data: report, error: fe } = await req.supabase.from('expense_reports').select('user_id, status').eq('id', req.params.reportId).single();
    if (fe || !report) return res.status(404).json({ error: 'Report not found' });
    if (report.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (report.status !== 'draft') return res.status(400).json({ error: 'Cannot add to submitted report' });
    let baseRate = rate || 1500;
    if (day_type === 'half') baseRate *= 0.5;
    let mealsDeduction = 0;
    if (breakfast_included) mealsDeduction += baseRate * 0.2;
    if (lunch_included) mealsDeduction += baseRate * 0.3;
    if (dinner_included) mealsDeduction += baseRate * 0.3;
    const amount = baseRate - mealsDeduction;
    const id = `pd-${uuidv4()}`;
    const { error } = await req.supabase.from('per_diem_claims').insert({
      id, report_id: req.params.reportId, claim_date, city, country: country || 'India', day_type: day_type || 'full',
      breakfast_included: breakfast_included ? 1 : 0, lunch_included: lunch_included ? 1 : 0, dinner_included: dinner_included ? 1 : 0, rate: rate || 1500, amount,
    });
    if (error) throw error;
    const { data: claim, error: e2 } = await req.supabase.from('per_diem_claims').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(claim);
  } catch (error) {
    console.error('Error adding per diem:', error);
    res.status(500).json({ error: 'Failed to add per diem claim' });
  }
});

router.delete('/per-diem/:id', authenticateToken, async (req, res) => {
  try {
    const { data: claim, error: fe } = await req.supabase.from('per_diem_claims').select('*, report:expense_reports!report_id(user_id, status)').eq('id', req.params.id).single();
    if (fe || !claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.report.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (claim.report.status !== 'draft') return res.status(400).json({ error: 'Cannot delete from submitted report' });
    await req.supabase.from('per_diem_claims').delete().eq('id', req.params.id);
    res.json({ message: 'Per diem claim deleted' });
  } catch (error) {
    console.error('Error deleting per diem:', error);
    res.status(500).json({ error: 'Failed to delete per diem claim' });
  }
});

// ==========================================
// EXPENSES DASHBOARD
// ==========================================

router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdminUser = req.user.role === 'admin';
    const [draftRes, pendingRes, approvedRes, totalReimbursedRes, pendingAmountRes] = await Promise.all([
      req.supabase.from('expense_reports').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'draft'),
      req.supabase.from('expense_reports').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'submitted'),
      req.supabase.from('expense_reports').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'approved'),
      req.supabase.from('expense_reports').select('total_amount').eq('user_id', userId).eq('status', 'paid'),
      req.supabase.from('expense_reports').select('total_amount').eq('user_id', userId).in('status', ['submitted', 'approved']),
    ]);
    const totalReimbursed = (totalReimbursedRes.data || []).reduce((s, r) => s + (r.total_amount || 0), 0);
    const pendingAmount = (pendingAmountRes.data || []).reduce((s, r) => s + (r.total_amount || 0), 0);
    const myStats = {
      draftReports: draftRes.count ?? 0,
      pendingReports: pendingRes.count ?? 0,
      approvedReports: approvedRes.count ?? 0,
      totalReimbursed,
      pendingAmount,
    };
    let orgStats = null;
    if (isAdminUser) {
      const [totalPendingRes, totalPendingAmountRes, approvedAwaitingRes, thisMonthRes, topCategoriesRes] = await Promise.all([
        req.supabase.from('expense_reports').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
        req.supabase.from('expense_reports').select('total_amount').eq('status', 'submitted'),
        req.supabase.from('expense_reports').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        req.supabase.from('expense_reports').select('total_amount').eq('status', 'paid').gte('paid_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        req.supabase.from('expense_items').select('category_id, amount').gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
      ]);
      const totalPendingAmount = (totalPendingAmountRes.data || []).reduce((s, r) => s + (r.total_amount || 0), 0);
      const thisMonthTotal = (thisMonthRes.data || []).reduce((s, r) => s + (r.total_amount || 0), 0);
      const categoryTotals = {};
      (topCategoriesRes.data || []).forEach((r) => { categoryTotals[r.category_id] = (categoryTotals[r.category_id] || 0) + (r.amount || 0); });
      const categoryIds = Object.keys(categoryTotals);
      const { data: cats } = categoryIds.length ? await req.supabase.from('expense_categories').select('id, name').in('id', categoryIds) : { data: [] };
      const nameById = new Map((cats || []).map((c) => [c.id, c.name]));
      const topCategories = Object.entries(categoryTotals)
        .map(([id, total]) => ({ name: nameById.get(id), total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
      orgStats = {
        totalPendingReports: totalPendingRes.count ?? 0,
        totalPendingAmount,
        approvedAwaitingPayment: approvedAwaitingRes.count ?? 0,
        thisMonthTotal,
        topCategories,
      };
    }
    res.json({ myStats, orgStats });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
