const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// ==========================================
// EXIT REQUESTS
// ==========================================

// Get all exit requests (admin)
router.get('/exit-requests', authenticateToken, isAdmin, (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT er.*, u.name as user_name, u.email, u.department, u.designation, u.avatar,
             a.name as approved_by_name
      FROM exit_requests er
      JOIN users u ON er.user_id = u.id
      LEFT JOIN users a ON er.approved_by = a.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND er.status = ?';
      params.push(status);
    }

    query += ' ORDER BY er.created_at DESC';

    const requests = db.prepare(query).all(...params);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching exit requests:', error);
    res.status(500).json({ error: 'Failed to fetch exit requests' });
  }
});

// Get my exit request
router.get('/exit-requests/my-request', authenticateToken, (req, res) => {
  try {
    const request = db.prepare(`
      SELECT er.*, a.name as approved_by_name
      FROM exit_requests er
      LEFT JOIN users a ON er.approved_by = a.id
      WHERE er.user_id = ?
      ORDER BY er.created_at DESC
      LIMIT 1
    `).get(req.user.id);

    if (request) {
      // Get clearance status
      request.clearance = db.prepare(`
        SELECT ec.*, ci.name as item_name, ci.department, cb.name as cleared_by_name
        FROM employee_clearance ec
        JOIN clearance_items ci ON ec.clearance_item_id = ci.id
        LEFT JOIN users cb ON ec.cleared_by = cb.id
        WHERE ec.exit_request_id = ?
        ORDER BY ci.order_index
      `).all(request.id);

      // Get knowledge transfer items
      request.knowledgeTransfer = db.prepare(`
        SELECT kt.*, u.name as transfer_to_name
        FROM knowledge_transfer kt
        JOIN users u ON kt.transfer_to_user_id = u.id
        WHERE kt.exit_request_id = ?
      `).all(request.id);
    }

    res.json(request);
  } catch (error) {
    console.error('Error fetching exit request:', error);
    res.status(500).json({ error: 'Failed to fetch exit request' });
  }
});

