const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// ==========================================
// EXPENSE CATEGORIES
// ==========================================

// Get all expense categories
router.get('/categories', authenticateToken, (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT ec.*, p.name as parent_name
      FROM expense_categories ec
      LEFT JOIN expense_categories p ON ec.parent_category_id = p.id
      WHERE ec.is_active = 1
      ORDER BY ec.name
    `).all();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category
router.post('/categories', authenticateToken, isAdmin, (req, res) => {
  try {
    const { name, description, max_amount, requires_receipt, requires_approval, parent_category_id, gl_code } = req.body;

    const id = `ec-${uuidv4()}`;
    db.prepare(`
      INSERT INTO expense_categories (id, name, description, max_amount, requires_receipt, requires_approval, parent_category_id, gl_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, description, max_amount, requires_receipt ? 1 : 0, requires_approval !== false ? 1 : 0, parent_category_id, gl_code);

    const category = db.prepare('SELECT * FROM expense_categories WHERE id = ?').get(id);
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// ==========================================
// EXPENSE POLICIES
// ==========================================

// Get expense policies
router.get('/policies', authenticateToken, (req, res) => {
  try {
    const policies = db.prepare(`
      SELECT * FROM expense_policies WHERE is_active = 1 ORDER BY name
    `).all();
    res.json(policies);
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

// Create policy
router.post('/policies', authenticateToken, isAdmin, (req, res) => {
  try {
    const { name, description, applies_to, department, designation_level, daily_limit, monthly_limit, yearly_limit, auto_approve_limit } = req.body;

    const id = `ep-${uuidv4()}`;
    db.prepare(`
      INSERT INTO expense_policies (id, name, description, applies_to, department, designation_level, daily_limit, monthly_limit, yearly_limit, auto_approve_limit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, description, applies_to || 'all', department, designation_level, daily_limit, monthly_limit, yearly_limit, auto_approve_limit);

    const policy = db.prepare('SELECT * FROM expense_policies WHERE id = ?').get(id);
    res.status(201).json(policy);
  } catch (error) {
    console.error('Error creating policy:', error);
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

// ==========================================
// EXPENSE REPORTS
// ==========================================

// Get all expense reports (admin)
router.get('/reports', authenticateToken, isAdmin, (req, res) => {
  try {
    const { status, user_id } = req.query;
    let query = `
      SELECT er.*, u.name as user_name, u.department, a.name as approved_by_name,
             (SELECT COUNT(*) FROM expense_items WHERE report_id = er.id) as items_count
      FROM expense_reports er
      JOIN users u ON er.user_id = u.id
      LEFT JOIN users a ON er.approved_by = a.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND er.status = ?';
      params.push(status);
    }
    if (user_id) {
      query += ' AND er.user_id = ?';
      params.push(user_id);
    }

    query += ' ORDER BY er.created_at DESC';

    const reports = db.prepare(query).all(...params);
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get my expense reports
router.get('/reports/my-reports', authenticateToken, (req, res) => {
  try {
    const reports = db.prepare(`
      SELECT er.*, a.name as approved_by_name,
             (SELECT COUNT(*) FROM expense_items WHERE report_id = er.id) as items_count
      FROM expense_reports er
      LEFT JOIN users a ON er.approved_by = a.id
      WHERE er.user_id = ?
      ORDER BY er.created_at DESC
    `).all(req.user.id);
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get single expense report
router.get('/reports/:id', authenticateToken, (req, res) => {
  try {
    const report = db.prepare(`
      SELECT er.*, u.name as user_name, u.department, a.name as approved_by_name
      FROM expense_reports er
      JOIN users u ON er.user_id = u.id
      LEFT JOIN users a ON er.approved_by = a.id
      WHERE er.id = ?
    `).get(req.params.id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Check access
    if (req.user.role !== 'admin' && report.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get expense items
    report.items = db.prepare(`
      SELECT ei.*, ec.name as category_name
      FROM expense_items ei
      JOIN expense_categories ec ON ei.category_id = ec.id
      WHERE ei.report_id = ?
      ORDER BY ei.expense_date
    `).all(req.params.id);

    // Get mileage claims
    report.mileage = db.prepare(`
      SELECT * FROM mileage_claims WHERE report_id = ? ORDER BY claim_date
    `).all(req.params.id);

    // Get per diem claims
    report.perDiem = db.prepare(`
      SELECT * FROM per_diem_claims WHERE report_id = ? ORDER BY claim_date
    `).all(req.params.id);

    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// Create expense report
router.post('/reports', authenticateToken, (req, res) => {
  try {
    const { title, description, trip_name, trip_start_date, trip_end_date } = req.body;

    const id = `er-${uuidv4()}`;
    db.prepare(`
      INSERT INTO expense_reports (id, user_id, title, description, trip_name, trip_start_date, trip_end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, title, description, trip_name, trip_start_date, trip_end_date);

    const report = db.prepare('SELECT * FROM expense_reports WHERE id = ?').get(id);
    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Update expense report
router.put('/reports/:id', authenticateToken, (req, res) => {
  try {
    const { title, description, trip_name, trip_start_date, trip_end_date } = req.body;

    // Verify ownership
    const report = db.prepare('SELECT user_id, status FROM expense_reports WHERE id = ?').get(req.params.id);
    if (report.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (report.status !== 'draft') {
      return res.status(400).json({ error: 'Cannot edit submitted report' });
    }

    db.prepare(`
      UPDATE expense_reports SET title = ?, description = ?, trip_name = ?, trip_start_date = ?, trip_end_date = ?
      WHERE id = ?
    `).run(title, description, trip_name, trip_start_date, trip_end_date, req.params.id);

    const updatedReport = db.prepare('SELECT * FROM expense_reports WHERE id = ?').get(req.params.id);
    res.json(updatedReport);
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// Submit expense report
router.post('/reports/:id/submit', authenticateToken, (req, res) => {
  try {
    // Verify ownership
    const report = db.prepare('SELECT user_id, status FROM expense_reports WHERE id = ?').get(req.params.id);
    if (report.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate total
    const total = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expense_items WHERE report_id = ?
    `).get(req.params.id).total;

    const mileageTotal = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM mileage_claims WHERE report_id = ?
    `).get(req.params.id).total;

    const perDiemTotal = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM per_diem_claims WHERE report_id = ?
    `).get(req.params.id).total;

    const grandTotal = total + mileageTotal + perDiemTotal;

    db.prepare(`
      UPDATE expense_reports SET status = 'submitted', total_amount = ?, submitted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(grandTotal, req.params.id);

    res.json({ message: 'Report submitted', total_amount: grandTotal });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// Approve/Reject expense report
router.post('/reports/:id/review', authenticateToken, isAdmin, (req, res) => {
  try {
    const { status, rejection_reason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    db.prepare(`
      UPDATE expense_reports SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP,
      rejection_reason = ? WHERE id = ?
    `).run(status, req.user.id, status === 'rejected' ? rejection_reason : null, req.params.id);

    res.json({ message: `Report ${status}` });
  } catch (error) {
    console.error('Error reviewing report:', error);
    res.status(500).json({ error: 'Failed to review report' });
  }
});

// Mark expense report as paid
router.post('/reports/:id/pay', authenticateToken, isAdmin, (req, res) => {
  try {
    const { payment_reference } = req.body;

    db.prepare(`
      UPDATE expense_reports SET status = 'paid', paid_at = CURRENT_TIMESTAMP, payment_reference = ?
      WHERE id = ?
    `).run(payment_reference, req.params.id);

    res.json({ message: 'Report marked as paid' });
  } catch (error) {
    console.error('Error marking paid:', error);
    res.status(500).json({ error: 'Failed to mark as paid' });
  }
});

// Delete expense report
router.delete('/reports/:id', authenticateToken, (req, res) => {
  try {
    const report = db.prepare('SELECT user_id, status FROM expense_reports WHERE id = ?').get(req.params.id);

    if (report.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (report.status !== 'draft') {
      return res.status(400).json({ error: 'Cannot delete submitted report' });
    }

    // Delete related items
    db.prepare('DELETE FROM expense_items WHERE report_id = ?').run(req.params.id);
    db.prepare('DELETE FROM mileage_claims WHERE report_id = ?').run(req.params.id);
    db.prepare('DELETE FROM per_diem_claims WHERE report_id = ?').run(req.params.id);
    db.prepare('DELETE FROM expense_reports WHERE id = ?').run(req.params.id);

    res.json({ message: 'Report deleted' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// ==========================================
// EXPENSE ITEMS
// ==========================================

// Add expense item
router.post('/reports/:reportId/items', authenticateToken, (req, res) => {
  try {
    const { category_id, expense_date, merchant, description, amount, currency, exchange_rate, receipt_url, is_billable, project_code, client_name, notes } = req.body;

    // Verify report ownership and status
    const report = db.prepare('SELECT user_id, status FROM expense_reports WHERE id = ?').get(req.params.reportId);
    if (report.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (report.status !== 'draft') {
      return res.status(400).json({ error: 'Cannot add items to submitted report' });
    }

    const id = `ei-${uuidv4()}`;
    db.prepare(`
      INSERT INTO expense_items (id, report_id, category_id, expense_date, merchant, description, amount, currency, exchange_rate, receipt_url, is_billable, project_code, client_name, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.reportId, category_id, expense_date, merchant, description, amount, currency || 'INR', exchange_rate || 1, receipt_url, is_billable ? 1 : 0, project_code, client_name, notes);

    // Update report total
    const total = db.prepare('SELECT SUM(amount) as total FROM expense_items WHERE report_id = ?').get(req.params.reportId).total;
    db.prepare('UPDATE expense_reports SET total_amount = ? WHERE id = ?').run(total, req.params.reportId);

    const item = db.prepare('SELECT * FROM expense_items WHERE id = ?').get(id);
    res.status(201).json(item);
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Update expense item
router.put('/items/:id', authenticateToken, (req, res) => {
  try {
    const { category_id, expense_date, merchant, description, amount, currency, exchange_rate, receipt_url, is_billable, project_code, client_name, notes } = req.body;

    // Verify ownership
    const item = db.prepare(`
      SELECT ei.*, er.user_id, er.status FROM expense_items ei
      JOIN expense_reports er ON ei.report_id = er.id
      WHERE ei.id = ?
    `).get(req.params.id);

    if (item.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (item.status !== 'draft') {
      return res.status(400).json({ error: 'Cannot edit submitted report' });
    }

    db.prepare(`
      UPDATE expense_items SET category_id = ?, expense_date = ?, merchant = ?, description = ?,
      amount = ?, currency = ?, exchange_rate = ?, receipt_url = ?, is_billable = ?,
      project_code = ?, client_name = ?, notes = ? WHERE id = ?
    `).run(category_id, expense_date, merchant, description, amount, currency, exchange_rate, receipt_url, is_billable ? 1 : 0, project_code, client_name, notes, req.params.id);

    // Update report total
    const total = db.prepare('SELECT SUM(amount) as total FROM expense_items WHERE report_id = ?').get(item.report_id).total;
    db.prepare('UPDATE expense_reports SET total_amount = ? WHERE id = ?').run(total, item.report_id);

    const updatedItem = db.prepare('SELECT * FROM expense_items WHERE id = ?').get(req.params.id);
    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete expense item
router.delete('/items/:id', authenticateToken, (req, res) => {
  try {
    const item = db.prepare(`
      SELECT ei.*, er.user_id, er.status FROM expense_items ei
      JOIN expense_reports er ON ei.report_id = er.id
      WHERE ei.id = ?
    `).get(req.params.id);

    if (item.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (item.status !== 'draft') {
      return res.status(400).json({ error: 'Cannot delete from submitted report' });
    }

    db.prepare('DELETE FROM expense_items WHERE id = ?').run(req.params.id);

    // Update report total
    const total = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expense_items WHERE report_id = ?').get(item.report_id).total;
    db.prepare('UPDATE expense_reports SET total_amount = ? WHERE id = ?').run(total, item.report_id);

    res.json({ message: 'Item deleted' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ==========================================
// MILEAGE CLAIMS
// ==========================================

// Add mileage claim
router.post('/reports/:reportId/mileage', authenticateToken, (req, res) => {
  try {
    const { claim_date, from_location, to_location, distance_km, rate_per_km, purpose, vehicle_type } = req.body;

    // Verify report ownership
    const report = db.prepare('SELECT user_id, status FROM expense_reports WHERE id = ?').get(req.params.reportId);
    if (report.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (report.status !== 'draft') {
      return res.status(400).json({ error: 'Cannot add to submitted report' });
    }

    const amount = distance_km * (rate_per_km || 8); // Default INR 8 per km
    const id = `mc-${uuidv4()}`;

    db.prepare(`
      INSERT INTO mileage_claims (id, report_id, claim_date, from_location, to_location, distance_km, rate_per_km, amount, purpose, vehicle_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.reportId, claim_date, from_location, to_location, distance_km, rate_per_km || 8, amount, purpose, vehicle_type || 'car');

    const claim = db.prepare('SELECT * FROM mileage_claims WHERE id = ?').get(id);
    res.status(201).json(claim);
  } catch (error) {
    console.error('Error adding mileage:', error);
    res.status(500).json({ error: 'Failed to add mileage claim' });
  }
});

// Delete mileage claim
router.delete('/mileage/:id', authenticateToken, (req, res) => {
  try {
    const claim = db.prepare(`
      SELECT mc.*, er.user_id, er.status FROM mileage_claims mc
      JOIN expense_reports er ON mc.report_id = er.id
      WHERE mc.id = ?
    `).get(req.params.id);

    if (claim.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (claim.status !== 'draft') {
      return res.status(400).json({ error: 'Cannot delete from submitted report' });
    }

    db.prepare('DELETE FROM mileage_claims WHERE id = ?').run(req.params.id);
    res.json({ message: 'Mileage claim deleted' });
  } catch (error) {
    console.error('Error deleting mileage:', error);
    res.status(500).json({ error: 'Failed to delete mileage claim' });
  }
});

// ==========================================
// PER DIEM CLAIMS
// ==========================================

// Add per diem claim
router.post('/reports/:reportId/per-diem', authenticateToken, (req, res) => {
  try {
    const { claim_date, city, country, day_type, breakfast_included, lunch_included, dinner_included, rate } = req.body;

    // Verify report ownership
    const report = db.prepare('SELECT user_id, status FROM expense_reports WHERE id = ?').get(req.params.reportId);
    if (report.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (report.status !== 'draft') {
      return res.status(400).json({ error: 'Cannot add to submitted report' });
    }

    // Calculate amount based on day type and meals included
    let baseRate = rate || 1500; // Default INR 1500 per day
    if (day_type === 'half') baseRate *= 0.5;

    // Reduce for meals included
    let mealsDeduction = 0;
    if (breakfast_included) mealsDeduction += baseRate * 0.2;
    if (lunch_included) mealsDeduction += baseRate * 0.3;
    if (dinner_included) mealsDeduction += baseRate * 0.3;

    const amount = baseRate - mealsDeduction;
    const id = `pd-${uuidv4()}`;

    db.prepare(`
      INSERT INTO per_diem_claims (id, report_id, claim_date, city, country, day_type, breakfast_included, lunch_included, dinner_included, rate, amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.reportId, claim_date, city, country || 'India', day_type || 'full', breakfast_included ? 1 : 0, lunch_included ? 1 : 0, dinner_included ? 1 : 0, rate || 1500, amount);

    const claim = db.prepare('SELECT * FROM per_diem_claims WHERE id = ?').get(id);
    res.status(201).json(claim);
  } catch (error) {
    console.error('Error adding per diem:', error);
    res.status(500).json({ error: 'Failed to add per diem claim' });
  }
});

// Delete per diem claim
router.delete('/per-diem/:id', authenticateToken, (req, res) => {
  try {
    const claim = db.prepare(`
      SELECT pd.*, er.user_id, er.status FROM per_diem_claims pd
      JOIN expense_reports er ON pd.report_id = er.id
      WHERE pd.id = ?
    `).get(req.params.id);

    if (claim.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (claim.status !== 'draft') {
      return res.status(400).json({ error: 'Cannot delete from submitted report' });
    }

    db.prepare('DELETE FROM per_diem_claims WHERE id = ?').run(req.params.id);
    res.json({ message: 'Per diem claim deleted' });
  } catch (error) {
    console.error('Error deleting per diem:', error);
    res.status(500).json({ error: 'Failed to delete per diem claim' });
  }
});

// ==========================================
// EXPENSES DASHBOARD
// ==========================================

router.get('/dashboard', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const myStats = {
      draftReports: db.prepare('SELECT COUNT(*) as count FROM expense_reports WHERE user_id = ? AND status = ?').get(userId, 'draft').count,
      pendingReports: db.prepare('SELECT COUNT(*) as count FROM expense_reports WHERE user_id = ? AND status = ?').get(userId, 'submitted').count,
      approvedReports: db.prepare('SELECT COUNT(*) as count FROM expense_reports WHERE user_id = ? AND status = ?').get(userId, 'approved').count,
      totalReimbursed: db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total FROM expense_reports
        WHERE user_id = ? AND status = 'paid'
      `).get(userId).total,
      pendingAmount: db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total FROM expense_reports
        WHERE user_id = ? AND status IN ('submitted', 'approved')
      `).get(userId).total
    };

    let orgStats = null;
    if (isAdmin) {
      orgStats = {
        totalPendingReports: db.prepare('SELECT COUNT(*) as count FROM expense_reports WHERE status = ?').get('submitted').count,
        totalPendingAmount: db.prepare(`
          SELECT COALESCE(SUM(total_amount), 0) as total FROM expense_reports WHERE status = 'submitted'
        `).get().total,
        approvedAwaitingPayment: db.prepare('SELECT COUNT(*) as count FROM expense_reports WHERE status = ?').get('approved').count,
        thisMonthTotal: db.prepare(`
          SELECT COALESCE(SUM(total_amount), 0) as total FROM expense_reports
          WHERE status = 'paid' AND paid_at >= date('now', 'start of month')
        `).get().total,
        topCategories: db.prepare(`
          SELECT ec.name, SUM(ei.amount) as total
          FROM expense_items ei
          JOIN expense_categories ec ON ei.category_id = ec.id
          JOIN expense_reports er ON ei.report_id = er.id
          WHERE er.created_at >= date('now', '-90 days')
          GROUP BY ec.id
          ORDER BY total DESC
          LIMIT 5
        `).all()
      };
    }

    res.json({ myStats, orgStats });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
