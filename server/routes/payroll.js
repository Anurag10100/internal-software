const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// ==========================================
// SALARY STRUCTURES
// ==========================================

// Get all salary structures
router.get('/structures', authenticateToken, (req, res) => {
  try {
    const structures = db.prepare(`
      SELECT * FROM salary_structures WHERE is_active = 1 ORDER BY name
    `).all();
    res.json(structures);
  } catch (error) {
    console.error('Error fetching salary structures:', error);
    res.status(500).json({ error: 'Failed to fetch salary structures' });
  }
});

// Create salary structure
router.post('/structures', authenticateToken, isAdmin, (req, res) => {
  try {
    const { name, description, basic_percentage, hra_percentage, da_percentage, special_allowance_percentage, pf_percentage, esi_percentage, professional_tax } = req.body;

    const id = `ss-${uuidv4()}`;
    db.prepare(`
      INSERT INTO salary_structures (id, name, description, basic_percentage, hra_percentage, da_percentage, special_allowance_percentage, pf_percentage, esi_percentage, professional_tax)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, description, basic_percentage || 40, hra_percentage || 20, da_percentage || 10, special_allowance_percentage || 30, pf_percentage || 12, esi_percentage || 1.75, professional_tax || 200);

    const structure = db.prepare('SELECT * FROM salary_structures WHERE id = ?').get(id);
    res.status(201).json(structure);
  } catch (error) {
    console.error('Error creating salary structure:', error);
    res.status(500).json({ error: 'Failed to create salary structure' });
  }
});

// Update salary structure
router.put('/structures/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { name, description, basic_percentage, hra_percentage, da_percentage, special_allowance_percentage, pf_percentage, esi_percentage, professional_tax, is_active } = req.body;

    db.prepare(`
      UPDATE salary_structures SET name = ?, description = ?, basic_percentage = ?, hra_percentage = ?, da_percentage = ?, special_allowance_percentage = ?, pf_percentage = ?, esi_percentage = ?, professional_tax = ?, is_active = ?
      WHERE id = ?
    `).run(name, description, basic_percentage, hra_percentage, da_percentage, special_allowance_percentage, pf_percentage, esi_percentage, professional_tax, is_active ? 1 : 0, req.params.id);

    const structure = db.prepare('SELECT * FROM salary_structures WHERE id = ?').get(req.params.id);
    res.json(structure);
  } catch (error) {
    console.error('Error updating salary structure:', error);
    res.status(500).json({ error: 'Failed to update salary structure' });
  }
});

// ==========================================
// EMPLOYEE SALARIES
// ==========================================

// Get all employee salaries (admin)
router.get('/salaries', authenticateToken, isAdmin, (req, res) => {
  try {
    const salaries = db.prepare(`
      SELECT es.*, u.name as user_name, u.email, u.department, u.designation,
             ss.name as structure_name
      FROM employee_salaries es
      JOIN users u ON es.user_id = u.id
      LEFT JOIN salary_structures ss ON es.salary_structure_id = ss.id
      ORDER BY u.name
    `).all();
    res.json(salaries);
  } catch (error) {
    console.error('Error fetching salaries:', error);
    res.status(500).json({ error: 'Failed to fetch salaries' });
  }
});

// Get my salary
router.get('/salaries/my-salary', authenticateToken, (req, res) => {
  try {
    const salary = db.prepare(`
      SELECT es.*, ss.name as structure_name
      FROM employee_salaries es
      LEFT JOIN salary_structures ss ON es.salary_structure_id = ss.id
      WHERE es.user_id = ?
    `).get(req.user.id);
    res.json(salary || null);
  } catch (error) {
    console.error('Error fetching salary:', error);
    res.status(500).json({ error: 'Failed to fetch salary' });
  }
});

// Get salary by user ID
router.get('/salaries/user/:userId', authenticateToken, isAdmin, (req, res) => {
  try {
    const salary = db.prepare(`
      SELECT es.*, u.name as user_name, u.email, u.department, u.designation,
             ss.name as structure_name
      FROM employee_salaries es
      JOIN users u ON es.user_id = u.id
      LEFT JOIN salary_structures ss ON es.salary_structure_id = ss.id
      WHERE es.user_id = ?
    `).get(req.params.userId);
    res.json(salary || null);
  } catch (error) {
    console.error('Error fetching salary:', error);
    res.status(500).json({ error: 'Failed to fetch salary' });
  }
});

// Create/Update employee salary
router.post('/salaries', authenticateToken, isAdmin, (req, res) => {
  try {
    const { user_id, salary_structure_id, gross_salary, other_allowances, tds, bank_name, bank_account_number, ifsc_code, pan_number, effective_from } = req.body;

    // Get salary structure
    const structure = db.prepare('SELECT * FROM salary_structures WHERE id = ?').get(salary_structure_id);
    if (!structure) {
      return res.status(400).json({ error: 'Invalid salary structure' });
    }

    // Calculate salary components
    const basic_salary = (gross_salary * structure.basic_percentage) / 100;
    const hra = (gross_salary * structure.hra_percentage) / 100;
    const da = (gross_salary * structure.da_percentage) / 100;
    const special_allowance = (gross_salary * structure.special_allowance_percentage) / 100;
    const pf_employee = (basic_salary * structure.pf_percentage) / 100;
    const pf_employer = pf_employee;
    const esi_employee = gross_salary <= 21000 ? (gross_salary * structure.esi_percentage) / 100 : 0;
    const esi_employer = gross_salary <= 21000 ? (gross_salary * 3.25) / 100 : 0;
    const professional_tax = structure.professional_tax || 200;
    const total_deductions = pf_employee + esi_employee + professional_tax + (tds || 0);
    const net_salary = gross_salary - total_deductions + (other_allowances || 0);

    // Check if salary exists
    const existing = db.prepare('SELECT id FROM employee_salaries WHERE user_id = ?').get(user_id);

    if (existing) {
      db.prepare(`
        UPDATE employee_salaries SET
          salary_structure_id = ?, gross_salary = ?, basic_salary = ?, hra = ?, da = ?,
          special_allowance = ?, other_allowances = ?, pf_employee = ?, pf_employer = ?,
          esi_employee = ?, esi_employer = ?, professional_tax = ?, tds = ?, net_salary = ?,
          bank_name = ?, bank_account_number = ?, ifsc_code = ?, pan_number = ?,
          effective_from = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(salary_structure_id, gross_salary, basic_salary, hra, da, special_allowance, other_allowances || 0, pf_employee, pf_employer, esi_employee, esi_employer, professional_tax, tds || 0, net_salary, bank_name, bank_account_number, ifsc_code, pan_number, effective_from, user_id);
    } else {
      const id = `sal-${uuidv4()}`;
      db.prepare(`
        INSERT INTO employee_salaries (id, user_id, salary_structure_id, gross_salary, basic_salary, hra, da, special_allowance, other_allowances, pf_employee, pf_employer, esi_employee, esi_employer, professional_tax, tds, net_salary, bank_name, bank_account_number, ifsc_code, pan_number, effective_from)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, user_id, salary_structure_id, gross_salary, basic_salary, hra, da, special_allowance, other_allowances || 0, pf_employee, pf_employer, esi_employee, esi_employer, professional_tax, tds || 0, net_salary, bank_name, bank_account_number, ifsc_code, pan_number, effective_from);
    }

    const salary = db.prepare(`
      SELECT es.*, u.name as user_name, u.email, u.department, u.designation
      FROM employee_salaries es
      JOIN users u ON es.user_id = u.id
      WHERE es.user_id = ?
    `).get(user_id);
    res.json(salary);
  } catch (error) {
    console.error('Error saving salary:', error);
    res.status(500).json({ error: 'Failed to save salary' });
  }
});

// ==========================================
// PAYSLIPS
// ==========================================

// Get all payslips (admin)
router.get('/payslips', authenticateToken, isAdmin, (req, res) => {
  try {
    const { month, year, status } = req.query;
    let query = `
      SELECT p.*, u.name as user_name, u.email, u.department, u.designation
      FROM payslips p
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (month) {
      query += ' AND p.month = ?';
      params.push(parseInt(month));
    }
    if (year) {
      query += ' AND p.year = ?';
      params.push(parseInt(year));
    }
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    query += ' ORDER BY p.year DESC, p.month DESC, u.name';

    const payslips = db.prepare(query).all(...params);
    res.json(payslips);
  } catch (error) {
    console.error('Error fetching payslips:', error);
    res.status(500).json({ error: 'Failed to fetch payslips' });
  }
});

// Get my payslips
router.get('/payslips/my-payslips', authenticateToken, (req, res) => {
  try {
    const payslips = db.prepare(`
      SELECT * FROM payslips WHERE user_id = ? AND status IN ('approved', 'paid')
      ORDER BY year DESC, month DESC
    `).all(req.user.id);
    res.json(payslips);
  } catch (error) {
    console.error('Error fetching payslips:', error);
    res.status(500).json({ error: 'Failed to fetch payslips' });
  }
});

// Get single payslip
router.get('/payslips/:id', authenticateToken, (req, res) => {
  try {
    const payslip = db.prepare(`
      SELECT p.*, u.name as user_name, u.email, u.department, u.designation
      FROM payslips p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!payslip) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    // Check access
    if (req.user.role !== 'admin' && payslip.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(payslip);
  } catch (error) {
    console.error('Error fetching payslip:', error);
    res.status(500).json({ error: 'Failed to fetch payslip' });
  }
});

// Generate payslips for a month
router.post('/payslips/generate', authenticateToken, isAdmin, (req, res) => {
  try {
    const { month, year, user_ids } = req.body;

    // Get all employees with salary configured (or specific users)
    let employeesQuery = `
      SELECT es.*, u.name, u.email, u.department, u.designation
      FROM employee_salaries es
      JOIN users u ON es.user_id = u.id
    `;

    let employees;
    if (user_ids && user_ids.length > 0) {
      employeesQuery += ` WHERE es.user_id IN (${user_ids.map(() => '?').join(',')})`;
      employees = db.prepare(employeesQuery).all(...user_ids);
    } else {
      employees = db.prepare(employeesQuery).all();
    }

    const generated = [];
    const workingDays = 26; // Assuming 26 working days per month

    for (const emp of employees) {
      // Check if payslip already exists
      const existing = db.prepare('SELECT id FROM payslips WHERE user_id = ? AND month = ? AND year = ?').get(emp.user_id, month, year);
      if (existing) continue;

      // Get attendance for the month
      const attendance = db.prepare(`
        SELECT COUNT(*) as days_present FROM check_ins
        WHERE user_id = ? AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
        AND status IN ('on_time', 'late', 'half_day')
      `).get(emp.user_id, String(month).padStart(2, '0'), String(year));

      const daysWorked = attendance?.days_present || workingDays;
      const daysAbsent = workingDays - daysWorked;

      // Prorate salary if days absent
      const dailyRate = emp.gross_salary / workingDays;
      const absenceDeduction = daysAbsent * dailyRate;
      const effectiveGross = emp.gross_salary - absenceDeduction;

      // Calculate components
      const grossEarnings = effectiveGross + (emp.other_allowances || 0);
      const totalDeductions = emp.pf_employee + emp.esi_employee + emp.professional_tax + (emp.tds || 0);
      const netSalary = grossEarnings - totalDeductions;

      const payslipId = `ps-${uuidv4()}`;
      const payPeriodStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const payPeriodEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      db.prepare(`
        INSERT INTO payslips (
          id, user_id, month, year, pay_period_start, pay_period_end,
          working_days, days_worked, days_absent,
          basic_salary, hra, da, special_allowance, other_allowances,
          gross_earnings, pf_employee, pf_employer, esi_employee, professional_tax, tds,
          total_deductions, net_salary, status, generated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', CURRENT_TIMESTAMP)
      `).run(
        payslipId, emp.user_id, month, year, payPeriodStart, payPeriodEnd,
        workingDays, daysWorked, daysAbsent,
        emp.basic_salary * (daysWorked / workingDays),
        emp.hra * (daysWorked / workingDays),
        emp.da * (daysWorked / workingDays),
        emp.special_allowance * (daysWorked / workingDays),
        emp.other_allowances || 0,
        grossEarnings, emp.pf_employee, emp.pf_employer, emp.esi_employee,
        emp.professional_tax, emp.tds || 0, totalDeductions, netSalary
      );

      generated.push(payslipId);
    }

    res.json({ message: `Generated ${generated.length} payslips`, generated });
  } catch (error) {
    console.error('Error generating payslips:', error);
    res.status(500).json({ error: 'Failed to generate payslips' });
  }
});

// Approve payslip
router.post('/payslips/:id/approve', authenticateToken, isAdmin, (req, res) => {
  try {
    db.prepare(`
      UPDATE payslips SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user.id, req.params.id);

    const payslip = db.prepare('SELECT * FROM payslips WHERE id = ?').get(req.params.id);
    res.json(payslip);
  } catch (error) {
    console.error('Error approving payslip:', error);
    res.status(500).json({ error: 'Failed to approve payslip' });
  }
});

// Mark payslip as paid
router.post('/payslips/:id/pay', authenticateToken, isAdmin, (req, res) => {
  try {
    const { payment_reference } = req.body;
    db.prepare(`
      UPDATE payslips SET status = 'paid', paid_at = CURRENT_TIMESTAMP, payment_reference = ?
      WHERE id = ?
    `).run(payment_reference, req.params.id);

    const payslip = db.prepare('SELECT * FROM payslips WHERE id = ?').get(req.params.id);
    res.json(payslip);
  } catch (error) {
    console.error('Error marking payslip as paid:', error);
    res.status(500).json({ error: 'Failed to update payslip' });
  }
});

// ==========================================
// SALARY REVISIONS
// ==========================================

// Get salary revisions
router.get('/revisions', authenticateToken, isAdmin, (req, res) => {
  try {
    const revisions = db.prepare(`
      SELECT sr.*, u.name as user_name, u.department, u.designation,
             a.name as approved_by_name
      FROM salary_revisions sr
      JOIN users u ON sr.user_id = u.id
      LEFT JOIN users a ON sr.approved_by = a.id
      ORDER BY sr.created_at DESC
    `).all();
    res.json(revisions);
  } catch (error) {
    console.error('Error fetching revisions:', error);
    res.status(500).json({ error: 'Failed to fetch revisions' });
  }
});

// Create salary revision
router.post('/revisions', authenticateToken, isAdmin, (req, res) => {
  try {
    const { user_id, new_gross, revision_type, reason, effective_from } = req.body;

    // Get current salary
    const currentSalary = db.prepare('SELECT gross_salary FROM employee_salaries WHERE user_id = ?').get(user_id);
    const previous_gross = currentSalary?.gross_salary || 0;
    const percentage_increase = previous_gross > 0 ? ((new_gross - previous_gross) / previous_gross) * 100 : 0;

    const id = `rev-${uuidv4()}`;
    db.prepare(`
      INSERT INTO salary_revisions (id, user_id, previous_gross, new_gross, revision_type, percentage_increase, reason, effective_from)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, user_id, previous_gross, new_gross, revision_type || 'annual', percentage_increase, reason, effective_from);

    const revision = db.prepare(`
      SELECT sr.*, u.name as user_name, u.department
      FROM salary_revisions sr
      JOIN users u ON sr.user_id = u.id
      WHERE sr.id = ?
    `).get(id);
    res.status(201).json(revision);
  } catch (error) {
    console.error('Error creating revision:', error);
    res.status(500).json({ error: 'Failed to create revision' });
  }
});

// Approve salary revision
router.post('/revisions/:id/approve', authenticateToken, isAdmin, (req, res) => {
  try {
    const revision = db.prepare('SELECT * FROM salary_revisions WHERE id = ?').get(req.params.id);
    if (!revision) {
      return res.status(404).json({ error: 'Revision not found' });
    }

    // Update revision status
    db.prepare(`
      UPDATE salary_revisions SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user.id, req.params.id);

    // Update employee salary
    const salary = db.prepare('SELECT * FROM employee_salaries WHERE user_id = ?').get(revision.user_id);
    if (salary) {
      const structure = db.prepare('SELECT * FROM salary_structures WHERE id = ?').get(salary.salary_structure_id);
      const gross_salary = revision.new_gross;
      const basic_salary = (gross_salary * structure.basic_percentage) / 100;
      const hra = (gross_salary * structure.hra_percentage) / 100;
      const da = (gross_salary * structure.da_percentage) / 100;
      const special_allowance = (gross_salary * structure.special_allowance_percentage) / 100;
      const pf_employee = (basic_salary * structure.pf_percentage) / 100;
      const total_deductions = pf_employee + salary.esi_employee + salary.professional_tax + salary.tds;
      const net_salary = gross_salary - total_deductions + salary.other_allowances;

      db.prepare(`
        UPDATE employee_salaries SET gross_salary = ?, basic_salary = ?, hra = ?, da = ?,
        special_allowance = ?, pf_employee = ?, pf_employer = ?, net_salary = ?,
        effective_from = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?
      `).run(gross_salary, basic_salary, hra, da, special_allowance, pf_employee, pf_employee, net_salary, revision.effective_from, revision.user_id);
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

// Get my tax declaration
router.get('/tax-declarations/my-declarations', authenticateToken, (req, res) => {
  try {
    const declarations = db.prepare(`
      SELECT * FROM tax_declarations WHERE user_id = ? ORDER BY financial_year DESC
    `).all(req.user.id);
    res.json(declarations);
  } catch (error) {
    console.error('Error fetching declarations:', error);
    res.status(500).json({ error: 'Failed to fetch declarations' });
  }
});

// Get all declarations (admin)
router.get('/tax-declarations', authenticateToken, isAdmin, (req, res) => {
  try {
    const declarations = db.prepare(`
      SELECT td.*, u.name as user_name, u.department
      FROM tax_declarations td
      JOIN users u ON td.user_id = u.id
      ORDER BY td.financial_year DESC, u.name
    `).all();
    res.json(declarations);
  } catch (error) {
    console.error('Error fetching declarations:', error);
    res.status(500).json({ error: 'Failed to fetch declarations' });
  }
});

// Create/Update tax declaration
router.post('/tax-declarations', authenticateToken, (req, res) => {
  try {
    const { financial_year, regime, section_80c, section_80d, section_80g, hra_exemption, lta, other_exemptions } = req.body;

    const total_deductions = (section_80c || 0) + (section_80d || 0) + (section_80g || 0) + (hra_exemption || 0) + (lta || 0) + (other_exemptions || 0);

    const existing = db.prepare('SELECT id FROM tax_declarations WHERE user_id = ? AND financial_year = ?').get(req.user.id, financial_year);

    if (existing) {
      db.prepare(`
        UPDATE tax_declarations SET regime = ?, section_80c = ?, section_80d = ?, section_80g = ?,
        hra_exemption = ?, lta = ?, other_exemptions = ?, total_deductions = ?, status = 'draft'
        WHERE id = ?
      `).run(regime, section_80c || 0, section_80d || 0, section_80g || 0, hra_exemption || 0, lta || 0, other_exemptions || 0, total_deductions, existing.id);
    } else {
      const id = `td-${uuidv4()}`;
      db.prepare(`
        INSERT INTO tax_declarations (id, user_id, financial_year, regime, section_80c, section_80d, section_80g, hra_exemption, lta, other_exemptions, total_deductions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, req.user.id, financial_year, regime || 'new', section_80c || 0, section_80d || 0, section_80g || 0, hra_exemption || 0, lta || 0, other_exemptions || 0, total_deductions);
    }

    const declaration = db.prepare('SELECT * FROM tax_declarations WHERE user_id = ? AND financial_year = ?').get(req.user.id, financial_year);
    res.json(declaration);
  } catch (error) {
    console.error('Error saving declaration:', error);
    res.status(500).json({ error: 'Failed to save declaration' });
  }
});

// Submit tax declaration
router.post('/tax-declarations/:id/submit', authenticateToken, (req, res) => {
  try {
    db.prepare(`
      UPDATE tax_declarations SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?
    `).run(req.params.id, req.user.id);
    res.json({ message: 'Declaration submitted' });
  } catch (error) {
    console.error('Error submitting declaration:', error);
    res.status(500).json({ error: 'Failed to submit declaration' });
  }
});

// ==========================================
// REIMBURSEMENTS
// ==========================================

// Get my reimbursements
router.get('/reimbursements/my-reimbursements', authenticateToken, (req, res) => {
  try {
    const reimbursements = db.prepare(`
      SELECT * FROM reimbursements WHERE user_id = ? ORDER BY created_at DESC
    `).all(req.user.id);
    res.json(reimbursements);
  } catch (error) {
    console.error('Error fetching reimbursements:', error);
    res.status(500).json({ error: 'Failed to fetch reimbursements' });
  }
});

// Get all reimbursements (admin)
router.get('/reimbursements', authenticateToken, isAdmin, (req, res) => {
  try {
    const reimbursements = db.prepare(`
      SELECT r.*, u.name as user_name, u.department, a.name as approved_by_name
      FROM reimbursements r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN users a ON r.approved_by = a.id
      ORDER BY r.created_at DESC
    `).all();
    res.json(reimbursements);
  } catch (error) {
    console.error('Error fetching reimbursements:', error);
    res.status(500).json({ error: 'Failed to fetch reimbursements' });
  }
});

// Create reimbursement request
router.post('/reimbursements', authenticateToken, (req, res) => {
  try {
    const { category, amount, description, receipt_url, expense_date } = req.body;

    const id = `reimb-${uuidv4()}`;
    db.prepare(`
      INSERT INTO reimbursements (id, user_id, category, amount, description, receipt_url, expense_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, category, amount, description, receipt_url, expense_date);

    const reimbursement = db.prepare('SELECT * FROM reimbursements WHERE id = ?').get(id);
    res.status(201).json(reimbursement);
  } catch (error) {
    console.error('Error creating reimbursement:', error);
    res.status(500).json({ error: 'Failed to create reimbursement' });
  }
});

// Approve/Reject reimbursement
router.put('/reimbursements/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { status, rejection_reason } = req.body;

    db.prepare(`
      UPDATE reimbursements SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, rejection_reason = ?
      WHERE id = ?
    `).run(status, req.user.id, rejection_reason, req.params.id);

    const reimbursement = db.prepare('SELECT * FROM reimbursements WHERE id = ?').get(req.params.id);
    res.json(reimbursement);
  } catch (error) {
    console.error('Error updating reimbursement:', error);
    res.status(500).json({ error: 'Failed to update reimbursement' });
  }
});

// ==========================================
// LOANS
// ==========================================

// Get my loans
router.get('/loans/my-loans', authenticateToken, (req, res) => {
  try {
    const loans = db.prepare(`
      SELECT * FROM employee_loans WHERE user_id = ? ORDER BY created_at DESC
    `).all(req.user.id);
    res.json(loans);
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

// Get all loans (admin)
router.get('/loans', authenticateToken, isAdmin, (req, res) => {
  try {
    const loans = db.prepare(`
      SELECT l.*, u.name as user_name, u.department, a.name as approved_by_name
      FROM employee_loans l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN users a ON l.approved_by = a.id
      ORDER BY l.created_at DESC
    `).all();
    res.json(loans);
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

// Apply for loan
router.post('/loans', authenticateToken, (req, res) => {
  try {
    const { loan_type, principal_amount, tenure_months } = req.body;

    const interest_rate = loan_type === 'advance' ? 0 : 8; // 8% for loans, 0 for advance
    const total_amount = principal_amount * (1 + (interest_rate * tenure_months) / 1200);
    const emi_amount = total_amount / tenure_months;
    const start_date = new Date().toISOString().split('T')[0];

    const id = `loan-${uuidv4()}`;
    db.prepare(`
      INSERT INTO employee_loans (id, user_id, loan_type, principal_amount, interest_rate, total_amount, emi_amount, tenure_months, remaining_amount, remaining_emis, start_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, loan_type, principal_amount, interest_rate, total_amount, emi_amount, tenure_months, total_amount, tenure_months, start_date);

    const loan = db.prepare('SELECT * FROM employee_loans WHERE id = ?').get(id);
    res.status(201).json(loan);
  } catch (error) {
    console.error('Error creating loan:', error);
    res.status(500).json({ error: 'Failed to create loan' });
  }
});

// Approve loan
router.post('/loans/:id/approve', authenticateToken, isAdmin, (req, res) => {
  try {
    db.prepare(`
      UPDATE employee_loans SET status = 'active', approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(req.user.id, req.params.id);
    res.json({ message: 'Loan approved' });
  } catch (error) {
    console.error('Error approving loan:', error);
    res.status(500).json({ error: 'Failed to approve loan' });
  }
});

// ==========================================
// PAYROLL DASHBOARD
// ==========================================

router.get('/dashboard', authenticateToken, isAdmin, (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const stats = {
      totalEmployees: db.prepare('SELECT COUNT(*) as count FROM employee_salaries').get().count,
      totalPayroll: db.prepare('SELECT SUM(gross_salary) as total FROM employee_salaries').get().total || 0,
      pendingPayslips: db.prepare('SELECT COUNT(*) as count FROM payslips WHERE status = ? AND month = ? AND year = ?').get('draft', currentMonth, currentYear).count,
      pendingReimbursements: db.prepare('SELECT COUNT(*) as count FROM reimbursements WHERE status = ?').get('pending').count,
      pendingLoans: db.prepare('SELECT COUNT(*) as count FROM employee_loans WHERE status = ?').get('pending').count,
      activeLoans: db.prepare('SELECT COUNT(*) as count FROM employee_loans WHERE status = ?').get('active').count,
      totalLoanAmount: db.prepare('SELECT SUM(remaining_amount) as total FROM employee_loans WHERE status = ?').get('active').total || 0,
      recentRevisions: db.prepare('SELECT COUNT(*) as count FROM salary_revisions WHERE status = ? AND created_at >= date("now", "-30 days")').get('pending').count
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
