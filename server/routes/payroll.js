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
// SALARY STRUCTURES
// ==========================================

router.get('/structures', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('salary_structures')
      .select('*')
      .eq('is_active', 1)
      .order('name');
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching salary structures:', error);
    res.status(500).json({ error: 'Failed to fetch salary structures' });
  }
});

router.post('/structures', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, description, basic_percentage, hra_percentage, da_percentage, special_allowance_percentage, pf_percentage, esi_percentage, professional_tax } = req.body;
    const id = `ss-${uuidv4()}`;
    const { error } = await req.supabase.from('salary_structures').insert({
      id,
      name,
      description,
      basic_percentage: basic_percentage ?? 40,
      hra_percentage: hra_percentage ?? 20,
      da_percentage: da_percentage ?? 10,
      special_allowance_percentage: special_allowance_percentage ?? 30,
      pf_percentage: pf_percentage ?? 12,
      esi_percentage: esi_percentage ?? 1.75,
      professional_tax: professional_tax ?? 200,
    });
    if (error) throw error;
    const { data: structure } = await req.supabase.from('salary_structures').select('*').eq('id', id).single();
    res.status(201).json(structure);
  } catch (error) {
    console.error('Error creating salary structure:', error);
    res.status(500).json({ error: 'Failed to create salary structure' });
  }
});

router.put('/structures/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, description, basic_percentage, hra_percentage, da_percentage, special_allowance_percentage, pf_percentage, esi_percentage, professional_tax, is_active } = req.body;
    const { error } = await req.supabase.from('salary_structures').update({
      name,
      description,
      basic_percentage,
      hra_percentage,
      da_percentage,
      special_allowance_percentage,
      pf_percentage,
      esi_percentage,
      professional_tax,
      is_active: is_active ? 1 : 0,
    }).eq('id', req.params.id);
    if (error) throw error;
    const { data: structure } = await req.supabase.from('salary_structures').select('*').eq('id', req.params.id).single();
    res.json(structure);
  } catch (error) {
    console.error('Error updating salary structure:', error);
    res.status(500).json({ error: 'Failed to update salary structure' });
  }
});

// ==========================================
// EMPLOYEE SALARIES
// ==========================================

router.get('/salaries', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('employee_salaries')
      .select('*, user:users!user_id(name, email, department, designation), structure:salary_structures!salary_structure_id(name)')
      .order('user_id');
    if (error) throw error;
    const formatted = (data || []).map(s => ({
      ...s,
      user_name: s.user?.name,
      structure_name: s.structure?.name,
      user: undefined,
      structure: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching salaries:', error);
    res.status(500).json({ error: 'Failed to fetch salaries' });
  }
});

router.get('/salaries/my-salary', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('employee_salaries')
      .select('*, structure:salary_structures!salary_structure_id(name)')
      .eq('user_id', req.user.id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    const salary = data ? { ...data, structure_name: data.structure?.name, structure: undefined } : null;
    res.json(salary);
  } catch (error) {
    console.error('Error fetching salary:', error);
    res.status(500).json({ error: 'Failed to fetch salary' });
  }
});

router.get('/salaries/user/:userId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('employee_salaries')
      .select('*, user:users!user_id(name, email, department, designation), structure:salary_structures!salary_structure_id(name)')
      .eq('user_id', req.params.userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    const salary = data ? { ...data, user_name: data.user?.name, structure_name: data.structure?.name, user: undefined, structure: undefined } : null;
    res.json(salary);
  } catch (error) {
    console.error('Error fetching salary:', error);
    res.status(500).json({ error: 'Failed to fetch salary' });
  }
});