// Get single exit request
router.get('/exit-requests/:id', authenticateToken, (req, res) => {
  try {
    const request = db.prepare(`
      SELECT er.*, u.name as user_name, u.email, u.department, u.designation, u.avatar,
             a.name as approved_by_name
      FROM exit_requests er
      JOIN users u ON er.user_id = u.id
      LEFT JOIN users a ON er.approved_by = a.id
      WHERE er.id = ?
    `).get(req.params.id);

    if (!request) {
      return res.status(404).json({ error: 'Exit request not found' });
    }

    // Check access
    if (request.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get clearance status
    request.clearance = db.prepare(`
      SELECT ec.*, ci.name as item_name, ci.department, ci.description,
             cb.name as cleared_by_name
      FROM employee_clearance ec
      JOIN clearance_items ci ON ec.clearance_item_id = ci.id
      LEFT JOIN users cb ON ec.cleared_by = cb.id
      WHERE ec.exit_request_id = ?
      ORDER BY ci.order_index
    `).all(req.params.id);

    // Get exit interview if exists
    request.exitInterview = db.prepare(`
      SELECT ei.*, i.name as interviewer_name
      FROM exit_interviews ei
      JOIN users i ON ei.interviewer_id = i.id
      WHERE ei.exit_request_id = ?
    `).get(req.params.id);

    // Get knowledge transfer items
    request.knowledgeTransfer = db.prepare(`
      SELECT kt.*, u.name as transfer_to_name
      FROM knowledge_transfer kt
      JOIN users u ON kt.transfer_to_user_id = u.id
      WHERE kt.exit_request_id = ?
    `).all(req.params.id);

    // Get final settlement if exists
    request.settlement = db.prepare(`
      SELECT fs.*, a.name as approved_by_name
      FROM final_settlements fs
      LEFT JOIN users a ON fs.approved_by = a.id
      WHERE fs.exit_request_id = ?
    `).get(req.params.id);

    res.json(request);
  } catch (error) {
    console.error('Error fetching exit request:', error);
    res.status(500).json({ error: 'Failed to fetch exit request' });
  }
});

// Submit resignation
router.post('/exit-requests', authenticateToken, (req, res) => {
  try {
    const { resignation_date, last_working_day, exit_type, reason_category, reason_details, is_notice_served, notice_buyout_days } = req.body;

    // Calculate notice period
    const startDate = new Date(resignation_date);
    const endDate = new Date(last_working_day);
    const notice_period_days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    const id = `exit-${uuidv4()}`;
    db.prepare(`
      INSERT INTO exit_requests (id, user_id, resignation_date, last_working_day, notice_period_days, exit_type, reason_category, reason_details, is_notice_served, notice_buyout_days)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, resignation_date, last_working_day, notice_period_days, exit_type || 'resignation', reason_category, reason_details, is_notice_served !== false ? 1 : 0, notice_buyout_days || 0);

    // Create clearance items
    const clearanceItems = db.prepare('SELECT id FROM clearance_items WHERE is_active = 1 ORDER BY order_index').all();
    const insertClearance = db.prepare(`
      INSERT INTO employee_clearance (id, exit_request_id, clearance_item_id)
      VALUES (?, ?, ?)
    `);

    for (const item of clearanceItems) {
      insertClearance.run(`ec-${uuidv4()}`, id, item.id);
    }

    const request = db.prepare('SELECT * FROM exit_requests WHERE id = ?').get(id);
    res.status(201).json(request);
  } catch (error) {
    console.error('Error creating exit request:', error);
    res.status(500).json({ error: 'Failed to create exit request' });
  }
});

// Update exit request status
router.put('/exit-requests/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { status, last_working_day, notice_buyout_days, notice_buyout_amount } = req.body;

    let query = 'UPDATE exit_requests SET status = ?';
    const params = [status];

    if (status === 'approved') {
      query += ', approved_by = ?, approved_at = CURRENT_TIMESTAMP';
      params.push(req.user.id);
    }

    if (last_working_day) {
      query += ', last_working_day = ?';
      params.push(last_working_day);
    }

    if (notice_buyout_days !== undefined) {
      query += ', notice_buyout_days = ?, notice_buyout_amount = ?';
      params.push(notice_buyout_days, notice_buyout_amount || 0);
    }

    query += ' WHERE id = ?';
    params.push(req.params.id);

    db.prepare(query).run(...params);

    const request = db.prepare('SELECT * FROM exit_requests WHERE id = ?').get(req.params.id);
    res.json(request);
  } catch (error) {
    console.error('Error updating exit request:', error);
    res.status(500).json({ error: 'Failed to update exit request' });
  }
});

// Withdraw exit request
router.post('/exit-requests/:id/withdraw', authenticateToken, (req, res) => {
  try {
    const request = db.prepare('SELECT user_id, status FROM exit_requests WHERE id = ?').get(req.params.id);

    if (request.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot withdraw processed request' });
    }

    db.prepare('UPDATE exit_requests SET status = ? WHERE id = ?').run('withdrawn', req.params.id);
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
router.get('/clearance-items', authenticateToken, isAdmin, (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM clearance_items WHERE is_active = 1 ORDER BY order_index').all();
    res.json(items);
  } catch (error) {
    console.error('Error fetching clearance items:', error);
    res.status(500).json({ error: 'Failed to fetch clearance items' });
  }
});

// Create clearance item
router.post('/clearance-items', authenticateToken, isAdmin, (req, res) => {
  try {
    const { name, department, description, is_mandatory, order_index } = req.body;

    const id = `ci-${uuidv4()}`;
    db.prepare(`
      INSERT INTO clearance_items (id, name, department, description, is_mandatory, order_index)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, department, description, is_mandatory !== false ? 1 : 0, order_index || 0);

    const item = db.prepare('SELECT * FROM clearance_items WHERE id = ?').get(id);
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating clearance item:', error);
    res.status(500).json({ error: 'Failed to create clearance item' });
  }
});

// Update employee clearance status
router.put('/clearance/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { status, remarks } = req.body;

    db.prepare(`
      UPDATE employee_clearance SET status = ?, cleared_by = ?, cleared_at = CURRENT_TIMESTAMP, remarks = ?
      WHERE id = ?
    `).run(status, req.user.id, remarks, req.params.id);

    res.json({ message: 'Clearance updated' });
  } catch (error) {
    console.error('Error updating clearance:', error);
    res.status(500).json({ error: 'Failed to update clearance' });
  }
});

