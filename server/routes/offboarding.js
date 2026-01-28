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
// EXIT REQUESTS
// ==========================================

// Get all exit requests (admin)
router.get('/exit-requests', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let q = req.supabase
      .from('exit_requests')
      .select('*, user:users!user_id(name, email, department, designation, avatar), approved_by_user:users!approved_by(name)')
      .order('created_at', { ascending: false });

    if (status) q = q.eq('status', status);

    const { data: requests, error } = await q;
    if (error) throw error;

    const formatted = (requests || []).map(r => ({
      ...r,
      user_name: r.user?.name,
      email: r.user?.email,
      department: r.user?.department,
      designation: r.user?.designation,
      avatar: r.user?.avatar,
      approved_by_name: r.approved_by_user?.name,
      user: undefined,
      approved_by_user: undefined,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching exit requests:', error);
    res.status(500).json({ error: 'Failed to fetch exit requests' });
  }
});

// Get my exit request
router.get('/exit-requests/my-request', authenticateToken, async (req, res) => {
  try {
    const { data: rows, error } = await req.supabase
      .from('exit_requests')
      .select('*, approved_by_user:users!approved_by(name)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    const request = rows?.[0];
    if (!request) return res.json(null);

    const approved_by_name = request.approved_by_user?.name;
    delete request.approved_by_user;

    const { data: clearance } = await req.supabase
      .from('employee_clearance')
      .select('*, item:clearance_items!clearance_item_id(name, department, order_index), cleared_by_user:users!cleared_by(name)')
      .eq('exit_request_id', request.id);

    const { data: knowledgeTransfer } = await req.supabase
      .from('knowledge_transfer')
      .select('*, transfer_to_user:users!transfer_to_user_id(name)')
      .eq('exit_request_id', request.id)
      .order('created_at', { ascending: true });

    const clearanceItems = (clearance || [])
      .sort((a, b) => (a.item?.order_index ?? 0) - (b.item?.order_index ?? 0))
      .map(c => {
        const item_name = c.item?.name;
        const department = c.item?.department;
        const cleared_by_name = c.cleared_by_user?.name;
        delete c.item;
        delete c.cleared_by_user;
        return { ...c, item_name, department, cleared_by_name };
      });

    const ktFormatted = (knowledgeTransfer || []).map(kt => ({
      ...kt,
      transfer_to_name: kt.transfer_to_user?.name,
      transfer_to_user: undefined,
    }));

    res.json({
      ...request,
      approved_by_name,
      clearance: clearanceItems,
      knowledgeTransfer: ktFormatted,
    });
  } catch (error) {
    console.error('Error fetching exit request:', error);
    res.status(500).json({ error: 'Failed to fetch exit request' });
  }
});

// Get single exit request
router.get('/exit-requests/:id', authenticateToken, async (req, res) => {
  try {
    const { data: request, error } = await req.supabase
      .from('exit_requests')
      .select('*, user:users!user_id(name, email, department, designation, avatar), approved_by_user:users!approved_by(name)')
      .eq('id', req.params.id)
      .single();

    if (error || !request) {
      if (error?.code === 'PGRST116') return res.status(404).json({ error: 'Exit request not found' });
      throw error || new Error('Not found');
    }

    if (request.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user_name = request.user?.name;
    const email = request.user?.email;
    const department = request.user?.department;
    const designation = request.user?.designation;
    const avatar = request.user?.avatar;
    const approved_by_name = request.approved_by_user?.name;
    delete request.user;
    delete request.approved_by_user;

    const { data: clearanceRows } = await req.supabase
      .from('employee_clearance')
      .select('*, item:clearance_items!clearance_item_id(name, department, description), cleared_by_user:users!cleared_by(name)')
      .eq('exit_request_id', req.params.id);

    const clearance = (clearanceRows || []).map(c => {
      const item_name = c.item?.name;
      const item_department = c.item?.department;
      const description = c.item?.description;
      const cleared_by_name = c.cleared_by_user?.name;
      delete c.item;
      delete c.cleared_by_user;
      return { ...c, item_name, department: item_department, description, cleared_by_name };
    });

    const { data: exitInterview } = await req.supabase
      .from('exit_interviews')
      .select('*, interviewer:users!interviewer_id(name)')
      .eq('exit_request_id', req.params.id)
      .maybeSingle();

    const { data: ktRows } = await req.supabase
      .from('knowledge_transfer')
      .select('*, transfer_to_user:users!transfer_to_user_id(name)')
      .eq('exit_request_id', req.params.id)
      .order('created_at', { ascending: true });

    const knowledgeTransfer = (ktRows || []).map(kt => ({
      ...kt,
      transfer_to_name: kt.transfer_to_user?.name,
      transfer_to_user: undefined,
    }));

    const { data: settlementRow } = await req.supabase
      .from('final_settlements')
      .select('*, approved_by_user:users!approved_by(name)')
      .eq('exit_request_id', req.params.id)
      .maybeSingle();

    const settlement = settlementRow
      ? { ...settlementRow, approved_by_name: settlementRow.approved_by_user?.name, approved_by_user: undefined }
      : null;

    res.json({
      ...request,
      user_name,
      email,
      department,
      designation,
      avatar,
      approved_by_name,
      clearance,
      exitInterview: exitInterview
        ? { ...exitInterview, interviewer_name: exitInterview.interviewer?.name, interviewer: undefined }
        : null,
      knowledgeTransfer,
      settlement,
    });
  } catch (error) {
    console.error('Error fetching exit request:', error);
    res.status(500).json({ error: 'Failed to fetch exit request' });
  }
});

// Submit resignation
router.post('/exit-requests', authenticateToken, async (req, res) => {
  try {
    const { resignation_date, last_working_day, exit_type, reason_category, reason_details, is_notice_served, notice_buyout_days } = req.body;

    const startDate = new Date(resignation_date);
    const endDate = new Date(last_working_day);
    const notice_period_days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    const id = `exit-${uuidv4()}`;
    const { error: insertErr } = await req.supabase.from('exit_requests').insert({
      id,
      user_id: req.user.id,
      resignation_date,
      last_working_day,
      notice_period_days,
      exit_type: exit_type || 'resignation',
      reason_category,
      reason_details,
      is_notice_served: is_notice_served !== false ? 1 : 0,
      notice_buyout_days: notice_buyout_days || 0,
    });

    if (insertErr) throw insertErr;

    const { data: clearanceItems } = await req.supabase
      .from('clearance_items')
      .select('id')
      .eq('is_active', 1)
      .order('order_index', { ascending: true });

    if (clearanceItems?.length) {
      const ecRows = clearanceItems.map((item) => ({
        id: `ec-${uuidv4()}`,
        exit_request_id: id,
        clearance_item_id: item.id,
      }));
      await req.supabase.from('employee_clearance').insert(ecRows);
    }

    const { data: request, error: fetchErr } = await req.supabase.from('exit_requests').select('*').eq('id', id).single();
    if (fetchErr) throw fetchErr;
    res.status(201).json(request);
  } catch (error) {
    console.error('Error creating exit request:', error);
    res.status(500).json({ error: 'Failed to create exit request' });
  }
});

// Update exit request status
router.put('/exit-requests/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status, last_working_day, notice_buyout_days, notice_buyout_amount } = req.body;

    const updates = { status };
    if (status === 'approved') {
      updates.approved_by = req.user.id;
      updates.approved_at = new Date().toISOString();
    }
    if (last_working_day) updates.last_working_day = last_working_day;
    if (notice_buyout_days !== undefined) {
      updates.notice_buyout_days = notice_buyout_days;
      updates.notice_buyout_amount = notice_buyout_amount ?? 0;
    }

    const { error } = await req.supabase.from('exit_requests').update(updates).eq('id', req.params.id);
    if (error) throw error;

    const { data: request, error: fetchErr } = await req.supabase.from('exit_requests').select('*').eq('id', req.params.id).single();
    if (fetchErr) throw fetchErr;
    res.json(request);
  } catch (error) {
    console.error('Error updating exit request:', error);
    res.status(500).json({ error: 'Failed to update exit request' });
  }
});

// Withdraw exit request
router.post('/exit-requests/:id/withdraw', authenticateToken, async (req, res) => {
  try {
    const { data: row, error: fetchErr } = await req.supabase
      .from('exit_requests')
      .select('user_id, status')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !row) return res.status(404).json({ error: 'Exit request not found' });
    if (row.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (row.status !== 'pending') return res.status(400).json({ error: 'Cannot withdraw processed request' });

    const { error } = await req.supabase.from('exit_requests').update({ status: 'withdrawn' }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Exit request withdrawn' });
  } catch (error) {
    console.error('Error withdrawing request:', error);
    res.status(500).json({ error: 'Failed to withdraw request' });
  }
});

// ==========================================
// CLEARANCE
// ==========================================

// Get clearance items (admin)
router.get('/clearance-items', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { data: items, error } = await req.supabase
      .from('clearance_items')
      .select('*')
      .eq('is_active', 1)
      .order('order_index', { ascending: true });
    if (error) throw error;
    res.json(items || []);
  } catch (error) {
    console.error('Error fetching clearance items:', error);
    res.status(500).json({ error: 'Failed to fetch clearance items' });
  }
});