router.post('/salaries', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { user_id, salary_structure_id, gross_salary, other_allowances, tds, bank_name, bank_account_number, ifsc_code, pan_number, effective_from } = req.body;

    const { data: structure, error: structError } = await req.supabase.from('salary_structures').select('*').eq('id', salary_structure_id).single();
    if (structError || !structure) return res.status(400).json({ error: 'Invalid salary structure' });

    const basic_salary = (gross_salary * (structure.basic_percentage || 40)) / 100;
    const hra = (gross_salary * (structure.hra_percentage || 20)) / 100;
    const da = (gross_salary * (structure.da_percentage || 10)) / 100;
    const special_allowance = (gross_salary * (structure.special_allowance_percentage || 30)) / 100;
    const pf_employee = (basic_salary * (structure.pf_percentage || 12)) / 100;
    const pf_employer = pf_employee;
    const esi_pct = structure.esi_percentage ?? 1.75;
    const esi_employee = gross_salary <= 21000 ? (gross_salary * esi_pct) / 100 : 0;
    const esi_employer = gross_salary <= 21000 ? (gross_salary * 3.25) / 100 : 0;
    const professional_tax = structure.professional_tax ?? 200;
    const total_deductions = pf_employee + esi_employee + professional_tax + (tds || 0);
    const net_salary = gross_salary - total_deductions + (other_allowances || 0);

    const { data: existing } = await req.supabase.from('employee_salaries').select('id').eq('user_id', user_id).single();

    if (existing) {
      const { error: updError } = await req.supabase.from('employee_salaries').update({
        salary_structure_id,
        gross_salary,
        basic_salary,
        hra,
        da,
        special_allowance,
        other_allowances: other_allowances || 0,
        pf_employee,
        pf_employer,
        esi_employee,
        esi_employer,
        professional_tax,
        tds: tds || 0,
        net_salary,
        bank_name,
        bank_account_number,
        ifsc_code,
        pan_number,
        effective_from,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user_id);
      if (updError) throw updError;
    } else {
      const id = `sal-${uuidv4()}`;
      const { error: insError } = await req.supabase.from('employee_salaries').insert({
        id,
        user_id,
        salary_structure_id,
        gross_salary,
        basic_salary,
        hra,
        da,
        special_allowance,
        other_allowances: other_allowances || 0,
        pf_employee,
        pf_employer,
        esi_employee,
        esi_employer,
        professional_tax,
        tds: tds || 0,
        net_salary,
        bank_name,
        bank_account_number,
        ifsc_code,
        pan_number,
        effective_from,
      });
      if (insError) throw insError;
    }

    const { data: salary } = await req.supabase.from('employee_salaries').select('*, user:users!user_id(name, email, department, designation)').eq('user_id', user_id).single();
    res.json({ ...salary, user_name: salary?.user?.name, user: undefined });
  } catch (error) {
    console.error('Error saving salary:', error);
    res.status(500).json({ error: 'Failed to save salary' });
  }
});

// ==========================================
// PAYSLIPS
// ==========================================

router.get('/payslips', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { month, year, status } = req.query;
    let q = req.supabase.from('payslips').select('*, user:users!user_id(name, email, department, designation)').order('year', { ascending: false }).order('month', { ascending: false });
    if (month) q = q.eq('month', parseInt(month));
    if (year) q = q.eq('year', parseInt(year));
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    const formatted = (data || []).map(p => ({ ...p, user_name: p.user?.name, user: undefined }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching payslips:', error);
    res.status(500).json({ error: 'Failed to fetch payslips' });
  }
});

router.get('/payslips/my-payslips', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('payslips')
      .select('*')
      .eq('user_id', req.user.id)
      .in('status', ['approved', 'paid'])
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching payslips:', error);
    res.status(500).json({ error: 'Failed to fetch payslips' });
  }
});