// Get pending clearances for department
router.get('/clearance/pending', authenticateToken, isAdmin, (req, res) => {
  try {
    const { department } = req.query;

    let query = `
      SELECT ec.*, ci.name as item_name, ci.department, ci.description,
             er.last_working_day, u.name as user_name, u.email, u.department as user_department
      FROM employee_clearance ec
      JOIN clearance_items ci ON ec.clearance_item_id = ci.id
      JOIN exit_requests er ON ec.exit_request_id = er.id
      JOIN users u ON er.user_id = u.id
      WHERE ec.status = 'pending' AND er.status = 'approved'
    `;
    const params = [];

    if (department) {
      query += ' AND ci.department = ?';
      params.push(department);
    }

    query += ' ORDER BY er.last_working_day, ci.order_index';

    const clearances = db.prepare(query).all(...params);
    res.json(clearances);
  } catch (error) {
    console.error('Error fetching clearances:', error);
    res.status(500).json({ error: 'Failed to fetch clearances' });
  }
});

// ==========================================
// EXIT INTERVIEWS
// ==========================================

// Create exit interview
router.post('/exit-interviews', authenticateToken, isAdmin, (req, res) => {
  try {
    const { exit_request_id, interview_date, overall_experience_rating, management_rating, work_environment_rating, growth_opportunities_rating, compensation_rating, reason_for_leaving, liked_most, improvements_suggested, would_recommend, would_rejoin, additional_comments } = req.body;

    const id = `ei-${uuidv4()}`;
    db.prepare(`
      INSERT INTO exit_interviews (id, exit_request_id, interviewer_id, interview_date, overall_experience_rating, management_rating, work_environment_rating, growth_opportunities_rating, compensation_rating, reason_for_leaving, liked_most, improvements_suggested, would_recommend, would_rejoin, additional_comments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, exit_request_id, req.user.id, interview_date, overall_experience_rating, management_rating, work_environment_rating, growth_opportunities_rating, compensation_rating, reason_for_leaving, liked_most, improvements_suggested, would_recommend ? 1 : 0, would_rejoin ? 1 : 0, additional_comments);

    // Mark clearance item as completed
    const clearanceItem = db.prepare(`
      SELECT ec.id FROM employee_clearance ec
      JOIN clearance_items ci ON ec.clearance_item_id = ci.id
      WHERE ec.exit_request_id = ? AND ci.name LIKE '%Exit Interview%'
    `).get(exit_request_id);

    if (clearanceItem) {
      db.prepare(`
        UPDATE employee_clearance SET status = 'cleared', cleared_by = ?, cleared_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(req.user.id, clearanceItem.id);
    }

    const interview = db.prepare('SELECT * FROM exit_interviews WHERE id = ?').get(id);
    res.status(201).json(interview);
  } catch (error) {
    console.error('Error creating exit interview:', error);
    res.status(500).json({ error: 'Failed to create exit interview' });
  }
});