// Create clearance item
router.post('/clearance-items', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, department, description, is_mandatory, order_index } = req.body;
    const id = `ci-${uuidv4()}`;
    const { error } = await req.supabase.from('clearance_items').insert({
      id,
      name,
      department,
      description,
      is_mandatory: is_mandatory !== false ? 1 : 0,
      order_index: order_index ?? 0,
    });
    if (error) throw error;

    const { data: item, error: fetchErr } = await req.supabase.from('clearance_items').select('*').eq('id', id).single();
    if (fetchErr) throw fetchErr;
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating clearance item:', error);
    res.status(500).json({ error: 'Failed to create clearance item' });
  }
});

// Update employee clearance status
router.put('/clearance/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const { error } = await req.supabase
      .from('employee_clearance')
      .update({ status, cleared_by: req.user.id, cleared_at: new Date().toISOString(), remarks })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Clearance updated' });
  } catch (error) {
    console.error('Error updating clearance:', error);
    res.status(500).json({ error: 'Failed to update clearance' });
  }
});

// Get pending clearances for department
router.get('/clearance/pending', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { department } = req.query;

    const { data: ecRows, error } = await req.supabase
      .from('employee_clearance')
      .select('*, item:clearance_items!clearance_item_id(name, department, description, order_index), exit_request:exit_requests!exit_request_id(last_working_day, user_id)')
      .eq('status', 'pending');

    if (error) throw error;

    const { data: exitRequests } = await req.supabase.from('exit_requests').select('id, last_working_day, user_id').eq('status', 'approved');
    const approvedIds = new Set((exitRequests || []).map((er) => er.id));

    let clearances = (ecRows || []).filter((ec) => approvedIds.has(ec.exit_request_id));
    if (department) clearances = clearances.filter((c) => c.item?.department === department);

    const exitMap = new Map((exitRequests || []).map((er) => [er.id, er]));
    const userIds = [...new Set(clearances.map((c) => exitMap.get(c.exit_request_id)?.user_id).filter(Boolean))];
    const { data: users } = await req.supabase.from('users').select('id, name, email, department').in('id', userIds);
    const userMap = new Map((users || []).map((u) => [u.id, u]));

    const result = clearances.map((ec) => {
      const er = exitMap.get(ec.exit_request_id);
      const u = er ? userMap.get(er.user_id) : null;
      return {
        ...ec,
        item_name: ec.item?.name,
        department: ec.item?.department,
        description: ec.item?.description,
        last_working_day: er?.last_working_day,
        user_name: u?.name,
        email: u?.email,
        user_department: u?.department,
        _order_index: ec.item?.order_index,
      };
    });

    result.sort((a, b) => {
      const d = (a.last_working_day || '').localeCompare(b.last_working_day || '');
      if (d !== 0) return d;
      return (a._order_index ?? 0) - (b._order_index ?? 0);
    });
    result.forEach((r) => delete r._order_index);

    res.json(result);
  } catch (error) {
    console.error('Error fetching clearances:', error);
    res.status(500).json({ error: 'Failed to fetch clearances' });
  }
});

