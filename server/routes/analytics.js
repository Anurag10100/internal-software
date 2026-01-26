const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ==========================================
// HR ANALYTICS DASHBOARD
// ==========================================

// Get comprehensive HR analytics
router.get('/hr-overview', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { count: totalEmployees } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: inProbation } = await supabase.from('team_members').select('*', { count: 'exact', head: true }).eq('in_probation', 1);
    const { count: pendingLeaves } = await supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: openTasks } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'completed');
    const { count: activeKPIs } = await supabase.from('kpis').select('*', { count: 'exact', head: true }).neq('status', 'achieved');
    const { count: activePIPs } = await supabase.from('pips').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const { count: activeAppraisals } = await supabase.from('appraisal_cycles').select('*', { count: 'exact', head: true }).eq('status', 'active');

    const { data: byDepartment } = await supabase.rpc('count_by_department').catch(() => ({ data: [] }));
    const { data: byRole } = await supabase.rpc('count_by_role').catch(() => ({ data: [] }));

    res.json({
      totalEmployees: totalEmployees || 0,
      newHiresThisMonth: 0,
      newHiresThisYear: 0,
      exitsThisYear: 0,
      byDepartment: byDepartment || [],
      byRole: byRole || [],
      inProbation: inProbation || 0,
      pendingLeaves: pendingLeaves || 0,
      approvedLeavesToday: 0,
      openTasks: openTasks || 0,
      overdueTasks: 0,
      activeKPIs: activeKPIs || 0,
      activePIPs: activePIPs || 0,
      activeAppraisals: activeAppraisals || 0
    });
  } catch (error) {
    console.error('Error fetching HR overview:', error);
    res.status(500).json({ error: 'Failed to fetch HR overview' });
  }
});

// Get headcount trends
router.get('/headcount-trends', authenticateToken, isAdmin, async (req, res) => {
  try {
    res.json({ hires: [], exits: [] });
  } catch (error) {
    console.error('Error fetching headcount trends:', error);
    res.status(500).json({ error: 'Failed to fetch headcount trends' });
  }
});

// Get attendance analytics
router.get('/attendance-analytics', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { count: totalCheckIns } = await supabase.from('check_ins').select('*', { count: 'exact', head: true });

    res.json({
      totalCheckIns: totalCheckIns || 0,
      onTimePercentage: 0,
      lateArrivals: 0,
      byStatus: [],
      byLocation: []
    });
  } catch (error) {
    console.error('Error fetching attendance analytics:', error);
    res.status(500).json({ error: 'Failed to fetch attendance analytics' });
  }
});

// Get leave analytics
router.get('/leave-analytics', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { count: totalRequests } = await supabase.from('leave_requests').select('*', { count: 'exact', head: true });
    const { count: pendingRequests } = await supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: approvedRequests } = await supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved');
    const { count: rejectedRequests } = await supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'rejected');

    res.json({
      totalRequests: totalRequests || 0,
      pendingRequests: pendingRequests || 0,
      approvedRequests: approvedRequests || 0,
      rejectedRequests: rejectedRequests || 0,
      byType: [],
      byMonth: [],
      topRequesters: []
    });
  } catch (error) {
    console.error('Error fetching leave analytics:', error);
    res.status(500).json({ error: 'Failed to fetch leave analytics' });
  }
});

// Get performance analytics
router.get('/performance-analytics', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { data: kpis } = await supabase.from('kpis').select('status');
    const { data: pips } = await supabase.from('pips').select('status');
    const { count: totalRecognitions } = await supabase.from('recognitions').select('*', { count: 'exact', head: true });
    const { count: activeCycles } = await supabase.from('appraisal_cycles').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const { count: pendingReviews } = await supabase.from('appraisals').select('*', { count: 'exact', head: true }).in('status', ['pending', 'self_review']);

    res.json({
      kpiStats: {
        total: kpis?.length || 0,
        achieved: kpis?.filter(k => k.status === 'achieved').length || 0,
        onTrack: kpis?.filter(k => k.status === 'on_track').length || 0,
        atRisk: kpis?.filter(k => k.status === 'at_risk').length || 0,
        behind: kpis?.filter(k => k.status === 'behind').length || 0
      },
      pipStats: {
        active: pips?.filter(p => p.status === 'active').length || 0,
        completed: pips?.filter(p => p.status === 'completed').length || 0,
        failed: pips?.filter(p => p.status === 'failed').length || 0
      },
      goalProgress: [],
      recognitionStats: {
        total: totalRecognitions || 0,
        thisMonth: 0,
        byBadge: []
      },
      appraisalStats: {
        activeCycles: activeCycles || 0,
        pendingReviews: pendingReviews || 0,
        avgRating: 0
      }
    });
  } catch (error) {
    console.error('Error fetching performance analytics:', error);
    res.status(500).json({ error: 'Failed to fetch performance analytics' });
  }
});