// Get exit interview analytics
router.get('/exit-interviews/analytics', authenticateToken, isAdmin, (req, res) => {
  try {
    const analytics = {
      totalExits: db.prepare('SELECT COUNT(*) as count FROM exit_interviews').get().count,
      avgOverallRating: db.prepare('SELECT AVG(overall_experience_rating) as avg FROM exit_interviews').get().avg || 0,
      avgManagementRating: db.prepare('SELECT AVG(management_rating) as avg FROM exit_interviews').get().avg || 0,
      avgCompensationRating: db.prepare('SELECT AVG(compensation_rating) as avg FROM exit_interviews').get().avg || 0,
      wouldRecommend: db.prepare('SELECT COUNT(*) as count FROM exit_interviews WHERE would_recommend = 1').get().count,
      wouldRejoin: db.prepare('SELECT COUNT(*) as count FROM exit_interviews WHERE would_rejoin = 1').get().count,
      topReasons: db.prepare(`
        SELECT reason_for_leaving, COUNT(*) as count
        FROM exit_interviews
        WHERE reason_for_leaving IS NOT NULL
        GROUP BY reason_for_leaving
        ORDER BY count DESC
        LIMIT 5
      `).all()
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ==========================================
// KNOWLEDGE TRANSFER
// ==========================================

// Get knowledge transfer items
router.get('/knowledge-transfer/:exitRequestId', authenticateToken, (req, res) => {
  try {
    const items = db.prepare(`
      SELECT kt.*, u.name as transfer_to_name
      FROM knowledge_transfer kt
      JOIN users u ON kt.transfer_to_user_id = u.id
      WHERE kt.exit_request_id = ?
      ORDER BY kt.created_at
    `).all(req.params.exitRequestId);
    res.json(items);
  } catch (error) {
    console.error('Error fetching knowledge transfer:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge transfer' });
  }
});

// Add knowledge transfer item
router.post('/knowledge-transfer', authenticateToken, (req, res) => {
  try {
    const { exit_request_id, topic, description, transfer_to_user_id, documents } = req.body;

    // Verify access
    const exitRequest = db.prepare('SELECT user_id FROM exit_requests WHERE id = ?').get(exit_request_id);
    if (exitRequest.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const id = `kt-${uuidv4()}`;
    db.prepare(`
      INSERT INTO knowledge_transfer (id, exit_request_id, topic, description, transfer_to_user_id, documents)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, exit_request_id, topic, description, transfer_to_user_id, documents);

    const item = db.prepare(`
      SELECT kt.*, u.name as transfer_to_name
      FROM knowledge_transfer kt
      JOIN users u ON kt.transfer_to_user_id = u.id
      WHERE kt.id = ?
    `).get(id);
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating knowledge transfer:', error);
    res.status(500).json({ error: 'Failed to create knowledge transfer' });
  }
});

// Update knowledge transfer status
router.put('/knowledge-transfer/:id', authenticateToken, (req, res) => {
  try {
    const { status, notes } = req.body;

    db.prepare(`
      UPDATE knowledge_transfer SET status = ?, completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END, notes = ?
      WHERE id = ?
    `).run(status, status, notes, req.params.id);

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
router.get('/settlements/:exitRequestId', authenticateToken, (req, res) => {
  try {
    let settlement = db.prepare(`
      SELECT fs.*, a.name as approved_by_name
      FROM final_settlements fs
      LEFT JOIN users a ON fs.approved_by = a.id
      WHERE fs.exit_request_id = ?
    `).get(req.params.exitRequestId);

    res.json(settlement);
  } catch (error) {
    console.error('Error fetching settlement:', error);
    res.status(500).json({ error: 'Failed to fetch settlement' });
  }
});

// Calculate final settlement
router.post('/settlements/calculate', authenticateToken, isAdmin, (req, res) => {
  try {
    const { exit_request_id } = req.body;

    // Get exit request details
    const exitRequest = db.prepare(`
      SELECT er.*, u.id as user_id FROM exit_requests er
      JOIN users u ON er.user_id = u.id
      WHERE er.id = ?
    `).get(exit_request_id);

    if (!exitRequest) {
      return res.status(404).json({ error: 'Exit request not found' });
    }

    // Get salary details
    const salary = db.prepare('SELECT * FROM employee_salaries WHERE user_id = ?').get(exitRequest.user_id);

    // Get leave balance (simplified - just count approved leaves)
    const leavesTaken = db.prepare(`
      SELECT COUNT(*) as count FROM leave_requests
      WHERE user_id = ? AND status = 'approved'
    `).get(exitRequest.user_id);

    // Calculate components
    const lastSalary = salary?.gross_salary || 0;
    const leaveEncashmentDays = Math.max(0, 21 - (leavesTaken?.count || 0)); // Assume 21 days annual leave
    const dailyRate = lastSalary / 30;
    const leaveEncashmentAmount = leaveEncashmentDays * dailyRate;
    const noticeRecovery = (exitRequest.notice_buyout_days || 0) * dailyRate;
    const grossSettlement = lastSalary + leaveEncashmentAmount;
    const tdsDeduction = grossSettlement * 0.1; // Simplified 10% TDS
    const netSettlement = grossSettlement - noticeRecovery - tdsDeduction;

    // Check if settlement exists
    const existing = db.prepare('SELECT id FROM final_settlements WHERE exit_request_id = ?').get(exit_request_id);

    if (existing) {
      db.prepare(`
        UPDATE final_settlements SET last_salary = ?, leave_encashment_days = ?,
        leave_encashment_amount = ?, notice_recovery = ?, gross_settlement = ?,
        tds_deduction = ?, net_settlement = ?, calculated_at = CURRENT_TIMESTAMP, status = 'draft'
        WHERE exit_request_id = ?
      `).run(lastSalary, leaveEncashmentDays, leaveEncashmentAmount, noticeRecovery, grossSettlement, tdsDeduction, netSettlement, exit_request_id);
    } else {
      const id = `fs-${uuidv4()}`;
      db.prepare(`
        INSERT INTO final_settlements (id, exit_request_id, user_id, last_salary, leave_encashment_days, leave_encashment_amount, notice_recovery, gross_settlement, tds_deduction, net_settlement, calculated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(id, exit_request_id, exitRequest.user_id, lastSalary, leaveEncashmentDays, leaveEncashmentAmount, noticeRecovery, grossSettlement, tdsDeduction, netSettlement);
    }

    const settlement = db.prepare('SELECT * FROM final_settlements WHERE exit_request_id = ?').get(exit_request_id);
    res.json(settlement);
  } catch (error) {
    console.error('Error calculating settlement:', error);
    res.status(500).json({ error: 'Failed to calculate settlement' });
  }
});

// Update final settlement
router.put('/settlements/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { bonus_amount, gratuity_amount, other_recoveries, recovery_details, tds_deduction } = req.body;

    // Get current settlement
    const current = db.prepare('SELECT * FROM final_settlements WHERE id = ?').get(req.params.id);

    const grossSettlement = current.last_salary + current.leave_encashment_amount + (bonus_amount || 0) + (gratuity_amount || 0);
    const totalRecoveries = current.notice_recovery + (other_recoveries || 0);
    const finalTds = tds_deduction !== undefined ? tds_deduction : current.tds_deduction;
    const netSettlement = grossSettlement - totalRecoveries - finalTds;

    db.prepare(`
      UPDATE final_settlements SET bonus_amount = ?, gratuity_amount = ?,
      other_recoveries = ?, recovery_details = ?, tds_deduction = ?,
      gross_settlement = ?, net_settlement = ?
      WHERE id = ?
    `).run(bonus_amount || 0, gratuity_amount || 0, other_recoveries || 0, recovery_details, finalTds, grossSettlement, netSettlement, req.params.id);

    const settlement = db.prepare('SELECT * FROM final_settlements WHERE id = ?').get(req.params.id);
    res.json(settlement);
  } catch (error) {
    console.error('Error updating settlement:', error);
    res.status(500).json({ error: 'Failed to update settlement' });
  }
});

// Approve settlement
router.post('/settlements/:id/approve', authenticateToken, isAdmin, (req, res) => {
  try {
    db.prepare(`
      UPDATE final_settlements SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user.id, req.params.id);
    res.json({ message: 'Settlement approved' });
  } catch (error) {
    console.error('Error approving settlement:', error);
    res.status(500).json({ error: 'Failed to approve settlement' });
  }
});

// Mark settlement as paid
router.post('/settlements/:id/pay', authenticateToken, isAdmin, (req, res) => {
  try {
    const { payment_reference } = req.body;

    db.prepare(`
      UPDATE final_settlements SET status = 'paid', paid_at = CURRENT_TIMESTAMP, payment_reference = ?
      WHERE id = ?
    `).run(payment_reference, req.params.id);

    res.json({ message: 'Settlement marked as paid' });
  } catch (error) {
    console.error('Error marking paid:', error);
    res.status(500).json({ error: 'Failed to mark as paid' });
  }
});

// ==========================================
// OFFBOARDING DASHBOARD
// ==========================================

router.get('/dashboard', authenticateToken, isAdmin, (req, res) => {
  try {
    const stats = {
      pendingExitRequests: db.prepare('SELECT COUNT(*) as count FROM exit_requests WHERE status = ?').get('pending').count,
      approvedExits: db.prepare('SELECT COUNT(*) as count FROM exit_requests WHERE status = ?').get('approved').count,
      exitingThisMonth: db.prepare(`
        SELECT COUNT(*) as count FROM exit_requests
        WHERE status = 'approved' AND last_working_day BETWEEN date('now', 'start of month') AND date('now', 'start of month', '+1 month', '-1 day')
      `).get().count,
      pendingClearances: db.prepare(`
        SELECT COUNT(*) as count FROM employee_clearance ec
        JOIN exit_requests er ON ec.exit_request_id = er.id
        WHERE ec.status = 'pending' AND er.status = 'approved'
      `).get().count,
      pendingSettlements: db.prepare('SELECT COUNT(*) as count FROM final_settlements WHERE status IN (?, ?)').get('draft', 'approved').count,
      recentExits: db.prepare(`
        SELECT er.id, er.last_working_day, er.exit_type, u.name as user_name, u.department,
               (SELECT COUNT(*) FROM employee_clearance WHERE exit_request_id = er.id AND status = 'cleared') as cleared_items,
               (SELECT COUNT(*) FROM employee_clearance WHERE exit_request_id = er.id) as total_items
        FROM exit_requests er
        JOIN users u ON er.user_id = u.id
        WHERE er.status = 'approved'
        ORDER BY er.last_working_day DESC
        LIMIT 5
      `).all(),
      exitsByReason: db.prepare(`
        SELECT reason_category, COUNT(*) as count
        FROM exit_requests
        WHERE reason_category IS NOT NULL AND created_at >= date('now', '-12 months')
        GROUP BY reason_category
        ORDER BY count DESC
      `).all()
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