// ==========================================
// EXIT INTERVIEWS
// ==========================================

// Create exit interview
router.post('/exit-interviews', authenticateToken, isAdmin, async (req, res) => {
  try {
    const {
      exit_request_id,
      interview_date,
      overall_experience_rating,
      management_rating,
      work_environment_rating,
      growth_opportunities_rating,
      compensation_rating,
      reason_for_leaving,
      liked_most,
      improvements_suggested,
      would_recommend,
      would_rejoin,
      additional_comments,
    } = req.body;

    const id = `ei-${uuidv4()}`;
    const { error } = await req.supabase.from('exit_interviews').insert({
      id,
      exit_request_id,
      interviewer_id: req.user.id,
      interview_date,
      overall_experience_rating,
      management_rating,
      work_environment_rating,
      growth_opportunities_rating,
      compensation_rating,
      reason_for_leaving,
      liked_most,
      improvements_suggested,
      would_recommend: would_recommend ? 1 : 0,
      would_rejoin: would_rejoin ? 1 : 0,
      additional_comments,
    });
    if (error) throw error;

    const { data: ecList } = await req.supabase.from('employee_clearance').select('id, clearance_item_id').eq('exit_request_id', exit_request_id);
    const { data: exitItems } = await req.supabase.from('clearance_items').select('id').ilike('name', '%Exit Interview%');
    const exitItemIds = new Set((exitItems || []).map((i) => i.id));
    const toClear = (ecList || []).filter((ec) => exitItemIds.has(ec.clearance_item_id));
    for (const ec of toClear) {
      await req.supabase
        .from('employee_clearance')
        .update({ status: 'cleared', cleared_by: req.user.id, cleared_at: new Date().toISOString() })
        .eq('id', ec.id);
    }

    const { data: interview, error: fetchErr } = await req.supabase.from('exit_interviews').select('*').eq('id', id).single();
    if (fetchErr) throw fetchErr;
    res.status(201).json(interview);
  } catch (error) {
    console.error('Error creating exit interview:', error);
    res.status(500).json({ error: 'Failed to create exit interview' });
  }
});