router.get('/payslips/:id', authenticateToken, async (req, res) => {
  try {
    const { data: payslip, error } = await req.supabase
      .from('payslips')
      .select('*, user:users!user_id(name, email, department, designation)')
      .eq('id', req.params.id)
      .single();
    if (error || !payslip) return res.status(404).json({ error: 'Payslip not found' });
    if (req.user.role !== 'admin' && payslip.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    res.json({ ...payslip, user_name: payslip.user?.name, user: undefined });
  } catch (error) {
    console.error('Error fetching payslip:', error);
    res.status(500).json({ error: 'Failed to fetch payslip' });
  }
});

router.post('/payslips/generate', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { month, year, user_ids } = req.body;
    let q = req.supabase.from('employee_salaries').select('*, user:users!user_id(name, email, department, designation)');
    if (user_ids && user_ids.length > 0) q = q.in('user_id', user_ids);
    const { data: employees, error: empError } = await q;
    if (empError) throw empError;
    if (!employees || employees.length === 0) return res.json({ message: 'Generated 0 payslips', generated: [] });

    const generated = [];
    const workingDays = 26;
    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    for (const emp of employees) {
      const { data: existing } = await req.supabase.from('payslips').select('id').eq('user_id', emp.user_id).eq('month', month).eq('year', year).single();
      if (existing) continue;

      const { data: checkins } = await req.supabase.from('check_ins').select('id').eq('user_id', emp.user_id).gte('date', startOfMonth).lte('date', endOfMonth).in('status', ['on_time', 'late', 'half_day', 'present']);
      const daysWorked = checkins?.length ?? workingDays;
      const daysAbsent = Math.max(0, workingDays - daysWorked);
      const dailyRate = emp.gross_salary / workingDays;
      const absenceDeduction = daysAbsent * dailyRate;
      const effectiveGross = emp.gross_salary - absenceDeduction;
      const grossEarnings = effectiveGross + (emp.other_allowances || 0);
      const totalDeductions = (emp.pf_employee || 0) + (emp.esi_employee || 0) + (emp.professional_tax || 0) + (emp.tds || 0);
      const netSalary = grossEarnings - totalDeductions;

      const payslipId = `ps-${uuidv4()}`;
      const payPeriodEnd = endOfMonth;

      await req.supabase.from('payslips').insert({
        id: payslipId,
        user_id: emp.user_id,
        month,
        year,
        pay_period_start: startOfMonth,
        pay_period_end: payPeriodEnd,
        working_days: workingDays,
        days_worked: daysWorked,
        days_absent: daysAbsent,
        basic_salary: (emp.basic_salary || 0) * (daysWorked / workingDays),
        hra: (emp.hra || 0) * (daysWorked / workingDays),
        da: (emp.da || 0) * (daysWorked / workingDays),
        special_allowance: (emp.special_allowance || 0) * (daysWorked / workingDays),
        other_allowances: emp.other_allowances || 0,
        gross_earnings: grossEarnings,
        pf_employee: emp.pf_employee,
        pf_employer: emp.pf_employer,
        esi_employee: emp.esi_employee,
        professional_tax: emp.professional_tax,
        tds: emp.tds || 0,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        status: 'draft',
        generated_at: new Date().toISOString(),
      });
      generated.push(payslipId);
    }
    res.json({ message: `Generated ${generated.length} payslips`, generated });
  } catch (error) {
    console.error('Error generating payslips:', error);
    res.status(500).json({ error: 'Failed to generate payslips' });
  }
});

router.post('/payslips/:id/approve', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { error } = await req.supabase.from('payslips').update({
      status: 'approved',
      approved_by: req.user.id,
      approved_at: new Date().toISOString(),
    }).eq('id', req.params.id);
    if (error) throw error;
    const { data: payslip } = await req.supabase.from('payslips').select('*').eq('id', req.params.id).single();
    res.json(payslip);
  } catch (error) {
    console.error('Error approving payslip:', error);
    res.status(500).json({ error: 'Failed to approve payslip' });
  }
});

router.post('/payslips/:id/pay', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { payment_reference } = req.body;
    const { error } = await req.supabase.from('payslips').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_reference,
    }).eq('id', req.params.id);
    if (error) throw error;
    const { data: payslip } = await req.supabase.from('payslips').select('*').eq('id', req.params.id).single();
    res.json(payslip);
  } catch (error) {
    console.error('Error marking payslip as paid:', error);
    res.status(500).json({ error: 'Failed to update payslip' });
  }
});

// ==========================================
// SALARY REVISIONS
// ==========================================

