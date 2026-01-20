const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// ==========================================
// DEPARTMENTS
// ==========================================

// Get all departments
router.get('/departments', authenticateToken, (req, res) => {
  try {
    const departments = db.prepare(`
      SELECT d.*, p.name as parent_name, h.name as head_name, cc.name as cost_center_name,
             (SELECT COUNT(*) FROM reporting_hierarchy rh WHERE rh.department_id = d.id) as employees_count
      FROM departments d
      LEFT JOIN departments p ON d.parent_department_id = p.id
      LEFT JOIN users h ON d.head_user_id = h.id
      LEFT JOIN cost_centers cc ON d.cost_center_id = cc.id
      WHERE d.is_active = 1
      ORDER BY d.name
    `).all();
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Get department hierarchy (tree structure)
router.get('/departments/hierarchy', authenticateToken, (req, res) => {
  try {
    const departments = db.prepare(`
      SELECT d.*, h.name as head_name,
             (SELECT COUNT(*) FROM reporting_hierarchy rh WHERE rh.department_id = d.id) as employees_count
      FROM departments d
      LEFT JOIN users h ON d.head_user_id = h.id
      WHERE d.is_active = 1
    `).all();

    // Build tree structure
    const buildTree = (parentId = null) => {
      return departments
        .filter(d => d.parent_department_id === parentId)
        .map(d => ({
          ...d,
          children: buildTree(d.id)
        }));
    };

    res.json(buildTree(null));
  } catch (error) {
    console.error('Error fetching hierarchy:', error);
    res.status(500).json({ error: 'Failed to fetch hierarchy' });
  }
});

// Get single department
router.get('/departments/:id', authenticateToken, (req, res) => {
  try {
    const department = db.prepare(`
      SELECT d.*, p.name as parent_name, h.name as head_name, cc.name as cost_center_name
      FROM departments d
      LEFT JOIN departments p ON d.parent_department_id = p.id
      LEFT JOIN users h ON d.head_user_id = h.id
      LEFT JOIN cost_centers cc ON d.cost_center_id = cc.id
      WHERE d.id = ?
    `).get(req.params.id);

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Get employees in department
    department.employees = db.prepare(`
      SELECT u.*, p.title as position_title, rh.reports_to, m.name as manager_name
      FROM reporting_hierarchy rh
      JOIN users u ON rh.user_id = u.id
      LEFT JOIN positions p ON rh.position_id = p.id
      LEFT JOIN users m ON rh.reports_to = m.id
      WHERE rh.department_id = ?
    `).all(req.params.id);

    // Get sub-departments
    department.subDepartments = db.prepare(`
      SELECT * FROM departments WHERE parent_department_id = ? AND is_active = 1
    `).all(req.params.id);

    res.json(department);
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({ error: 'Failed to fetch department' });
  }
});

// Create department
router.post('/departments', authenticateToken, isAdmin, (req, res) => {
  try {
    const { name, code, description, parent_department_id, head_user_id, cost_center_id, budget } = req.body;

    const id = `dept-${uuidv4()}`;
    db.prepare(`
      INSERT INTO departments (id, name, code, description, parent_department_id, head_user_id, cost_center_id, budget)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, code, description, parent_department_id, head_user_id, cost_center_id, budget);

    const department = db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
    res.status(201).json(department);
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// Update department
router.put('/departments/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { name, code, description, parent_department_id, head_user_id, cost_center_id, budget, is_active } = req.body;

    db.prepare(`
      UPDATE departments SET name = ?, code = ?, description = ?, parent_department_id = ?,
      head_user_id = ?, cost_center_id = ?, budget = ?, is_active = ?
      WHERE id = ?
    `).run(name, code, description, parent_department_id, head_user_id, cost_center_id, budget, is_active ? 1 : 0, req.params.id);

    const department = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id);
    res.json(department);
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// ==========================================
// POSITIONS
// ==========================================

// Get all positions
router.get('/positions', authenticateToken, (req, res) => {
  try {
    const { department_id } = req.query;
    let query = `
      SELECT p.*, d.name as department_name,
             (SELECT COUNT(*) FROM reporting_hierarchy rh WHERE rh.position_id = p.id) as employees_count
      FROM positions p
      LEFT JOIN departments d ON p.department_id = d.id
      WHERE p.is_active = 1
    `;
    const params = [];

    if (department_id) {
      query += ' AND p.department_id = ?';
      params.push(department_id);
    }

    query += ' ORDER BY p.level DESC, p.title';

    const positions = db.prepare(query).all(...params);
    res.json(positions);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

// Create position
router.post('/positions', authenticateToken, isAdmin, (req, res) => {
  try {
    const { title, code, department_id, level, min_salary, max_salary, description, requirements } = req.body;

    const id = `pos-${uuidv4()}`;
    db.prepare(`
      INSERT INTO positions (id, title, code, department_id, level, min_salary, max_salary, description, requirements)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, code, department_id, level || 1, min_salary, max_salary, description, requirements);

    const position = db.prepare('SELECT * FROM positions WHERE id = ?').get(id);
    res.status(201).json(position);
  } catch (error) {
    console.error('Error creating position:', error);
    res.status(500).json({ error: 'Failed to create position' });
  }
});

// Update position
router.put('/positions/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { title, code, department_id, level, min_salary, max_salary, description, requirements, is_active } = req.body;

    db.prepare(`
      UPDATE positions SET title = ?, code = ?, department_id = ?, level = ?,
      min_salary = ?, max_salary = ?, description = ?, requirements = ?, is_active = ?
      WHERE id = ?
    `).run(title, code, department_id, level, min_salary, max_salary, description, requirements, is_active ? 1 : 0, req.params.id);

    const position = db.prepare('SELECT * FROM positions WHERE id = ?').get(req.params.id);
    res.json(position);
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({ error: 'Failed to update position' });
  }
});

// ==========================================
// COST CENTERS
// ==========================================

// Get all cost centers
router.get('/cost-centers', authenticateToken, (req, res) => {
  try {
    const costCenters = db.prepare(`
      SELECT cc.*, m.name as manager_name,
             (SELECT COUNT(*) FROM reporting_hierarchy rh WHERE rh.cost_center_id = cc.id) as employees_count,
             (SELECT COUNT(*) FROM departments d WHERE d.cost_center_id = cc.id) as departments_count
      FROM cost_centers cc
      LEFT JOIN users m ON cc.manager_id = m.id
      WHERE cc.is_active = 1
      ORDER BY cc.name
    `).all();
    res.json(costCenters);
  } catch (error) {
    console.error('Error fetching cost centers:', error);
    res.status(500).json({ error: 'Failed to fetch cost centers' });
  }
});

// Create cost center
router.post('/cost-centers', authenticateToken, isAdmin, (req, res) => {
  try {
    const { name, code, description, budget, manager_id } = req.body;

    const id = `cc-${uuidv4()}`;
    db.prepare(`
      INSERT INTO cost_centers (id, name, code, description, budget, manager_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, code, description, budget, manager_id);

    const costCenter = db.prepare('SELECT * FROM cost_centers WHERE id = ?').get(id);
    res.status(201).json(costCenter);
  } catch (error) {
    console.error('Error creating cost center:', error);
    res.status(500).json({ error: 'Failed to create cost center' });
  }
});

// Update cost center
router.put('/cost-centers/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { name, code, description, budget, manager_id, is_active } = req.body;

    db.prepare(`
      UPDATE cost_centers SET name = ?, code = ?, description = ?, budget = ?,
      manager_id = ?, is_active = ? WHERE id = ?
    `).run(name, code, description, budget, manager_id, is_active ? 1 : 0, req.params.id);

    const costCenter = db.prepare('SELECT * FROM cost_centers WHERE id = ?').get(req.params.id);
    res.json(costCenter);
  } catch (error) {
    console.error('Error updating cost center:', error);
    res.status(500).json({ error: 'Failed to update cost center' });
  }
});

// ==========================================
// OFFICE LOCATIONS
// ==========================================

// Get all locations
router.get('/locations', authenticateToken, (req, res) => {
  try {
    const locations = db.prepare(`
      SELECT ol.*,
             (SELECT COUNT(*) FROM reporting_hierarchy rh WHERE rh.location_id = ol.id) as employees_count
      FROM office_locations ol
      WHERE ol.is_active = 1
      ORDER BY ol.is_headquarters DESC, ol.name
    `).all();
    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Create location
router.post('/locations', authenticateToken, isAdmin, (req, res) => {
  try {
    const { name, code, address, city, state, country, postal_code, phone, email, timezone, is_headquarters } = req.body;

    const id = `loc-${uuidv4()}`;
    db.prepare(`
      INSERT INTO office_locations (id, name, code, address, city, state, country, postal_code, phone, email, timezone, is_headquarters)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, code, address, city, state, country || 'India', postal_code, phone, email, timezone || 'Asia/Kolkata', is_headquarters ? 1 : 0);

    const location = db.prepare('SELECT * FROM office_locations WHERE id = ?').get(id);
    res.status(201).json(location);
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// Update location
router.put('/locations/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { name, code, address, city, state, country, postal_code, phone, email, timezone, is_headquarters, is_active } = req.body;

    db.prepare(`
      UPDATE office_locations SET name = ?, code = ?, address = ?, city = ?, state = ?,
      country = ?, postal_code = ?, phone = ?, email = ?, timezone = ?,
      is_headquarters = ?, is_active = ? WHERE id = ?
    `).run(name, code, address, city, state, country, postal_code, phone, email, timezone, is_headquarters ? 1 : 0, is_active ? 1 : 0, req.params.id);

    const location = db.prepare('SELECT * FROM office_locations WHERE id = ?').get(req.params.id);
    res.json(location);
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// ==========================================
// REPORTING HIERARCHY / ORG CHART
// ==========================================

// Get full org chart
router.get('/org-chart', authenticateToken, (req, res) => {
  try {
    const employees = db.prepare(`
      SELECT rh.*, u.name, u.email, u.avatar, u.designation,
             d.name as department_name, p.title as position_title,
             l.name as location_name, m.name as manager_name
      FROM reporting_hierarchy rh
      JOIN users u ON rh.user_id = u.id
      LEFT JOIN departments d ON rh.department_id = d.id
      LEFT JOIN positions p ON rh.position_id = p.id
      LEFT JOIN office_locations l ON rh.location_id = l.id
      LEFT JOIN users m ON rh.reports_to = m.id
    `).all();

    // Build tree structure
    const buildTree = (managerId = null) => {
      return employees
        .filter(e => e.reports_to === managerId)
        .map(e => ({
          ...e,
          directReports: buildTree(e.user_id)
        }));
    };

    res.json(buildTree(null));
  } catch (error) {
    console.error('Error fetching org chart:', error);
    res.status(500).json({ error: 'Failed to fetch org chart' });
  }
});

// Get my reporting structure
router.get('/my-structure', authenticateToken, (req, res) => {
  try {
    const myHierarchy = db.prepare(`
      SELECT rh.*, u.name, u.email, u.avatar, u.designation,
             d.name as department_name, p.title as position_title,
             l.name as location_name
      FROM reporting_hierarchy rh
      JOIN users u ON rh.user_id = u.id
      LEFT JOIN departments d ON rh.department_id = d.id
      LEFT JOIN positions p ON rh.position_id = p.id
      LEFT JOIN office_locations l ON rh.location_id = l.id
      WHERE rh.user_id = ?
    `).get(req.user.id);

    if (myHierarchy) {
      // Get manager
      if (myHierarchy.reports_to) {
        myHierarchy.manager = db.prepare(`
          SELECT u.id, u.name, u.email, u.avatar, u.designation
          FROM users u WHERE u.id = ?
        `).get(myHierarchy.reports_to);
      }

      // Get direct reports
      myHierarchy.directReports = db.prepare(`
        SELECT rh.user_id, u.name, u.email, u.avatar, u.designation, p.title as position_title
        FROM reporting_hierarchy rh
        JOIN users u ON rh.user_id = u.id
        LEFT JOIN positions p ON rh.position_id = p.id
        WHERE rh.reports_to = ?
      `).all(req.user.id);
    }

    res.json(myHierarchy);
  } catch (error) {
    console.error('Error fetching structure:', error);
    res.status(500).json({ error: 'Failed to fetch structure' });
  }
});

// Get direct reports
router.get('/direct-reports', authenticateToken, (req, res) => {
  try {
    const reports = db.prepare(`
      SELECT rh.user_id, u.name, u.email, u.avatar, u.designation, u.department,
             p.title as position_title, d.name as department_name
      FROM reporting_hierarchy rh
      JOIN users u ON rh.user_id = u.id
      LEFT JOIN positions p ON rh.position_id = p.id
      LEFT JOIN departments d ON rh.department_id = d.id
      WHERE rh.reports_to = ?
    `).all(req.user.id);
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Update employee hierarchy
router.put('/hierarchy/:userId', authenticateToken, isAdmin, (req, res) => {
  try {
    const { reports_to, secondary_reports_to, department_id, position_id, location_id, cost_center_id, effective_from } = req.body;

    // Check if hierarchy exists
    const existing = db.prepare('SELECT id FROM reporting_hierarchy WHERE user_id = ?').get(req.params.userId);

    if (existing) {
      db.prepare(`
        UPDATE reporting_hierarchy SET reports_to = ?, secondary_reports_to = ?,
        department_id = ?, position_id = ?, location_id = ?, cost_center_id = ?,
        effective_from = ? WHERE user_id = ?
      `).run(reports_to, secondary_reports_to, department_id, position_id, location_id, cost_center_id, effective_from, req.params.userId);
    } else {
      const id = `rh-${uuidv4()}`;
      db.prepare(`
        INSERT INTO reporting_hierarchy (id, user_id, reports_to, secondary_reports_to, department_id, position_id, location_id, cost_center_id, effective_from)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, req.params.userId, reports_to, secondary_reports_to, department_id, position_id, location_id, cost_center_id, effective_from);
    }

    const hierarchy = db.prepare(`
      SELECT rh.*, u.name, d.name as department_name, p.title as position_title
      FROM reporting_hierarchy rh
      JOIN users u ON rh.user_id = u.id
      LEFT JOIN departments d ON rh.department_id = d.id
      LEFT JOIN positions p ON rh.position_id = p.id
      WHERE rh.user_id = ?
    `).get(req.params.userId);

    res.json(hierarchy);
  } catch (error) {
    console.error('Error updating hierarchy:', error);
    res.status(500).json({ error: 'Failed to update hierarchy' });
  }
});

// ==========================================
// EMPLOYEE PROFILES (EXTENDED)
// ==========================================

// Get my profile
router.get('/profile/my-profile', authenticateToken, (req, res) => {
  try {
    let profile = db.prepare(`
      SELECT ep.*, u.name, u.email, u.avatar, u.department, u.designation, u.role
      FROM employee_profiles ep
      RIGHT JOIN users u ON ep.user_id = u.id
      WHERE u.id = ?
    `).get(req.user.id);

    // Get hierarchy info
    const hierarchy = db.prepare(`
      SELECT rh.*, d.name as department_name, p.title as position_title,
             l.name as location_name, m.name as manager_name
      FROM reporting_hierarchy rh
      LEFT JOIN departments d ON rh.department_id = d.id
      LEFT JOIN positions p ON rh.position_id = p.id
      LEFT JOIN office_locations l ON rh.location_id = l.id
      LEFT JOIN users m ON rh.reports_to = m.id
      WHERE rh.user_id = ?
    `).get(req.user.id);

    res.json({ ...profile, hierarchy });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update my profile
router.put('/profile/my-profile', authenticateToken, (req, res) => {
  try {
    const { phone, personal_email, date_of_birth, gender, marital_status, blood_group, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, current_address, permanent_address, bio, linkedin_url, twitter_url, timezone, language_preference } = req.body;

    // Check if profile exists
    const existing = db.prepare('SELECT id FROM employee_profiles WHERE user_id = ?').get(req.user.id);

    if (existing) {
      db.prepare(`
        UPDATE employee_profiles SET phone = ?, personal_email = ?, date_of_birth = ?,
        gender = ?, marital_status = ?, blood_group = ?, emergency_contact_name = ?,
        emergency_contact_phone = ?, emergency_contact_relation = ?, current_address = ?,
        permanent_address = ?, bio = ?, linkedin_url = ?, twitter_url = ?,
        timezone = ?, language_preference = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(phone, personal_email, date_of_birth, gender, marital_status, blood_group, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, current_address, permanent_address, bio, linkedin_url, twitter_url, timezone, language_preference, req.user.id);
    } else {
      const id = `ep-${uuidv4()}`;
      db.prepare(`
        INSERT INTO employee_profiles (id, user_id, phone, personal_email, date_of_birth, gender, marital_status, blood_group, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, current_address, permanent_address, bio, linkedin_url, twitter_url, timezone, language_preference)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, req.user.id, phone, personal_email, date_of_birth, gender, marital_status, blood_group, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, current_address, permanent_address, bio, linkedin_url, twitter_url, timezone, language_preference);
    }

    res.json({ message: 'Profile updated' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get employee directory
router.get('/directory', authenticateToken, (req, res) => {
  try {
    const { department, location, search } = req.query;
    let query = `
      SELECT u.id, u.name, u.email, u.avatar, u.department, u.designation,
             ep.phone, ep.bio, d.name as dept_name, p.title as position_title,
             l.name as location_name
      FROM users u
      LEFT JOIN employee_profiles ep ON u.id = ep.user_id
      LEFT JOIN reporting_hierarchy rh ON u.id = rh.user_id
      LEFT JOIN departments d ON rh.department_id = d.id
      LEFT JOIN positions p ON rh.position_id = p.id
      LEFT JOIN office_locations l ON rh.location_id = l.id
      WHERE 1=1
    `;
    const params = [];

    if (department) {
      query += ' AND (u.department = ? OR d.name = ?)';
      params.push(department, department);
    }
    if (location) {
      query += ' AND l.id = ?';
      params.push(location);
    }
    if (search) {
      query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.designation LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ' ORDER BY u.name';

    const employees = db.prepare(query).all(...params);
    res.json(employees);
  } catch (error) {
    console.error('Error fetching directory:', error);
    res.status(500).json({ error: 'Failed to fetch directory' });
  }
});

// ==========================================
// ORGANIZATION DASHBOARD
// ==========================================

router.get('/dashboard', authenticateToken, isAdmin, (req, res) => {
  try {
    const stats = {
      totalEmployees: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      totalDepartments: db.prepare('SELECT COUNT(*) as count FROM departments WHERE is_active = 1').get().count,
      totalPositions: db.prepare('SELECT COUNT(*) as count FROM positions WHERE is_active = 1').get().count,
      totalLocations: db.prepare('SELECT COUNT(*) as count FROM office_locations WHERE is_active = 1').get().count,
      employeesByDepartment: db.prepare(`
        SELECT d.name, COUNT(rh.id) as count
        FROM departments d
        LEFT JOIN reporting_hierarchy rh ON d.id = rh.department_id
        WHERE d.is_active = 1
        GROUP BY d.id
        ORDER BY count DESC
      `).all(),
      employeesByLocation: db.prepare(`
        SELECT l.name, COUNT(rh.id) as count
        FROM office_locations l
        LEFT JOIN reporting_hierarchy rh ON l.id = rh.location_id
        WHERE l.is_active = 1
        GROUP BY l.id
        ORDER BY count DESC
      `).all(),
      employeesByLevel: db.prepare(`
        SELECT p.level, COUNT(rh.id) as count
        FROM positions p
        LEFT JOIN reporting_hierarchy rh ON p.id = rh.position_id
        WHERE p.is_active = 1
        GROUP BY p.level
        ORDER BY p.level DESC
      `).all(),
      recentJoiners: db.prepare(`
        SELECT u.id, u.name, u.email, u.department, u.designation, u.created_at
        FROM users u
        ORDER BY u.created_at DESC
        LIMIT 5
      `).all()
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