// Get exit interview analytics
router.get('/exit-interviews/analytics', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { data: allInterviews, error } = await req.supabase.from('exit_interviews').select('*');
    if (error) throw error;
    const list = allInterviews || [];

    const totalExits = list.length;
    const sum = (arr, key) => arr.reduce((a, r) => a + (Number(r[key]) || 0), 0);
    const avg = (arr, key) => (arr.length ? sum(arr, key) / arr.length : 0);
    const wouldRecommend = list.filter((r) => r.would_recommend === 1).length;
    const wouldRejoin = list.filter((r) => r.would_rejoin === 1).length;

    const reasonCounts = {};
    list.forEach((r) => {
      if (r.reason_for_leaving) {
        reasonCounts[r.reason_for_leaving] = (reasonCounts[r.reason_for_leaving] || 0) + 1;
      }
    });
    const topReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason_for_leaving, count]) => ({ reason_for_leaving, count }));

    res.json({
      totalExits,
      avgOverallRating: avg(list, 'overall_experience_rating'),
      avgManagementRating: avg(list, 'management_rating'),
      avgCompensationRating: avg(list, 'compensation_rating'),
      wouldRecommend,
      wouldRejoin,
      topReasons,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ==========================================
// KNOWLEDGE TRANSFER
// ==========================================

// Get knowledge transfer items
router.get('/knowledge-transfer/:exitRequestId', authenticateToken, async (req, res) => {
  try {
    const { data: items, error } = await req.supabase
      .from('knowledge_transfer')
      .select('*, transfer_to_user:users!transfer_to_user_id(name)')
      .eq('exit_request_id', req.params.exitRequestId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    const formatted = (items || []).map((kt) => ({
      ...kt,
      transfer_to_name: kt.transfer_to_user?.name,
      transfer_to_user: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching knowledge transfer:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge transfer' });
  }
});

// Add knowledge transfer item
router.post('/knowledge-transfer', authenticateToken, async (req, res) => {
  try {
    const { exit_request_id, topic, description, transfer_to_user_id, documents } = req.body;

    const { data: exitRequest, error: fetchErr } = await req.supabase
      .from('exit_requests')
      .select('user_id')
      .eq('id', exit_request_id)
      .single();
    if (fetchErr || !exitRequest) return res.status(404).json({ error: 'Exit request not found' });
    if (exitRequest.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const id = `kt-${uuidv4()}`;
    const { error } = await req.supabase.from('knowledge_transfer').insert({
      id,
      exit_request_id,
      topic,
      description,
      transfer_to_user_id,
      documents,
    });
    if (error) throw error;

    const { data: item, error: itemErr } = await req.supabase
      .from('knowledge_transfer')
      .select('*, transfer_to_user:users!transfer_to_user_id(name)')
      .eq('id', id)
      .single();
    if (itemErr) throw itemErr;
    const formatted = { ...item, transfer_to_name: item.transfer_to_user?.name, transfer_to_user: undefined };
    res.status(201).json(formatted);
  } catch (error) {
    console.error('Error creating knowledge transfer:', error);
    res.status(500).json({ error: 'Failed to create knowledge transfer' });
  }
});

// Update knowledge transfer status
router.put('/knowledge-transfer/:id', authenticateToken, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const updates = { status, notes };
    if (status === 'completed') updates.completed_at = new Date().toISOString();
    else updates.completed_at = null;

    const { error } = await req.supabase.from('knowledge_transfer').update(updates).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Knowledge transfer updated' });
  } catch (error) {
    console.error('Error updating knowledge transfer:', error);
    res.status(500).json({ error: 'Failed to update knowledge transfer' });
  }
});

// ==========================================
// FINAL SETTLEMENT
// ==========================================

// Get final settlement
router.get('/settlements/:exitRequestId', authenticateToken, async (req, res) => {
  try {
    const { data: settlement, error } = await req.supabase
      .from('final_settlements')
      .select('*, approved_by_user:users!approved_by(name)')
      .eq('exit_request_id', req.params.exitRequestId)
      .maybeSingle();
    if (error) throw error;
    const out = settlement ? { ...settlement, approved_by_name: settlement.approved_by_user?.name, approved_by_user: undefined } : null;
    res.json(out);
  } catch (error) {
    console.error('Error fetching settlement:', error);
    res.status(500).json({ error: 'Failed to fetch settlement' });
  }
});

// Calculate final settlement
router.post('/settlements/calculate', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { exit_request_id } = req.body;

    const { data: exitRequest, error: exitErr } = await req.supabase
      .from('exit_requests')
      .select('*')
      .eq('id', exit_request_id)
      .single();
    if (exitErr || !exitRequest) return res.status(404).json({ error: 'Exit request not found' });

    const { data: salary } = await req.supabase.from('employee_salaries').select('*').eq('user_id', exitRequest.user_id).maybeSingle();

    const { count: leavesCount } = await req.supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', exitRequest.user_id)
      .eq('status', 'approved');

    const lastSalary = salary?.gross_salary ?? 0;
    const leaveEncashmentDays = Math.max(0, 21 - (leavesCount ?? 0));
    const dailyRate = lastSalary / 30;
    const leaveEncashmentAmount = leaveEncashmentDays * dailyRate;
    const noticeRecovery = (exitRequest.notice_buyout_days || 0) * dailyRate;
    const grossSettlement = lastSalary + leaveEncashmentAmount;
    const tdsDeduction = grossSettlement * 0.1;
    const netSettlement = grossSettlement - noticeRecovery - tdsDeduction;

    const { data: existing } = await req.supabase.from('final_settlements').select('id').eq('exit_request_id', exit_request_id).maybeSingle();

    if (existing) {
      await req.supabase
        .from('final_settlements')
        .update({
          last_salary: lastSalary,
          leave_encashment_days: leaveEncashmentDays,
          leave_encashment_amount: leaveEncashmentAmount,
          notice_recovery: noticeRecovery,
          gross_settlement: grossSettlement,
          tds_deduction: tdsDeduction,
          net_settlement: netSettlement,
          calculated_at: new Date().toISOString(),
          status: 'draft',
        })
        .eq('exit_request_id', exit_request_id);
    } else {
      const id = `fs-${uuidv4()}`;
      await req.supabase.from('final_settlements').insert({
        id,
        exit_request_id,
        user_id: exitRequest.user_id,
        last_salary: lastSalary,
        leave_encashment_days: leaveEncashmentDays,
        leave_encashment_amount: leaveEncashmentAmount,
        notice_recovery: noticeRecovery,
        gross_settlement: grossSettlement,
        tds_deduction: tdsDeduction,
        net_settlement: netSettlement,
        calculated_at: new Date().toISOString(),
      });
    }

    const { data: settlement, error: fetchErr } = await req.supabase
      .from('final_settlements')
      .select('*')
      .eq('exit_request_id', exit_request_id)
      .single();
    if (fetchErr) throw fetchErr;
    res.json(settlement);
  } catch (error) {
    console.error('Error calculating settlement:', error);
    res.status(500).json({ error: 'Failed to calculate settlement' });
  }
});

// Update final settlement
router.put('/settlements/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { bonus_amount, gratuity_amount, other_recoveries, recovery_details, tds_deduction } = req.body;

    const { data: current, error: fetchErr } = await req.supabase.from('final_settlements').select('*').eq('id', req.params.id).single();
    if (fetchErr || !current) return res.status(404).json({ error: 'Settlement not found' });

    const grossSettlement = current.last_salary + current.leave_encashment_amount + (bonus_amount ?? 0) + (gratuity_amount ?? 0);
    const totalRecoveries = current.notice_recovery + (other_recoveries ?? 0);
    const finalTds = tds_deduction !== undefined ? tds_deduction : current.tds_deduction;
    const netSettlement = grossSettlement - totalRecoveries - finalTds;

    const { error } = await req.supabase
      .from('final_settlements')
      .update({
        bonus_amount: bonus_amount ?? 0,
        gratuity_amount: gratuity_amount ?? 0,
        other_recoveries: other_recoveries ?? 0,
        recovery_details,
        tds_deduction: finalTds,
        gross_settlement: grossSettlement,
        net_settlement: netSettlement,
      })
      .eq('id', req.params.id);
    if (error) throw error;

    const { data: settlement, error: sErr } = await req.supabase.from('final_settlements').select('*').eq('id', req.params.id).single();
    if (sErr) throw sErr;
    res.json(settlement);
  } catch (error) {
    console.error('Error updating settlement:', error);
    res.status(500).json({ error: 'Failed to update settlement' });
  }
});

// Approve settlement
router.post('/settlements/:id/approve', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { error } = await req.supabase
      .from('final_settlements')
      .update({ status: 'approved', approved_by: req.user.id, approved_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Settlement approved' });
  } catch (error) {
    console.error('Error approving settlement:', error);
    res.status(500).json({ error: 'Failed to approve settlement' });
  }
});

// Mark settlement as paid
router.post('/settlements/:id/pay', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { payment_reference } = req.body;
    const { error } = await req.supabase
      .from('final_settlements')
      .update({ status: 'paid', paid_at: new Date().toISOString(), payment_reference })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Settlement marked as paid' });
  } catch (error) {
    console.error('Error marking paid:', error);
    res.status(500).json({ error: 'Failed to mark as paid' });
  }
});

