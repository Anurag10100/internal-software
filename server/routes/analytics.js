const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// ==========================================
// HR ANALYTICS DASHBOARD
// ==========================================

// Get comprehensive HR analytics
router.get('/hr-overview', authenticateToken, isAdmin, (req, res) => {
  try {
    const stats = {
      // Headcount
      totalEmployees: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      newHiresThisMonth: db.prepare(`
        SELECT COUNT(*) as count FROM users WHERE created_at >= date('now', 'start of month')
      `).get().count,
      newHiresThisYear: db.prepare(`
        SELECT COUNT(*) as count FROM users WHERE created_at >= date('now', 'start of year')
      `).get().count,

      // Attrition
      exitsThisYear: db.prepare(`
        SELECT COUNT(*) as count FROM exit_requests
        WHERE status IN ('approved', 'completed') AND created_at >= date('now', 'start of year')
      `).get().count,

      // Department breakdown
      byDepartment: db.prepare(`
        SELECT department, COUNT(*) as count FROM users
        GROUP BY department ORDER BY count DESC
      `).all(),

      // Role breakdown
      byRole: db.prepare(`
        SELECT role, COUNT(*) as count FROM users
        GROUP BY role ORDER BY count DESC
      `).all(),

      // Probation status
      inProbation: db.prepare('SELECT COUNT(*) as count FROM team_members WHERE in_probation = 1').get().count,

      // Leave statistics
      pendingLeaves: db.prepare('SELECT COUNT(*) as count FROM leave_requests WHERE status = ?').get('pending').count,
      approvedLeavesToday: db.prepare(`
        SELECT COUNT(*) as count FROM leave_requests
        WHERE status = 'approved' AND date('now') BETWEEN start_date AND end_date
      `).get().count,

      // Task statistics
      openTasks: db.prepare('SELECT COUNT(*) as count FROM tasks WHERE status != ?').get('completed').count,
      overdueTasks: db.prepare(`
        SELECT COUNT(*) as count FROM tasks
        WHERE status != 'completed' AND due_date < date('now')
      `).get().count,

      // Performance
      activeKPIs: db.prepare('SELECT COUNT(*) as count FROM kpis WHERE status != ?').get('achieved').count,
      activePIPs: db.prepare('SELECT COUNT(*) as count FROM pips WHERE status = ?').get('active').count,
      activeAppraisals: db.prepare('SELECT COUNT(*) as count FROM appraisal_cycles WHERE status = ?').get('active').count
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching HR overview:', error);
    res.status(500).json({ error: 'Failed to fetch HR overview' });
  }
});

// Get headcount trends
router.get('/headcount-trends', authenticateToken, isAdmin, (req, res) => {
  try {
    const { period = '12' } = req.query; // months

    const trends = db.prepare(`
      SELECT
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as hires
      FROM users
      WHERE created_at >= date('now', '-${parseInt(period)} months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month
    `).all();

    const exits = db.prepare(`
      SELECT
        strftime('%Y-%m', last_working_day) as month,
        COUNT(*) as exits
      FROM exit_requests
      WHERE status IN ('approved', 'completed')
        AND last_working_day >= date('now', '-${parseInt(period)} months')
      GROUP BY strftime('%Y-%m', last_working_day)
      ORDER BY month
    `).all();

    res.json({ hires: trends, exits });
  } catch (error) {
    console.error('Error fetching headcount trends:', error);
    res.status(500).json({ error: 'Failed to fetch headcount trends' });
  }
});

// Get attendance analytics
router.get('/attendance-analytics', authenticateToken, isAdmin, (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const stats = {
      totalCheckIns: db.prepare(`
        SELECT COUNT(*) as count FROM check_ins
        WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?
      `).get(String(currentMonth).padStart(2, '0'), String(currentYear)).count,

      onTimePercentage: db.prepare(`
        SELECT
          ROUND(COUNT(CASE WHEN status = 'on_time' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as percentage
        FROM check_ins
        WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?
      `).get(String(currentMonth).padStart(2, '0'), String(currentYear)).percentage || 0,

      lateArrivals: db.prepare(`
        SELECT COUNT(*) as count FROM check_ins
        WHERE status = 'late' AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
      `).get(String(currentMonth).padStart(2, '0'), String(currentYear)).count,

      byStatus: db.prepare(`
        SELECT status, COUNT(*) as count
        FROM check_ins
        WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?
        GROUP BY status
      `).all(String(currentMonth).padStart(2, '0'), String(currentYear)),

      byLocation: db.prepare(`
        SELECT location, COUNT(*) as count
        FROM check_ins
        WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?
        GROUP BY location
        ORDER BY count DESC
      `).all(String(currentMonth).padStart(2, '0'), String(currentYear))
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching attendance analytics:', error);
    res.status(500).json({ error: 'Failed to fetch attendance analytics' });
  }
});

// Get leave analytics
router.get('/leave-analytics', authenticateToken, isAdmin, (req, res) => {
  try {
    const stats = {
      totalRequests: db.prepare('SELECT COUNT(*) as count FROM leave_requests').get().count,
      pendingRequests: db.prepare('SELECT COUNT(*) as count FROM leave_requests WHERE status = ?').get('pending').count,
      approvedRequests: db.prepare('SELECT COUNT(*) as count FROM leave_requests WHERE status = ?').get('approved').count,
      rejectedRequests: db.prepare('SELECT COUNT(*) as count FROM leave_requests WHERE status = ?').get('rejected').count,

      byType: db.prepare(`
        SELECT leave_type, COUNT(*) as count
        FROM leave_requests
        WHERE created_at >= date('now', '-12 months')
        GROUP BY leave_type
        ORDER BY count DESC
      `).all(),

      byMonth: db.prepare(`
        SELECT strftime('%Y-%m', start_date) as month, COUNT(*) as count
        FROM leave_requests
        WHERE status = 'approved' AND start_date >= date('now', '-12 months')
        GROUP BY strftime('%Y-%m', start_date)
        ORDER BY month
      `).all(),

      topRequesters: db.prepare(`
        SELECT u.name, u.department, COUNT(lr.id) as leave_count
        FROM leave_requests lr
        JOIN users u ON lr.user_id = u.id
        WHERE lr.status = 'approved' AND lr.created_at >= date('now', '-12 months')
        GROUP BY lr.user_id
        ORDER BY leave_count DESC
        LIMIT 10
      `).all()
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching leave analytics:', error);
    res.status(500).json({ error: 'Failed to fetch leave analytics' });
  }
});

// Get performance analytics
router.get('/performance-analytics', authenticateToken, isAdmin, (req, res) => {
  try {
    const stats = {
      kpiStats: {
        total: db.prepare('SELECT COUNT(*) as count FROM kpis').get().count,
        achieved: db.prepare('SELECT COUNT(*) as count FROM kpis WHERE status = ?').get('achieved').count,
        onTrack: db.prepare('SELECT COUNT(*) as count FROM kpis WHERE status = ?').get('on_track').count,
        atRisk: db.prepare('SELECT COUNT(*) as count FROM kpis WHERE status = ?').get('at_risk').count,
        behind: db.prepare('SELECT COUNT(*) as count FROM kpis WHERE status = ?').get('behind').count
      },

      pipStats: {
        active: db.prepare('SELECT COUNT(*) as count FROM pips WHERE status = ?').get('active').count,
        completed: db.prepare('SELECT COUNT(*) as count FROM pips WHERE status = ?').get('completed').count,
        failed: db.prepare('SELECT COUNT(*) as count FROM pips WHERE status = ?').get('failed').count
      },

      goalProgress: db.prepare(`
        SELECT category, AVG(progress) as avg_progress, COUNT(*) as count
        FROM goals WHERE status = 'active'
        GROUP BY category
      `).all(),

      recognitionStats: {
        total: db.prepare('SELECT COUNT(*) as count FROM recognitions').get().count,
        thisMonth: db.prepare(`
          SELECT COUNT(*) as count FROM recognitions
          WHERE created_at >= date('now', 'start of month')
        `).get().count,
        byBadge: db.prepare(`
          SELECT badge, COUNT(*) as count
          FROM recognitions
          GROUP BY badge
          ORDER BY count DESC
        `).all()
      },

      appraisalStats: {
        activeCycles: db.prepare('SELECT COUNT(*) as count FROM appraisal_cycles WHERE status = ?').get('active').count,
        pendingReviews: db.prepare('SELECT COUNT(*) as count FROM appraisals WHERE status IN (?, ?)').get('pending', 'self_review').count,
        avgRating: db.prepare('SELECT AVG(final_rating) as avg FROM appraisals WHERE final_rating IS NOT NULL').get().avg || 0
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching performance analytics:', error);
    res.status(500).json({ error: 'Failed to fetch performance analytics' });
  }
});

// Get recruitment analytics
router.get('/recruitment-analytics', authenticateToken, isAdmin, (req, res) => {
  try {
    const stats = {
      openPositions: db.prepare('SELECT COUNT(*) as count FROM job_postings WHERE status = ?').get('published').count,
      totalCandidates: db.prepare('SELECT COUNT(*) as count FROM candidates').get().count,
      candidatesThisMonth: db.prepare(`
        SELECT COUNT(*) as count FROM candidates WHERE created_at >= date('now', 'start of month')
      `).get().count,

      pipelineStats: db.prepare(`
        SELECT stage, COUNT(*) as count
        FROM candidates
        WHERE status NOT IN ('hired', 'rejected')
        GROUP BY stage
        ORDER BY
          CASE stage
            WHEN 'applied' THEN 1
            WHEN 'screening' THEN 2
            WHEN 'interview' THEN 3
            WHEN 'technical' THEN 4
            WHEN 'hr' THEN 5
            WHEN 'offer' THEN 6
          END
      `).all(),

      hiredThisYear: db.prepare(`
        SELECT COUNT(*) as count FROM candidates
        WHERE status = 'hired' AND created_at >= date('now', 'start of year')
      `).get().count,

      sourceBreakdown: db.prepare(`
        SELECT source, COUNT(*) as count
        FROM candidates
        WHERE created_at >= date('now', '-6 months')
        GROUP BY source
        ORDER BY count DESC
      `).all(),

      timeToHire: db.prepare(`
        SELECT AVG(julianday(o.accepted_at) - julianday(c.created_at)) as avg_days
        FROM offer_letters o
        JOIN candidates c ON o.candidate_id = c.id
        WHERE o.status = 'accepted' AND o.accepted_at >= date('now', '-6 months')
      `).get().avg_days || 0,

      offerAcceptanceRate: db.prepare(`
        SELECT
          ROUND(COUNT(CASE WHEN status = 'accepted' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as rate
        FROM offer_letters
        WHERE created_at >= date('now', '-12 months')
      `).get().rate || 0
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching recruitment analytics:', error);
    res.status(500).json({ error: 'Failed to fetch recruitment analytics' });
  }
});

// Get payroll analytics
router.get('/payroll-analytics', authenticateToken, isAdmin, (req, res) => {
  try {
    const stats = {
      totalPayroll: db.prepare('SELECT SUM(gross_salary) as total FROM employee_salaries').get().total || 0,
      avgSalary: db.prepare('SELECT AVG(gross_salary) as avg FROM employee_salaries').get().avg || 0,
      employeesWithSalary: db.prepare('SELECT COUNT(*) as count FROM employee_salaries').get().count,

      salaryByDepartment: db.prepare(`
        SELECT u.department,
               COUNT(es.id) as employees,
               SUM(es.gross_salary) as total_payroll,
               AVG(es.gross_salary) as avg_salary
        FROM employee_salaries es
        JOIN users u ON es.user_id = u.id
        GROUP BY u.department
        ORDER BY total_payroll DESC
      `).all(),

      pendingPayslips: db.prepare('SELECT COUNT(*) as count FROM payslips WHERE status = ?').get('draft').count,

      reimbursementsStats: {
        pending: db.prepare('SELECT COUNT(*) as count FROM reimbursements WHERE status = ?').get('pending').count,
        pendingAmount: db.prepare('SELECT SUM(amount) as total FROM reimbursements WHERE status = ?').get('pending').total || 0,
        paidThisMonth: db.prepare(`
          SELECT SUM(amount) as total FROM reimbursements
          WHERE status = 'paid' AND approved_at >= date('now', 'start of month')
        `).get().total || 0
      },

      activeLoans: db.prepare('SELECT COUNT(*) as count FROM employee_loans WHERE status = ?').get('active').count,
      totalLoanOutstanding: db.prepare('SELECT SUM(remaining_amount) as total FROM employee_loans WHERE status = ?').get('active').total || 0
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching payroll analytics:', error);
    res.status(500).json({ error: 'Failed to fetch payroll analytics' });
  }
});

// Get asset analytics
router.get('/asset-analytics', authenticateToken, isAdmin, (req, res) => {
  try {
    const stats = {
      totalAssets: db.prepare('SELECT COUNT(*) as count FROM assets').get().count,
      totalValue: db.prepare('SELECT SUM(current_value) as total FROM assets').get().total || 0,

      byStatus: db.prepare(`
        SELECT status, COUNT(*) as count
        FROM assets
        GROUP BY status
      `).all(),

      byCategory: db.prepare(`
        SELECT ac.name, COUNT(a.id) as count, SUM(a.current_value) as value
        FROM asset_categories ac
        LEFT JOIN assets a ON ac.id = a.category_id
        WHERE ac.is_active = 1
        GROUP BY ac.id
        ORDER BY count DESC
      `).all(),

      pendingRequests: db.prepare('SELECT COUNT(*) as count FROM asset_requests WHERE status = ?').get('pending').count,

      upcomingMaintenance: db.prepare(`
        SELECT COUNT(*) as count FROM asset_maintenance
        WHERE status = 'scheduled' AND scheduled_date BETWEEN date('now') AND date('now', '+30 days')
      `).get().count,

      licenseStats: {
        total: db.prepare('SELECT COUNT(*) as count FROM software_licenses WHERE status = ?').get('active').count,
        expiringSoon: db.prepare(`
          SELECT COUNT(*) as count FROM software_licenses
          WHERE expiry_date BETWEEN date('now') AND date('now', '+90 days')
        `).get().count,
        utilizationRate: db.prepare(`
          SELECT ROUND(SUM(used_seats) * 100.0 / NULLIF(SUM(total_seats), 0), 1) as rate
          FROM software_licenses WHERE status = 'active'
        `).get().rate || 0
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching asset analytics:', error);
    res.status(500).json({ error: 'Failed to fetch asset analytics' });
  }
});

// Get learning analytics
router.get('/learning-analytics', authenticateToken, isAdmin, (req, res) => {
  try {
    const stats = {
      totalCourses: db.prepare('SELECT COUNT(*) as count FROM courses WHERE is_active = 1').get().count,
      totalEnrollments: db.prepare('SELECT COUNT(*) as count FROM course_enrollments').get().count,
      completedEnrollments: db.prepare('SELECT COUNT(*) as count FROM course_enrollments WHERE status = ?').get('completed').count,

      completionRate: db.prepare(`
        SELECT ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as rate
        FROM course_enrollments
      `).get().rate || 0,

      topCourses: db.prepare(`
        SELECT c.id, c.title, c.category,
               COUNT(ce.id) as enrollments,
               COUNT(CASE WHEN ce.status = 'completed' THEN 1 END) as completions
        FROM courses c
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id
        WHERE c.is_active = 1
        GROUP BY c.id
        ORDER BY enrollments DESC
        LIMIT 10
      `).all(),

      byCategory: db.prepare(`
        SELECT c.category, COUNT(ce.id) as enrollments
        FROM courses c
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id
        WHERE c.is_active = 1
        GROUP BY c.category
        ORDER BY enrollments DESC
      `).all(),

      skillsStats: {
        totalSkills: db.prepare('SELECT COUNT(*) as count FROM skills WHERE is_active = 1').get().count,
        employeeSkills: db.prepare('SELECT COUNT(*) as count FROM employee_skills').get().count,
        avgSkillsPerEmployee: db.prepare(`
          SELECT ROUND(COUNT(*) * 1.0 / NULLIF(COUNT(DISTINCT user_id), 0), 1) as avg
          FROM employee_skills
        `).get().avg || 0
      },

      certifications: {
        total: db.prepare('SELECT COUNT(*) as count FROM employee_certifications WHERE status = ?').get('active').count,
        expiringSoon: db.prepare(`
          SELECT COUNT(*) as count FROM employee_certifications
          WHERE expiry_date BETWEEN date('now') AND date('now', '+90 days')
        `).get().count
      },

      trainingSessions: {
        upcoming: db.prepare(`
          SELECT COUNT(*) as count FROM training_sessions
          WHERE session_date >= date('now') AND status = 'scheduled'
        `).get().count,
        totalRegistrations: db.prepare('SELECT COUNT(*) as count FROM training_registrations').get().count
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching learning analytics:', error);
    res.status(500).json({ error: 'Failed to fetch learning analytics' });
  }
});

// ==========================================
// SAVED REPORTS
// ==========================================

// Get saved reports
router.get('/reports', authenticateToken, (req, res) => {
  try {
    const reports = db.prepare(`
      SELECT sr.*, u.name as created_by_name
      FROM saved_reports sr
      JOIN users u ON sr.created_by = u.id
      WHERE sr.is_public = 1 OR sr.created_by = ?
      ORDER BY sr.updated_at DESC
    `).all(req.user.id);
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get my reports
router.get('/reports/my-reports', authenticateToken, (req, res) => {
  try {
    const reports = db.prepare(`
      SELECT * FROM saved_reports WHERE created_by = ? ORDER BY updated_at DESC
    `).all(req.user.id);
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Create saved report
router.post('/reports', authenticateToken, (req, res) => {
  try {
    const { name, description, report_type, filters, columns, group_by, sort_by, chart_type, is_public } = req.body;

    const id = `rpt-${uuidv4()}`;
    db.prepare(`
      INSERT INTO saved_reports (id, name, description, report_type, filters, columns, group_by, sort_by, chart_type, is_public, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, description, report_type, JSON.stringify(filters), JSON.stringify(columns), group_by, sort_by, chart_type, is_public ? 1 : 0, req.user.id);

    const report = db.prepare('SELECT * FROM saved_reports WHERE id = ?').get(id);
    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Update saved report
router.put('/reports/:id', authenticateToken, (req, res) => {
  try {
    const { name, description, filters, columns, group_by, sort_by, chart_type, is_public } = req.body;

    // Verify ownership
    const report = db.prepare('SELECT created_by FROM saved_reports WHERE id = ?').get(req.params.id);
    if (report.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.prepare(`
      UPDATE saved_reports SET name = ?, description = ?, filters = ?, columns = ?,
      group_by = ?, sort_by = ?, chart_type = ?, is_public = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, description, JSON.stringify(filters), JSON.stringify(columns), group_by, sort_by, chart_type, is_public ? 1 : 0, req.params.id);

    const updatedReport = db.prepare('SELECT * FROM saved_reports WHERE id = ?').get(req.params.id);
    res.json(updatedReport);
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// Delete saved report
router.delete('/reports/:id', authenticateToken, (req, res) => {
  try {
    const report = db.prepare('SELECT created_by FROM saved_reports WHERE id = ?').get(req.params.id);
    if (report.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.prepare('DELETE FROM scheduled_reports WHERE report_id = ?').run(req.params.id);
    db.prepare('DELETE FROM saved_reports WHERE id = ?').run(req.params.id);
    res.json({ message: 'Report deleted' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// ==========================================
// AUDIT LOGS
// ==========================================

// Get audit logs
router.get('/audit-logs', authenticateToken, isAdmin, (req, res) => {
  try {
    const { entity_type, user_id, action, limit = 100 } = req.query;

    let query = `
      SELECT al.*, u.name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (entity_type) {
      query += ' AND al.entity_type = ?';
      params.push(entity_type);
    }
    if (user_id) {
      query += ' AND al.user_id = ?';
      params.push(user_id);
    }
    if (action) {
      query += ' AND al.action = ?';
      params.push(action);
    }

    query += ` ORDER BY al.created_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const logs = db.prepare(query).all(...params);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ==========================================
// USER PREFERENCES
// ==========================================

// Get my preferences
router.get('/preferences', authenticateToken, (req, res) => {
  try {
    let prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(req.user.id);

    if (!prefs) {
      // Create default preferences
      const id = `pref-${uuidv4()}`;
      db.prepare(`
        INSERT INTO user_preferences (id, user_id)
        VALUES (?, ?)
      `).run(id, req.user.id);
      prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(req.user.id);
    }

    res.json(prefs);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update my preferences
router.put('/preferences', authenticateToken, (req, res) => {
  try {
    const { theme, language, timezone, date_format, time_format, notifications_email, notifications_push, notifications_slack, dashboard_layout, sidebar_collapsed } = req.body;

    // Check if preferences exist
    const existing = db.prepare('SELECT id FROM user_preferences WHERE user_id = ?').get(req.user.id);

    if (existing) {
      db.prepare(`
        UPDATE user_preferences SET theme = COALESCE(?, theme), language = COALESCE(?, language),
        timezone = COALESCE(?, timezone), date_format = COALESCE(?, date_format),
        time_format = COALESCE(?, time_format), notifications_email = COALESCE(?, notifications_email),
        notifications_push = COALESCE(?, notifications_push), notifications_slack = COALESCE(?, notifications_slack),
        dashboard_layout = COALESCE(?, dashboard_layout), sidebar_collapsed = COALESCE(?, sidebar_collapsed),
        updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(theme, language, timezone, date_format, time_format, notifications_email, notifications_push, notifications_slack, dashboard_layout, sidebar_collapsed, req.user.id);
    } else {
      const id = `pref-${uuidv4()}`;
      db.prepare(`
        INSERT INTO user_preferences (id, user_id, theme, language, timezone, date_format, time_format, notifications_email, notifications_push, notifications_slack, dashboard_layout, sidebar_collapsed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, req.user.id, theme, language, timezone, date_format, time_format, notifications_email, notifications_push, notifications_slack, dashboard_layout, sidebar_collapsed);
    }

    const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(req.user.id);
    res.json(prefs);
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// ==========================================
// DASHBOARD WIDGETS
// ==========================================

// Get my widgets
router.get('/widgets', authenticateToken, (req, res) => {
  try {
    const widgets = db.prepare(`
      SELECT * FROM dashboard_widgets WHERE user_id = ? AND is_visible = 1
      ORDER BY position_y, position_x
    `).all(req.user.id);
    res.json(widgets);
  } catch (error) {
    console.error('Error fetching widgets:', error);
    res.status(500).json({ error: 'Failed to fetch widgets' });
  }
});

// Save widget layout
router.post('/widgets', authenticateToken, (req, res) => {
  try {
    const { widgets } = req.body;

    // Delete existing widgets
    db.prepare('DELETE FROM dashboard_widgets WHERE user_id = ?').run(req.user.id);

    // Insert new widgets
    const insert = db.prepare(`
      INSERT INTO dashboard_widgets (id, user_id, widget_type, title, config, position_x, position_y, width, height, is_visible)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const widget of widgets) {
      insert.run(`widget-${uuidv4()}`, req.user.id, widget.widget_type, widget.title, JSON.stringify(widget.config || {}), widget.position_x, widget.position_y, widget.width || 1, widget.height || 1, widget.is_visible !== false ? 1 : 0);
    }

    res.json({ message: 'Widgets saved' });
  } catch (error) {
    console.error('Error saving widgets:', error);
    res.status(500).json({ error: 'Failed to save widgets' });
  }
});

module.exports = router;