// Get recruitment analytics
router.get('/recruitment-analytics', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { count: openPositions } = await supabase.from('job_postings').select('*', { count: 'exact', head: true }).eq('status', 'published');
    const { count: totalCandidates } = await supabase.from('candidates').select('*', { count: 'exact', head: true });

    res.json({
      openPositions: openPositions || 0,
      totalCandidates: totalCandidates || 0,
      candidatesThisMonth: 0,
      pipelineStats: [],
      hiredThisYear: 0,
      sourceBreakdown: [],
      timeToHire: 0,
      offerAcceptanceRate: 0
    });
  } catch (error) {
    console.error('Error fetching recruitment analytics:', error);
    res.status(500).json({ error: 'Failed to fetch recruitment analytics' });
  }
});

// Get payroll analytics
router.get('/payroll-analytics', authenticateToken, isAdmin, async (req, res) => {
  try {
    res.json({
      totalPayroll: 0,
      avgSalary: 0,
      employeesWithSalary: 0,
      salaryByDepartment: [],
      pendingPayslips: 0,
      reimbursementsStats: { pending: 0, pendingAmount: 0, paidThisMonth: 0 },
      activeLoans: 0,
      totalLoanOutstanding: 0
    });
  } catch (error) {
    console.error('Error fetching payroll analytics:', error);
    res.status(500).json({ error: 'Failed to fetch payroll analytics' });
  }
});

// Get asset analytics
router.get('/asset-analytics', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { count: totalAssets } = await supabase.from('assets').select('*', { count: 'exact', head: true });

    res.json({
      totalAssets: totalAssets || 0,
      totalValue: 0,
      byStatus: [],
      byCategory: [],
      pendingRequests: 0,
      upcomingMaintenance: 0,
      licenseStats: { total: 0, expiringSoon: 0, utilizationRate: 0 }
    });
  } catch (error) {
    console.error('Error fetching asset analytics:', error);
    res.status(500).json({ error: 'Failed to fetch asset analytics' });
  }
});

// Get learning analytics
router.get('/learning-analytics', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { count: totalCourses } = await supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_active', true);
    const { count: totalEnrollments } = await supabase.from('course_enrollments').select('*', { count: 'exact', head: true });

    res.json({
      totalCourses: totalCourses || 0,
      totalEnrollments: totalEnrollments || 0,
      completedEnrollments: 0,
      completionRate: 0,
      topCourses: [],
      byCategory: [],
      skillsStats: { totalSkills: 0, employeeSkills: 0, avgSkillsPerEmployee: 0 },
      certifications: { total: 0, expiringSoon: 0 },
      trainingSessions: { upcoming: 0, totalRegistrations: 0 }
    });
  } catch (error) {
    console.error('Error fetching learning analytics:', error);
    res.status(500).json({ error: 'Failed to fetch learning analytics' });
  }
});

// ==========================================
// SAVED REPORTS
// ==========================================