router.get('/revisions', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('salary_revisions')
      .select('*, user:users!user_id(name, department, designation), approved_by_user:users!approved_by(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const formatted = (data || []).map(r => ({ ...r, user_name: r.user?.name, approved_by_name: r.approved_by_user?.name, user: undefined, approved_by_user: undefined }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching revisions:', error);
    res.status(500).json({ error: 'Failed to fetch revisions' });
  }
});

router.post('/revisions', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { user_id, new_gross, revision_type, reason, effective_from } = req.body;
    const { data: currentSalary } = await req.supabase.from('employee_salaries').select('gross_salary').eq('user_id', user_id).single();
    const previous_gross = currentSalary?.gross_salary || 0;
    const percentage_increase = previous_gross > 0 ? ((new_gross - previous_gross) / previous_gross) * 100 : 0;
    const id = `rev-${uuidv4()}`;
    const { error } = await req.supabase.from('salary_revisions').insert({
      id,
      user_id,
      previous_gross,
      new_gross,
      revision_type: revision_type || 'annual',
      percentage_increase,
      reason,
      effective_from,
    });
    if (error) throw error;
    const { data: revision } = await req.supabase.from('salary_revisions').select('*, user:users!user_id(name, department)').eq('id', id).single();
    res.status(201).json({ ...revision, user_name: revision?.user?.name, user: undefined });
  } catch (error) {
    console.error('Error creating revision:', error);
    res.status(500).json({ error: 'Failed to create revision' });
  }
});

router.post('/revisions/:id/approve', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { data: revision, error: revErr } = await req.supabase.from('salary_revisions').select('*').eq('id', req.params.id).single();
    if (revErr || !revision) return res.status(404).json({ error: 'Revision not found' });

    await req.supabase.from('salary_revisions').update({
      status: 'approved',
      approved_by: req.user.id,
      approved_at: new Date().toISOString(),
    }).eq('id', req.params.id);

    const { data: salary } = await req.supabase.from('employee_salaries').select('*').eq('user_id', revision.user_id).single();
    if (salary) {
      const { data: structure } = await req.supabase.from('salary_structures').select('*').eq('id', salary.salary_structure_id).single();
      if (structure) {
        const gross_salary = revision.new_gross;
        const basic_salary = (gross_salary * (structure.basic_percentage || 40)) / 100;
        const hra = (gross_salary * (structure.hra_percentage || 20)) / 100;
        const da = (gross_salary * (structure.da_percentage || 10)) / 100;
        const special_allowance = (gross_salary * (structure.special_allowance_percentage || 30)) / 100;
        const pf_employee = (basic_salary * (structure.pf_percentage || 12)) / 100;
        const total_deductions = pf_employee + (salary.esi_employee || 0) + (salary.professional_tax || 0) + (salary.tds || 0);
        const net_salary = gross_salary - total_deductions + (salary.other_allowances || 0);
        await req.supabase.from('employee_salaries').update({
          gross_salary,
          basic_salary,
          hra,
          da,
          special_allowance,
          pf_employee,
          pf_employer: pf_employee,
          net_salary,
          effective_from: revision.effective_from,
          updated_at: new Date().toISOString(),
        }).eq('user_id', revision.user_id);
      }
    }
    res.json({ message: 'Revision approved and salary updated' });
  } catch (error) {
    console.error('Error approving revision:', error);
    res.status(500).json({ error: 'Failed to approve revision' });
  }
});

// ==========================================
// TAX DECLARATIONS
// ==========================================

router.get('/tax-declarations/my-declarations', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await req.supabase.from('tax_declarations').select('*').eq('user_id', req.user.id).order('financial_year', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching declarations:', error);
    res.status(500).json({ error: 'Failed to fetch declarations' });
  }
});

router.get('/tax-declarations', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { data, error } = await req.supabase.from('tax_declarations').select('*, user:users!user_id(name, department)').order('financial_year', { ascending: false });
    if (error) throw error;
    const formatted = (data || []).map(d => ({ ...d, user_name: d.user?.name, user: undefined }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching declarations:', error);
    res.status(500).json({ error: 'Failed to fetch declarations' });
  }
});

