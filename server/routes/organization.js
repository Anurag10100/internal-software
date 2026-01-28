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
// DEPARTMENTS
// ==========================================

router.get('/departments', authenticateToken, async (req, res) => {
  try {
    const { data: departments, error } = await req.supabase
      .from('departments')
      .select('*, parent:departments!parent_department_id(name), head:users!head_user_id(name), cost_center:cost_centers!cost_center_id(name)')
      .eq('is_active', 1)
      .order('name');
    if (error) throw error;

    const { data: counts } = await req.supabase.from('reporting_hierarchy').select('department_id');
    const countByDept = (counts || []).reduce((acc, r) => {
      if (r.department_id) acc[r.department_id] = (acc[r.department_id] || 0) + 1;
      return acc;
    }, {});

    const formatted = (departments || []).map(d => ({
      ...d,
      parent_name: d.parent?.name,
      head_name: d.head?.name,
      cost_center_name: d.cost_center?.name,
      employees_count: countByDept[d.id] || 0,
      parent: undefined,
      head: undefined,
      cost_center: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

router.get('/departments/hierarchy', authenticateToken, async (req, res) => {
  try {
    const { data: departments, error } = await req.supabase
      .from('departments')
      .select('*, head:users!head_user_id(name)')
      .eq('is_active', 1);
    if (error) throw error;

    const { data: counts } = await req.supabase.from('reporting_hierarchy').select('department_id');
    const countByDept = (counts || []).reduce((acc, r) => {
      if (r.department_id) acc[r.department_id] = (acc[r.department_id] || 0) + 1;
      return acc;
    }, {});

    const withCount = (departments || []).map(d => ({
      ...d,
      head_name: d.head?.name,
      employees_count: countByDept[d.id] || 0,
      head: undefined,
    }));

    const buildTree = (parentId = null) => {
      return withCount
        .filter(d => d.parent_department_id === parentId)
        .map(d => ({ ...d, children: buildTree(d.id) }));
    };
    res.json(buildTree(null));
  } catch (error) {
    console.error('Error fetching hierarchy:', error);
    res.status(500).json({ error: 'Failed to fetch hierarchy' });
  }
});

router.get('/departments/:id', authenticateToken, async (req, res) => {
  try {
    const { data: department, error } = await req.supabase
      .from('departments')
      .select('*, parent:departments!parent_department_id(name), head:users!head_user_id(name), cost_center:cost_centers!cost_center_id(name)')
      .eq('id', req.params.id)
      .single();
    if (error || !department) return res.status(404).json({ error: 'Department not found' });

    const formatted = {
      ...department,
      parent_name: department.parent?.name,
      head_name: department.head?.name,
      cost_center_name: department.cost_center?.name,
      parent: undefined,
      head: undefined,
      cost_center: undefined,
    };

    const { data: empRows } = await req.supabase
      .from('reporting_hierarchy')
      .select('*, user:users!user_id(id, name, email, avatar, designation), position:positions!position_id(title), manager:users!reports_to(name)')
      .eq('department_id', req.params.id);
    formatted.employees = (empRows || []).map(r => ({
      ...r.user,
      position_title: r.position?.title,
      reports_to: r.reports_to,
      manager_name: r.manager?.name,
      position: undefined,
      manager: undefined,
    }));

    const { data: subDepts } = await req.supabase.from('departments').select('*').eq('parent_department_id', req.params.id).eq('is_active', 1);
    formatted.subDepartments = subDepts || [];

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({ error: 'Failed to fetch department' });
  }
});

router.post('/departments', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, code, description, parent_department_id, head_user_id, cost_center_id, budget } = req.body;
    const id = `dept-${uuidv4()}`;
    const { error } = await req.supabase.from('departments').insert({
      id,
      name,
      code,
      description,
      parent_department_id,
      head_user_id,
      cost_center_id,
      budget,
    });
    if (error) throw error;
    const { data: department } = await req.supabase.from('departments').select('*').eq('id', id).single();
    res.status(201).json(department);
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

router.put('/departments/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, code, description, parent_department_id, head_user_id, cost_center_id, budget, is_active } = req.body;
    const { error } = await req.supabase.from('departments').update({
      name,
      code,
      description,
      parent_department_id,
      head_user_id,
      cost_center_id,
      budget,
      is_active: is_active ? 1 : 0,
    }).eq('id', req.params.id);
    if (error) throw error;
    const { data: department } = await req.supabase.from('departments').select('*').eq('id', req.params.id).single();
    res.json(department);
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// ==========================================
// POSITIONS
// ==========================================

router.get('/positions', authenticateToken, async (req, res) => {
  try {
    const { department_id } = req.query;
    let q = req.supabase.from('positions').select('*, department:departments!department_id(name)').eq('is_active', 1).order('level', { ascending: false }).order('title');
    if (department_id) q = q.eq('department_id', department_id);
    const { data: positions, error } = await q;
    if (error) throw error;

    const { data: rhData } = await req.supabase.from('reporting_hierarchy').select('position_id');
    const countByPos = (rhData || []).reduce((acc, r) => {
      if (r.position_id) acc[r.position_id] = (acc[r.position_id] || 0) + 1;
      return acc;
    }, {});

    const formatted = (positions || []).map(p => ({
      ...p,
      department_name: p.department?.name,
      employees_count: countByPos[p.id] || 0,
      department: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

router.post('/positions', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, code, department_id, level, min_salary, max_salary, description, requirements } = req.body;
    const id = `pos-${uuidv4()}`;
    const { error } = await req.supabase.from('positions').insert({
      id,
      title,
      code,
      department_id,
      level: level || 1,
      min_salary,
      max_salary,
      description,
      requirements,
    });
    if (error) throw error;
    const { data: position } = await req.supabase.from('positions').select('*').eq('id', id).single();
    res.status(201).json(position);
  } catch (error) {
    console.error('Error creating position:', error);
    res.status(500).json({ error: 'Failed to create position' });
  }
});

router.put('/positions/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, code, department_id, level, min_salary, max_salary, description, requirements, is_active } = req.body;
    const { error } = await req.supabase.from('positions').update({
      title,
      code,
      department_id,
      level,
      min_salary,
      max_salary,
      description,
      requirements,
      is_active: is_active ? 1 : 0,
    }).eq('id', req.params.id);
    if (error) throw error;
    const { data: position } = await req.supabase.from('positions').select('*').eq('id', req.params.id).single();
    res.json(position);
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({ error: 'Failed to update position' });
  }
});

// ==========================================
// COST CENTERS
// ==========================================

router.get('/cost-centers', authenticateToken, async (req, res) => {
  try {
    const { data: costCenters, error } = await req.supabase
      .from('cost_centers')
      .select('*, manager:users!manager_id(name)')
      .eq('is_active', 1)
      .order('name');
    if (error) throw error;

    const { data: rhData } = await req.supabase.from('reporting_hierarchy').select('cost_center_id');
    const { data: deptData } = await req.supabase.from('departments').select('cost_center_id');
    const empCount = (rhData || []).reduce((acc, r) => { if (r.cost_center_id) acc[r.cost_center_id] = (acc[r.cost_center_id] || 0) + 1; return acc; }, {});
    const deptCount = (deptData || []).reduce((acc, r) => { if (r.cost_center_id) acc[r.cost_center_id] = (acc[r.cost_center_id] || 0) + 1; return acc; }, {});

    const formatted = (costCenters || []).map(cc => ({
      ...cc,
      manager_name: cc.manager?.name,
      employees_count: empCount[cc.id] || 0,
      departments_count: deptCount[cc.id] || 0,
      manager: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching cost centers:', error);
    res.status(500).json({ error: 'Failed to fetch cost centers' });
  }
});

router.post('/cost-centers', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, code, description, budget, manager_id } = req.body;
    const id = `cc-${uuidv4()}`;
    const { error } = await req.supabase.from('cost_centers').insert({ id, name, code, description, budget, manager_id });
    if (error) throw error;
    const { data: costCenter } = await req.supabase.from('cost_centers').select('*').eq('id', id).single();
    res.status(201).json(costCenter);
  } catch (error) {
    console.error('Error creating cost center:', error);
    res.status(500).json({ error: 'Failed to create cost center' });
  }
});

router.put('/cost-centers/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, code, description, budget, manager_id, is_active } = req.body;
    const { error } = await req.supabase.from('cost_centers').update({
      name,
      code,
      description,
      budget,
      manager_id,
      is_active: is_active ? 1 : 0,
    }).eq('id', req.params.id);
    if (error) throw error;
    const { data: costCenter } = await req.supabase.from('cost_centers').select('*').eq('id', req.params.id).single();
    res.json(costCenter);
  } catch (error) {
    console.error('Error updating cost center:', error);
    res.status(500).json({ error: 'Failed to update cost center' });
  }
});

// ==========================================
// OFFICE LOCATIONS
// ==========================================

router.get('/locations', authenticateToken, async (req, res) => {
  try {
    const { data: locations, error } = await req.supabase
      .from('office_locations')
      .select('*')
      .eq('is_active', 1)
      .order('is_headquarters', { ascending: false })
      .order('name');
    if (error) throw error;

    const { data: rhData } = await req.supabase.from('reporting_hierarchy').select('location_id');
    const countByLoc = (rhData || []).reduce((acc, r) => { if (r.location_id) acc[r.location_id] = (acc[r.location_id] || 0) + 1; return acc; }, {});
    const formatted = (locations || []).map(l => ({ ...l, employees_count: countByLoc[l.id] || 0 }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

router.post('/locations', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, code, address, city, state, country, postal_code, phone, email, timezone, is_headquarters } = req.body;
    const id = `loc-${uuidv4()}`;
    const { error } = await req.supabase.from('office_locations').insert({
      id,
      name,
      code,
      address,
      city,
      state,
      country: country || 'India',
      postal_code,
      phone,
      email,
      timezone: timezone || 'Asia/Kolkata',
      is_headquarters: is_headquarters ? 1 : 0,
    });
    if (error) throw error;
    const { data: location } = await req.supabase.from('office_locations').select('*').eq('id', id).single();
    res.status(201).json(location);
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

router.put('/locations/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, code, address, city, state, country, postal_code, phone, email, timezone, is_headquarters, is_active } = req.body;
    const { error } = await req.supabase.from('office_locations').update({
      name,
      code,
      address,
      city,
      state,
      country,
      postal_code,
      phone,
      email,
      timezone,
      is_headquarters: is_headquarters ? 1 : 0,
      is_active: is_active ? 1 : 0,
    }).eq('id', req.params.id);
    if (error) throw error;
    const { data: location } = await req.supabase.from('office_locations').select('*').eq('id', req.params.id).single();
    res.json(location);
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// ==========================================
// REPORTING HIERARCHY / ORG CHART
// ==========================================

router.get('/org-chart', authenticateToken, async (req, res) => {
  try {
    const { data: employees, error } = await req.supabase
      .from('reporting_hierarchy')
      .select('*, user:users!user_id(name, email, avatar, designation), department:departments!department_id(name), position:positions!position_id(title), location:office_locations!location_id(name), manager:users!reports_to(name)');
    if (error) throw error;

    const formatted = (employees || []).map(e => ({
      ...e,
      name: e.user?.name,
      email: e.user?.email,
      avatar: e.user?.avatar,
      designation: e.user?.designation,
      department_name: e.department?.name,
      position_title: e.position?.title,
      location_name: e.location?.name,
      manager_name: e.manager?.name,
      user: undefined,
      department: undefined,
      position: undefined,
      location: undefined,
      manager: undefined,
    }));

    const buildTree = (managerId = null) => {
      return formatted
        .filter(e => e.reports_to === managerId)
        .map(e => ({ ...e, directReports: buildTree(e.user_id) }));
    };
    res.json(buildTree(null));
  } catch (error) {
    console.error('Error fetching org chart:', error);
    res.status(500).json({ error: 'Failed to fetch org chart' });
  }
});

router.get('/my-structure', authenticateToken, async (req, res) => {
  try {
    const { data: myHierarchy, error } = await req.supabase
      .from('reporting_hierarchy')
      .select('*, user:users!user_id(name, email, avatar, designation), department:departments!department_id(name), position:positions!position_id(title), location:office_locations!location_id(name)')
      .eq('user_id', req.user.id)
      .single();
    if (error || !myHierarchy) return res.json(null);

    const formatted = {
      ...myHierarchy,
      name: myHierarchy.user?.name,
      email: myHierarchy.user?.email,
      avatar: myHierarchy.user?.avatar,
      designation: myHierarchy.user?.designation,
      department_name: myHierarchy.department?.name,
      position_title: myHierarchy.position?.title,
      location_name: myHierarchy.location?.name,
      user: undefined,
      department: undefined,
      position: undefined,
      location: undefined,
    };

    if (myHierarchy.reports_to) {
      const { data: manager } = await req.supabase.from('users').select('id, name, email, avatar, designation').eq('id', myHierarchy.reports_to).single();
      formatted.manager = manager;
    }

    const { data: reports } = await req.supabase
      .from('reporting_hierarchy')
      .select('user_id, user:users!user_id(name, email, avatar, designation), position:positions!position_id(title)')
      .eq('reports_to', req.user.id);
    formatted.directReports = (reports || []).map(r => ({
      user_id: r.user_id,
      name: r.user?.name,
      email: r.user?.email,
      avatar: r.user?.avatar,
      designation: r.user?.designation,
      position_title: r.position?.title,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching structure:', error);
    res.status(500).json({ error: 'Failed to fetch structure' });
  }
});

router.get('/direct-reports', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('reporting_hierarchy')
      .select('user_id, user:users!user_id(name, email, avatar, designation, department), position:positions!position_id(title), department:departments!department_id(name)')
      .eq('reports_to', req.user.id);
    if (error) throw error;
    const formatted = (data || []).map(r => ({
      user_id: r.user_id,
      name: r.user?.name,
      email: r.user?.email,
      avatar: r.user?.avatar,
      designation: r.user?.designation,
      department: r.user?.department,
      position_title: r.position?.title,
      department_name: r.department?.name,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

router.put('/hierarchy/:userId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { reports_to, secondary_reports_to, department_id, position_id, location_id, cost_center_id, effective_from } = req.body;
    const { data: existing } = await req.supabase.from('reporting_hierarchy').select('id').eq('user_id', req.params.userId).single();

    if (existing) {
      const { error } = await req.supabase.from('reporting_hierarchy').update({
        reports_to,
        secondary_reports_to,
        department_id,
        position_id,
        location_id,
        cost_center_id,
        effective_from,
      }).eq('user_id', req.params.userId);
      if (error) throw error;
    } else {
      const id = `rh-${uuidv4()}`;
      const { error } = await req.supabase.from('reporting_hierarchy').insert({
        id,
        user_id: req.params.userId,
        reports_to,
        secondary_reports_to,
        department_id,
        position_id,
        location_id,
        cost_center_id,
        effective_from,
      });
      if (error) throw error;
    }

    const { data: hierarchy } = await req.supabase
      .from('reporting_hierarchy')
      .select('*, user:users!user_id(name), department:departments!department_id(name), position:positions!position_id(title)')
      .eq('user_id', req.params.userId)
      .single();
    res.json({
      ...hierarchy,
      name: hierarchy?.user?.name,
      department_name: hierarchy?.department?.name,
      position_title: hierarchy?.position?.title,
      user: undefined,
      department: undefined,
      position: undefined,
    });
  } catch (error) {
    console.error('Error updating hierarchy:', error);
    res.status(500).json({ error: 'Failed to update hierarchy' });
  }
});

// ==========================================
// EMPLOYEE PROFILES
// ==========================================

router.get('/profile/my-profile', authenticateToken, async (req, res) => {
  try {
    const { data: user } = await req.supabase.from('users').select('id, name, email, avatar, department, designation, role').eq('id', req.user.id).single();
    const { data: profile } = await req.supabase.from('employee_profiles').select('*').eq('user_id', req.user.id).single();
    const { data: hierarchy } = await req.supabase
      .from('reporting_hierarchy')
      .select('*, department:departments!department_id(name), position:positions!position_id(title), location:office_locations!location_id(name), manager:users!reports_to(name)')
      .eq('user_id', req.user.id)
      .single();
    res.json({ ...user, ...profile, hierarchy });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/profile/my-profile', authenticateToken, async (req, res) => {
  try {
    const { phone, personal_email, date_of_birth, gender, marital_status, blood_group, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, current_address, permanent_address, bio, linkedin_url, twitter_url, timezone, language_preference } = req.body;
    const { data: existing } = await req.supabase.from('employee_profiles').select('id').eq('user_id', req.user.id).single();
    const payload = {
      phone,
      personal_email,
      date_of_birth,
      gender,
      marital_status,
      blood_group,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relation,
      current_address,
      permanent_address,
      bio,
      linkedin_url,
      twitter_url,
      timezone,
      language_preference,
      updated_at: new Date().toISOString(),
    };
    if (existing) {
      await req.supabase.from('employee_profiles').update(payload).eq('user_id', req.user.id);
    } else {
      await req.supabase.from('employee_profiles').insert({ id: `ep-${uuidv4()}`, user_id: req.user.id, ...payload });
    }
    res.json({ message: 'Profile updated' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.get('/directory', authenticateToken, async (req, res) => {
  try {
    const { department, location, search } = req.query;
    let q = req.supabase
      .from('users')
      .select('id, name, email, avatar, department, designation, employee_profiles(phone, bio), reporting_hierarchy(department_id, position_id, location_id, departments(name), positions(title), office_locations(name))');
    if (department) q = q.eq('department', department);
    if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,designation.ilike.%${search}%`);
    const { data: users, error } = await q.order('name');
    if (error) throw error;

    let filtered = users || [];
    if (location) {
      filtered = filtered.filter(u => {
        const rh = u.reporting_hierarchy?.[0];
        return rh?.location_id === location || rh?.office_locations?.id === location;
      });
    }
    const formatted = filtered.map(u => {
      const rh = u.reporting_hierarchy?.[0];
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        department: u.department,
        designation: u.designation,
        phone: u.employee_profiles?.phone,
        bio: u.employee_profiles?.bio,
        dept_name: rh?.departments?.name,
        position_title: rh?.positions?.title,
        location_name: rh?.office_locations?.name,
      };
    });
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching directory:', error);
    res.status(500).json({ error: 'Failed to fetch directory' });
  }
});

router.get('/dashboard', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [
      { count: totalEmployees },
      { count: totalDepartments },
      { count: totalPositions },
      { count: totalLocations },
      { data: deptCounts },
      { data: locCounts },
      { data: levelCounts },
      { data: recentJoiners },
    ] = await Promise.all([
      req.supabase.from('users').select('*', { count: 'exact', head: true }),
      req.supabase.from('departments').select('*', { count: 'exact', head: true }).eq('is_active', 1),
      req.supabase.from('positions').select('*', { count: 'exact', head: true }).eq('is_active', 1),
      req.supabase.from('office_locations').select('*', { count: 'exact', head: true }).eq('is_active', 1),
      req.supabase.rpc('get_employees_by_department').catch(() => ({ data: [] })),
      req.supabase.rpc('get_employees_by_location').catch(() => ({ data: [] })),
      req.supabase.rpc('get_employees_by_level').catch(() => ({ data: [] })),
      req.supabase.from('users').select('id, name, email, department, designation, created_at').order('created_at', { ascending: false }).limit(5),
    ]);

    const employeesByDepartment = deptCounts && Array.isArray(deptCounts) ? deptCounts : [];
    const employeesByLocation = locCounts && Array.isArray(locCounts) ? locCounts : [];
    const employeesByLevel = levelCounts && Array.isArray(levelCounts) ? levelCounts : [];

    res.json({
      totalEmployees: totalEmployees || 0,
      totalDepartments: totalDepartments || 0,
      totalPositions: totalPositions || 0,
      totalLocations: totalLocations || 0,
      employeesByDepartment,
      employeesByLocation,
      employeesByLevel,
      recentJoiners: recentJoiners || [],
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