// ==========================================
// OFFBOARDING DASHBOARD
// ==========================================

router.get('/dashboard', authenticateToken, isAdmin, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const [pendingRes, approvedRes, exitingRes, pendingEcRes, settlementsRes] = await Promise.all([
      req.supabase.from('exit_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      req.supabase.from('exit_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      req.supabase
        .from('exit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gte('last_working_day', startOfMonth)
        .lte('last_working_day', endOfMonth),
      req.supabase.from('employee_clearance').select('exit_request_id', { count: 'exact', head: true }).eq('status', 'pending'),
      req.supabase.from('final_settlements').select('*', { count: 'exact', head: true }).in('status', ['draft', 'approved']),
    ]);

    const approvedExitIds = (await req.supabase.from('exit_requests').select('id').eq('status', 'approved')).data?.map((r) => r.id) || [];
    const pendingInApproved =
      approvedExitIds.length
        ? (await req.supabase.from('employee_clearance').select('exit_request_id').eq('status', 'pending').in('exit_request_id', approvedExitIds)).data || []
        : [];
    const pendingClearancesCount = pendingInApproved.length;

    const pendingExitRequests = pendingRes.count ?? 0;
    const approvedExits = approvedRes.count ?? 0;
    const exitingThisMonth = exitingRes.count ?? 0;
    const pendingSettlements = settlementsRes.count ?? 0;

    const { data: recentExitRows } = await req.supabase
      .from('exit_requests')
      .select('id, last_working_day, exit_type, user_id')
      .eq('status', 'approved')
      .order('last_working_day', { ascending: false })
      .limit(5);

    const recentExits = [];
    if (recentExitRows?.length) {
      const { data: allEc } = await req.supabase.from('employee_clearance').select('exit_request_id, status').in('exit_request_id', recentExitRows.map((r) => r.id));
      const ecByExit = (allEc || []).reduce((acc, row) => {
        acc[row.exit_request_id] = acc[row.exit_request_id] || { total: 0, cleared: 0 };
        acc[row.exit_request_id].total += 1;
        if (row.status === 'cleared') acc[row.exit_request_id].cleared += 1;
        return acc;
      }, {});
      const userIds = [...new Set(recentExitRows.map((r) => r.user_id))];
      const { data: users } = await req.supabase.from('users').select('id, name, department').in('id', userIds);
      const userMap = new Map((users || []).map((u) => [u.id, u]));
      for (const er of recentExitRows) {
        const u = userMap.get(er.user_id);
        const ec = ecByExit[er.id] || { total: 0, cleared: 0 };
        recentExits.push({
          id: er.id,
          last_working_day: er.last_working_day,
          exit_type: er.exit_type,
          user_name: u?.name,
          department: u?.department,
          cleared_items: ec.cleared,
          total_items: ec.total,
        });
      }
    }

    const { data: exitsByReasonRows } = await req.supabase.from('exit_requests').select('reason_category').not('reason_category', 'is', null);
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const reasonCounts = {};
    (exitsByReasonRows || []).forEach((r) => {
      reasonCounts[r.reason_category] = (reasonCounts[r.reason_category] || 0) + 1;
    });
    const exitsByReason = Object.entries(reasonCounts).map(([reason_category, count]) => ({ reason_category, count })).sort((a, b) => b.count - a.count);

    res.json({
      pendingExitRequests,
      approvedExits,
      exitingThisMonth,
      pendingClearances: pendingClearancesCount,
      pendingSettlements,
      recentExits,
      exitsByReason,
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