router.post('/tax-declarations', authenticateToken, async (req, res) => {
  try {
    const { financial_year, regime, section_80c, section_80d, section_80g, hra_exemption, lta, other_exemptions } = req.body;
    const total_deductions = (section_80c || 0) + (section_80d || 0) + (section_80g || 0) + (hra_exemption || 0) + (lta || 0) + (other_exemptions || 0);
    const { data: existing } = await req.supabase.from('tax_declarations').select('id').eq('user_id', req.user.id).eq('financial_year', financial_year).single();
    if (existing) {
      await req.supabase.from('tax_declarations').update({
        regime,
        section_80c: section_80c || 0,
        section_80d: section_80d || 0,
        section_80g: section_80g || 0,
        hra_exemption: hra_exemption || 0,
        lta: lta || 0,
        other_exemptions: other_exemptions || 0,
        total_deductions,
        status: 'draft',
      }).eq('id', existing.id);
    } else {
      const id = `td-${uuidv4()}`;
      await req.supabase.from('tax_declarations').insert({
        id,
        user_id: req.user.id,
        financial_year,
        regime: regime || 'new',
        section_80c: section_80c || 0,
        section_80d: section_80d || 0,
        section_80g: section_80g || 0,
        hra_exemption: hra_exemption || 0,
        lta: lta || 0,
        other_exemptions: other_exemptions || 0,
        total_deductions,
      });
    }
    const { data: declaration } = await req.supabase.from('tax_declarations').select('*').eq('user_id', req.user.id).eq('financial_year', financial_year).single();
    res.json(declaration);
  } catch (error) {
    console.error('Error saving declaration:', error);
    res.status(500).json({ error: 'Failed to save declaration' });
  }
});

router.post('/tax-declarations/:id/submit', authenticateToken, async (req, res) => {
  try {
    await req.supabase.from('tax_declarations').update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    }).eq('id', req.params.id).eq('user_id', req.user.id);
    res.json({ message: 'Declaration submitted' });
  } catch (error) {
    console.error('Error submitting declaration:', error);
    res.status(500).json({ error: 'Failed to submit declaration' });
  }
});

// ==========================================
// REIMBURSEMENTS
// ==========================================

router.get('/reimbursements/my-reimbursements', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await req.supabase.from('reimbursements').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching reimbursements:', error);
    res.status(500).json({ error: 'Failed to fetch reimbursements' });
  }
});

router.get('/reimbursements', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { data, error } = await req.supabase.from('reimbursements').select('*, user:users!user_id(name, department), approved_by_user:users!approved_by(name)').order('created_at', { ascending: false });
    if (error) throw error;
    const formatted = (data || []).map(r => ({ ...r, user_name: r.user?.name, approved_by_name: r.approved_by_user?.name, user: undefined, approved_by_user: undefined }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching reimbursements:', error);
    res.status(500).json({ error: 'Failed to fetch reimbursements' });
  }
});

router.post('/reimbursements', authenticateToken, async (req, res) => {
  try {
    const { category, amount, description, receipt_url, expense_date } = req.body;
    const id = `reimb-${uuidv4()}`;
    const { error } = await req.supabase.from('reimbursements').insert({
      id,
      user_id: req.user.id,
      category,
      amount,
      description,
      receipt_url,
      expense_date,
    });
    if (error) throw error;
    const { data: reimbursement } = await req.supabase.from('reimbursements').select('*').eq('id', id).single();
    res.status(201).json(reimbursement);
  } catch (error) {
    console.error('Error creating reimbursement:', error);
    res.status(500).json({ error: 'Failed to create reimbursement' });
  }
});