// Get saved reports
router.get('/reports', authenticateToken, async (req, res) => {
  try {
    const { data: reports, error } = await supabase
      .from('saved_reports')
      .select('*, creator:users!created_by(name)')
      .or(`is_public.eq.true,created_by.eq.${req.user.id}`)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const formatted = reports.map(r => ({
      ...r,
      created_by_name: r.creator?.name
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get my reports
router.get('/reports/my-reports', authenticateToken, async (req, res) => {
  try {
    const { data: reports, error } = await supabase
      .from('saved_reports')
      .select()
      .eq('created_by', req.user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Create saved report
router.post('/reports', authenticateToken, async (req, res) => {
  try {
    const { name, description, report_type, filters, columns, group_by, sort_by, chart_type, is_public } = req.body;
    const id = `rpt-${uuidv4()}`;

    const { data: report, error } = await supabase
      .from('saved_reports')
      .insert({
        id,
        name,
        description,
        report_type,
        filters: JSON.stringify(filters),
        columns: JSON.stringify(columns),
        group_by,
        sort_by,
        chart_type,
        is_public: is_public ? 1 : 0,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Update saved report
router.put('/reports/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, filters, columns, group_by, sort_by, chart_type, is_public } = req.body;

    const { data: report } = await supabase
      .from('saved_reports')
      .select('created_by')
      .eq('id', req.params.id)
      .single();

    if (report?.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: updatedReport, error } = await supabase
      .from('saved_reports')
      .update({
        name,
        description,
        filters: JSON.stringify(filters),
        columns: JSON.stringify(columns),
        group_by,
        sort_by,
        chart_type,
        is_public: is_public ? 1 : 0
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(updatedReport);
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// Delete saved report
router.delete('/reports/:id', authenticateToken, async (req, res) => {
  try {
    const { data: report } = await supabase
      .from('saved_reports')
      .select('created_by')
      .eq('id', req.params.id)
      .single();

    if (report?.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await supabase.from('scheduled_reports').delete().eq('report_id', req.params.id);
    await supabase.from('saved_reports').delete().eq('id', req.params.id);

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
router.get('/audit-logs', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { entity_type, user_id, action, limit = 100 } = req.query;

    let query = supabase
      .from('audit_logs')
      .select('*, user:users!user_id(name)')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (entity_type) query = query.eq('entity_type', entity_type);
    if (user_id) query = query.eq('user_id', user_id);
    if (action) query = query.eq('action', action);

    const { data: logs, error } = await query;
    if (error) throw error;

    const formatted = logs.map(l => ({
      ...l,
      user_name: l.user?.name
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ==========================================
// USER PREFERENCES
// ==========================================

// Get my preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    let { data: prefs } = await supabase
      .from('user_preferences')
      .select()
      .eq('user_id', req.user.id)
      .single();

    if (!prefs) {
      const id = `pref-${uuidv4()}`;
      const { data: newPrefs, error } = await supabase
        .from('user_preferences')
        .insert({ id, user_id: req.user.id })
        .select()
        .single();

      if (error) throw error;
      prefs = newPrefs;
    }

    res.json(prefs);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update my preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { theme, language, timezone, date_format, time_format, notifications_email, notifications_push, notifications_slack, dashboard_layout, sidebar_collapsed } = req.body;

    const { data: existing } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    const updateData = {};
    if (theme !== undefined) updateData.theme = theme;
    if (language !== undefined) updateData.language = language;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (date_format !== undefined) updateData.date_format = date_format;
    if (time_format !== undefined) updateData.time_format = time_format;
    if (notifications_email !== undefined) updateData.notifications_email = notifications_email;
    if (notifications_push !== undefined) updateData.notifications_push = notifications_push;
    if (notifications_slack !== undefined) updateData.notifications_slack = notifications_slack;
    if (dashboard_layout !== undefined) updateData.dashboard_layout = dashboard_layout;
    if (sidebar_collapsed !== undefined) updateData.sidebar_collapsed = sidebar_collapsed;

    if (existing) {
      await supabase.from('user_preferences').update(updateData).eq('user_id', req.user.id);
    } else {
      const id = `pref-${uuidv4()}`;
      await supabase.from('user_preferences').insert({ id, user_id: req.user.id, ...updateData });
    }

    const { data: prefs } = await supabase.from('user_preferences').select().eq('user_id', req.user.id).single();
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
router.get('/widgets', authenticateToken, async (req, res) => {
  try {
    const { data: widgets, error } = await supabase
      .from('dashboard_widgets')
      .select()
      .eq('user_id', req.user.id)
      .eq('is_visible', 1)
      .order('position_y')
      .order('position_x');

    if (error) throw error;
    res.json(widgets);
  } catch (error) {
    console.error('Error fetching widgets:', error);
    res.status(500).json({ error: 'Failed to fetch widgets' });
  }
});

// Save widget layout
router.post('/widgets', authenticateToken, async (req, res) => {
  try {
    const { widgets } = req.body;

    await supabase.from('dashboard_widgets').delete().eq('user_id', req.user.id);

    for (const widget of widgets) {
      await supabase.from('dashboard_widgets').insert({
        id: `widget-${uuidv4()}`,
        user_id: req.user.id,
        widget_type: widget.widget_type,
        title: widget.title,
        config: JSON.stringify(widget.config || {}),
        position_x: widget.position_x,
        position_y: widget.position_y,
        width: widget.width || 1,
        height: widget.height || 1,
        is_visible: widget.is_visible !== false ? 1 : 0
      });
    }

    res.json({ message: 'Widgets saved' });
  } catch (error) {
    console.error('Error saving widgets:', error);
    res.status(500).json({ error: 'Failed to save widgets' });
  }
});

module.exports = router;