router.put('/reimbursements/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status, rejection_reason } = req.body;
    await req.supabase.from('reimbursements').update({
      status,
      approved_by: req.user.id,
      approved_at: new Date().toISOString(),
      rejection_reason,
    }).eq('id', req.params.id);
    const { data: reimbursement } = await req.supabase.from('reimbursements').select('*').eq('id', req.params.id).single();
    res.json(reimbursement);
  } catch (error) {
    console.error('Error updating reimbursement:', error);
    res.status(500).json({ error: 'Failed to update reimbursement' });
  }
});

// ==========================================
// LOANS
// ==========================================

router.get('/loans/my-loans', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await req.supabase.from('employee_loans').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

router.get('/loans', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { data, error } = await req.supabase.from('employee_loans').select('*, user:users!user_id(name, department), approved_by_user:users!approved_by(name)').order('created_at', { ascending: false });
    if (error) throw error;
    const formatted = (data || []).map(l => ({ ...l, user_name: l.user?.name, approved_by_name: l.approved_by_user?.name, user: undefined, approved_by_user: undefined }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

router.post('/loans', authenticateToken, async (req, res) => {
  try {
    const { loan_type, principal_amount, tenure_months } = req.body;
    const interest_rate = loan_type === 'advance' ? 0 : 8;
    const total_amount = principal_amount * (1 + (interest_rate * tenure_months) / 1200);
    const emi_amount = total_amount / tenure_months;
    const start_date = new Date().toISOString().split('T')[0];
    const id = `loan-${uuidv4()}`;
    const { error } = await req.supabase.from('employee_loans').insert({
      id,
      user_id: req.user.id,
      loan_type,
      principal_amount,
      interest_rate,
      total_amount,
      emi_amount,
      tenure_months,
      remaining_amount: total_amount,
      remaining_emis: tenure_months,
      start_date,
    });
    if (error) throw error;
    const { data: loan } = await req.supabase.from('employee_loans').select('*').eq('id', id).single();
    res.status(201).json(loan);
  } catch (error) {
    console.error('Error creating loan:', error);
    res.status(500).json({ error: 'Failed to create loan' });
  }
});

router.post('/loans/:id/approve', authenticateToken, isAdmin, async (req, res) => {
  try {
    await req.supabase.from('employee_loans').update({
      status: 'active',
      approved_by: req.user.id,
      approved_at: new Date().toISOString(),
    }).eq('id', req.params.id);
    res.json({ message: 'Loan approved' });
  } catch (error) {
    console.error('Error approving loan:', error);
    res.status(500).json({ error: 'Failed to approve loan' });
  }
});

// ==========================================
// PAYROLL DASHBOARD
// ==========================================

router.get('/dashboard', authenticateToken, isAdmin, async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const [{ count: totalEmployees }, { count: pendingPayslips }, { count: pendingReimbursements }, { count: pendingLoans }, { count: activeLoans }, { data: loanData }, { count: recentRevisions }] = await Promise.all([
      req.supabase.from('employee_salaries').select('*', { count: 'exact', head: true }),
      req.supabase.from('payslips').select('*', { count: 'exact', head: true }).eq('status', 'draft').eq('month', currentMonth).eq('year', currentYear),
      req.supabase.from('reimbursements').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      req.supabase.from('employee_loans').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      req.supabase.from('employee_loans').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      req.supabase.from('employee_loans').select('remaining_amount').eq('status', 'active'),
      req.supabase.from('salary_revisions').select('*', { count: 'exact', head: true }).eq('status', 'pending').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const totalPayrollRes = await req.supabase.from('employee_salaries').select('gross_salary');
    const totalPayroll = (totalPayrollRes.data || []).reduce((sum, r) => sum + (r.gross_salary || 0), 0);
    const totalLoanAmount = (loanData || []).reduce((sum, r) => sum + (r.remaining_amount || 0), 0);

    res.json({
      totalEmployees: totalEmployees || 0,
      totalPayroll,
      pendingPayslips: pendingPayslips || 0,
      pendingReimbursements: pendingReimbursements || 0,
      pendingLoans: pendingLoans || 0,
      activeLoans: activeLoans || 0,
      totalLoanAmount,
      recentRevisions: recentRevisions || 0,
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
