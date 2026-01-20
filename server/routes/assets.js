const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// ==========================================
// ASSET CATEGORIES
// ==========================================

// Get all categories
router.get('/categories', authenticateToken, (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT ac.*, p.name as parent_name,
             (SELECT COUNT(*) FROM assets WHERE category_id = ac.id) as assets_count
      FROM asset_categories ac
      LEFT JOIN asset_categories p ON ac.parent_category_id = p.id
      WHERE ac.is_active = 1
      ORDER BY ac.name
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
    const { name, description, depreciation_rate, useful_life_years, parent_category_id } = req.body;

    const id = `ac-${uuidv4()}`;
    db.prepare(`
      INSERT INTO asset_categories (id, name, description, depreciation_rate, useful_life_years, parent_category_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, description, depreciation_rate || 0, useful_life_years, parent_category_id);

    const category = db.prepare('SELECT * FROM asset_categories WHERE id = ?').get(id);
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// ==========================================
// ASSETS
// ==========================================

// Get all assets
router.get('/', authenticateToken, (req, res) => {
  try {
    const { category_id, status, condition } = req.query;
    let query = `
      SELECT a.*, ac.name as category_name,
             (SELECT u.name FROM asset_assignments aa JOIN users u ON aa.user_id = u.id
              WHERE aa.asset_id = a.id AND aa.status = 'active' LIMIT 1) as assigned_to_name,
             (SELECT aa.user_id FROM asset_assignments aa
              WHERE aa.asset_id = a.id AND aa.status = 'active' LIMIT 1) as assigned_to_id
      FROM assets a
      JOIN asset_categories ac ON a.category_id = ac.id
      WHERE 1=1
    `;
    const params = [];

    if (category_id) {
      query += ' AND a.category_id = ?';
      params.push(category_id);
    }
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    if (condition) {
      query += ' AND a.condition = ?';
      params.push(condition);
    }

    query += ' ORDER BY a.created_at DESC';

    const assets = db.prepare(query).all(...params);
    res.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// Get single asset
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const asset = db.prepare(`
      SELECT a.*, ac.name as category_name
      FROM assets a
      JOIN asset_categories ac ON a.category_id = ac.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Get assignment history
    asset.assignments = db.prepare(`
      SELECT aa.*, u.name as user_name, ab.name as assigned_by_name
      FROM asset_assignments aa
      JOIN users u ON aa.user_id = u.id
      JOIN users ab ON aa.assigned_by = ab.id
      WHERE aa.asset_id = ?
      ORDER BY aa.assigned_at DESC
    `).all(req.params.id);

    // Get maintenance history
    asset.maintenance = db.prepare(`
      SELECT am.*, u.name as created_by_name
      FROM asset_maintenance am
      LEFT JOIN users u ON am.created_by = u.id
      WHERE am.asset_id = ?
      ORDER BY am.scheduled_date DESC
    `).all(req.params.id);

    res.json(asset);
  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

// Get my assigned assets
router.get('/assigned/my-assets', authenticateToken, (req, res) => {
  try {
    const assets = db.prepare(`
      SELECT a.*, ac.name as category_name, aa.assigned_at, ab.name as assigned_by_name
      FROM asset_assignments aa
      JOIN assets a ON aa.asset_id = a.id
      JOIN asset_categories ac ON a.category_id = ac.id
      JOIN users ab ON aa.assigned_by = ab.id
      WHERE aa.user_id = ? AND aa.status = 'active'
      ORDER BY aa.assigned_at DESC
    `).all(req.user.id);
    res.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// Create asset
router.post('/', authenticateToken, isAdmin, (req, res) => {
  try {
    const { asset_tag, name, category_id, description, brand, model, serial_number, purchase_date, purchase_cost, vendor, warranty_end_date, current_value, location, status, condition, notes } = req.body;

    const id = `asset-${uuidv4()}`;
    db.prepare(`
      INSERT INTO assets (id, asset_tag, name, category_id, description, brand, model, serial_number, purchase_date, purchase_cost, vendor, warranty_end_date, current_value, location, status, condition, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, asset_tag, name, category_id, description, brand, model, serial_number, purchase_date, purchase_cost, vendor, warranty_end_date, current_value || purchase_cost, location, status || 'available', condition || 'good', notes);

    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
    res.status(201).json(asset);
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

// Update asset
router.put('/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { name, category_id, description, brand, model, serial_number, purchase_date, purchase_cost, vendor, warranty_end_date, current_value, location, status, condition, notes } = req.body;

    db.prepare(`
      UPDATE assets SET name = ?, category_id = ?, description = ?, brand = ?, model = ?, serial_number = ?, purchase_date = ?, purchase_cost = ?, vendor = ?, warranty_end_date = ?, current_value = ?, location = ?, status = ?, condition = ?, notes = ?
      WHERE id = ?
    `).run(name, category_id, description, brand, model, serial_number, purchase_date, purchase_cost, vendor, warranty_end_date, current_value, location, status, condition, notes, req.params.id);

    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
    res.json(asset);
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

// ==========================================
// ASSET ASSIGNMENTS
// ==========================================

// Assign asset to user
router.post('/:id/assign', authenticateToken, isAdmin, (req, res) => {
  try {
    const { user_id, expected_return_date } = req.body;

    // Check if asset is available
    const asset = db.prepare('SELECT status FROM assets WHERE id = ?').get(req.params.id);
    if (asset.status === 'assigned') {
      return res.status(400).json({ error: 'Asset is already assigned' });
    }

    const assignmentId = `aa-${uuidv4()}`;
    db.prepare(`
      INSERT INTO asset_assignments (id, asset_id, user_id, assigned_by, expected_return_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(assignmentId, req.params.id, user_id, req.user.id, expected_return_date);

    // Update asset status
    db.prepare('UPDATE assets SET status = ? WHERE id = ?').run('assigned', req.params.id);

    res.json({ message: 'Asset assigned successfully' });
  } catch (error) {
    console.error('Error assigning asset:', error);
    res.status(500).json({ error: 'Failed to assign asset' });
  }
});

// Return asset
router.post('/:id/return', authenticateToken, isAdmin, (req, res) => {
  try {
    const { return_condition, return_notes } = req.body;

    // Get active assignment
    const assignment = db.prepare(`
      SELECT id FROM asset_assignments WHERE asset_id = ? AND status = 'active'
    `).get(req.params.id);

    if (!assignment) {
      return res.status(400).json({ error: 'Asset is not assigned' });
    }

    // Update assignment
    db.prepare(`
      UPDATE asset_assignments SET status = 'returned', returned_at = CURRENT_TIMESTAMP,
      return_condition = ?, return_notes = ? WHERE id = ?
    `).run(return_condition, return_notes, assignment.id);

    // Update asset
    db.prepare('UPDATE assets SET status = ?, condition = ? WHERE id = ?').run('available', return_condition || 'good', req.params.id);

    res.json({ message: 'Asset returned successfully' });
  } catch (error) {
    console.error('Error returning asset:', error);
    res.status(500).json({ error: 'Failed to return asset' });
  }
});

// ==========================================
// ASSET REQUESTS
// ==========================================

// Get all requests
router.get('/requests/all', authenticateToken, isAdmin, (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT ar.*, u.name as user_name, u.department, ac.name as category_name,
             a.name as asset_name, a.asset_tag, ap.name as approved_by_name
      FROM asset_requests ar
      JOIN users u ON ar.user_id = u.id
      LEFT JOIN asset_categories ac ON ar.category_id = ac.id
      LEFT JOIN assets a ON ar.asset_id = a.id
      LEFT JOIN users ap ON ar.approved_by = ap.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND ar.status = ?';
      params.push(status);
    }

    query += ' ORDER BY ar.created_at DESC';

    const requests = db.prepare(query).all(...params);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Get my requests
router.get('/requests/my-requests', authenticateToken, (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT ar.*, ac.name as category_name, a.name as asset_name, a.asset_tag,
             ap.name as approved_by_name
      FROM asset_requests ar
      LEFT JOIN asset_categories ac ON ar.category_id = ac.id
      LEFT JOIN assets a ON ar.asset_id = a.id
      LEFT JOIN users ap ON ar.approved_by = ap.id
      WHERE ar.user_id = ?
      ORDER BY ar.created_at DESC
    `).all(req.user.id);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Create asset request
router.post('/requests', authenticateToken, (req, res) => {
  try {
    const { category_id, asset_id, request_type, reason, urgency } = req.body;

    const id = `ar-${uuidv4()}`;
    db.prepare(`
      INSERT INTO asset_requests (id, user_id, category_id, asset_id, request_type, reason, urgency)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, category_id, asset_id, request_type || 'new', reason, urgency || 'normal');

    const request = db.prepare('SELECT * FROM asset_requests WHERE id = ?').get(id);
    res.status(201).json(request);
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// Process asset request
router.put('/requests/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { status, rejection_reason, asset_id } = req.body;

    db.prepare(`
      UPDATE asset_requests SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP,
      rejection_reason = ?, fulfilled_at = CASE WHEN ? = 'fulfilled' THEN CURRENT_TIMESTAMP ELSE NULL END
      WHERE id = ?
    `).run(status, req.user.id, rejection_reason, status, req.params.id);

    // If approved and asset specified, assign it
    if (status === 'approved' && asset_id) {
      const request = db.prepare('SELECT user_id FROM asset_requests WHERE id = ?').get(req.params.id);

      const assignmentId = `aa-${uuidv4()}`;
      db.prepare(`
        INSERT INTO asset_assignments (id, asset_id, user_id, assigned_by)
        VALUES (?, ?, ?, ?)
      `).run(assignmentId, asset_id, request.user_id, req.user.id);

      db.prepare('UPDATE assets SET status = ? WHERE id = ?').run('assigned', asset_id);
      db.prepare('UPDATE asset_requests SET status = ?, asset_id = ?, fulfilled_at = CURRENT_TIMESTAMP WHERE id = ?').run('fulfilled', asset_id, req.params.id);
    }

    const updatedRequest = db.prepare('SELECT * FROM asset_requests WHERE id = ?').get(req.params.id);
    res.json(updatedRequest);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// ==========================================
// ASSET MAINTENANCE
// ==========================================

// Get maintenance schedule
router.get('/maintenance/schedule', authenticateToken, isAdmin, (req, res) => {
  try {
    const maintenance = db.prepare(`
      SELECT am.*, a.name as asset_name, a.asset_tag, ac.name as category_name,
             u.name as created_by_name
      FROM asset_maintenance am
      JOIN assets a ON am.asset_id = a.id
      JOIN asset_categories ac ON a.category_id = ac.id
      LEFT JOIN users u ON am.created_by = u.id
      WHERE am.status IN ('scheduled', 'in_progress')
      ORDER BY am.scheduled_date
    `).all();
    res.json(maintenance);
  } catch (error) {
    console.error('Error fetching maintenance:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance' });
  }
});

// Schedule maintenance
router.post('/maintenance', authenticateToken, isAdmin, (req, res) => {
  try {
    const { asset_id, maintenance_type, description, scheduled_date, vendor, cost } = req.body;

    const id = `am-${uuidv4()}`;
    db.prepare(`
      INSERT INTO asset_maintenance (id, asset_id, maintenance_type, description, scheduled_date, vendor, cost, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, asset_id, maintenance_type, description, scheduled_date, vendor, cost, req.user.id);

    // Update asset status if needed
    if (maintenance_type === 'repair') {
      db.prepare('UPDATE assets SET status = ? WHERE id = ?').run('maintenance', asset_id);
    }

    const maintenance = db.prepare('SELECT * FROM asset_maintenance WHERE id = ?').get(id);
    res.status(201).json(maintenance);
  } catch (error) {
    console.error('Error creating maintenance:', error);
    res.status(500).json({ error: 'Failed to create maintenance' });
  }
});

// Complete maintenance
router.post('/maintenance/:id/complete', authenticateToken, isAdmin, (req, res) => {
  try {
    const { notes, cost } = req.body;

    const maintenance = db.prepare('SELECT asset_id FROM asset_maintenance WHERE id = ?').get(req.params.id);

    db.prepare(`
      UPDATE asset_maintenance SET status = 'completed', completed_date = date('now'),
      notes = ?, cost = COALESCE(?, cost) WHERE id = ?
    `).run(notes, cost, req.params.id);

    // Update asset status back to available
    db.prepare('UPDATE assets SET status = ? WHERE id = ?').run('available', maintenance.asset_id);

    res.json({ message: 'Maintenance completed' });
  } catch (error) {
    console.error('Error completing maintenance:', error);
    res.status(500).json({ error: 'Failed to complete maintenance' });
  }
});

// ==========================================
// SOFTWARE LICENSES
// ==========================================

// Get all licenses
router.get('/licenses/all', authenticateToken, (req, res) => {
  try {
    const licenses = db.prepare(`
      SELECT * FROM software_licenses ORDER BY software_name
    `).all();

    for (const license of licenses) {
      license.assignments = db.prepare(`
        SELECT la.*, u.name as user_name, u.department, ab.name as assigned_by_name
        FROM license_assignments la
        JOIN users u ON la.user_id = u.id
        JOIN users ab ON la.assigned_by = ab.id
        WHERE la.license_id = ? AND la.status = 'active'
      `).all(license.id);
    }

    res.json(licenses);
  } catch (error) {
    console.error('Error fetching licenses:', error);
    res.status(500).json({ error: 'Failed to fetch licenses' });
  }
});

// Get my licenses
router.get('/licenses/my-licenses', authenticateToken, (req, res) => {
  try {
    const licenses = db.prepare(`
      SELECT sl.*, la.assigned_at, ab.name as assigned_by_name
      FROM license_assignments la
      JOIN software_licenses sl ON la.license_id = sl.id
      JOIN users ab ON la.assigned_by = ab.id
      WHERE la.user_id = ? AND la.status = 'active'
      ORDER BY sl.software_name
    `).all(req.user.id);
    res.json(licenses);
  } catch (error) {
    console.error('Error fetching licenses:', error);
    res.status(500).json({ error: 'Failed to fetch licenses' });
  }
});

// Create license
router.post('/licenses', authenticateToken, isAdmin, (req, res) => {
  try {
    const { software_name, vendor, license_type, license_key, total_seats, purchase_date, expiry_date, cost, renewal_cost, notes } = req.body;

    const id = `lic-${uuidv4()}`;
    db.prepare(`
      INSERT INTO software_licenses (id, software_name, vendor, license_type, license_key, total_seats, purchase_date, expiry_date, cost, renewal_cost, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, software_name, vendor, license_type || 'perpetual', license_key, total_seats || 1, purchase_date, expiry_date, cost, renewal_cost, notes);

    const license = db.prepare('SELECT * FROM software_licenses WHERE id = ?').get(id);
    res.status(201).json(license);
  } catch (error) {
    console.error('Error creating license:', error);
    res.status(500).json({ error: 'Failed to create license' });
  }
});

// Assign license
router.post('/licenses/:id/assign', authenticateToken, isAdmin, (req, res) => {
  try {
    const { user_id } = req.body;

    // Check available seats
    const license = db.prepare('SELECT total_seats, used_seats FROM software_licenses WHERE id = ?').get(req.params.id);
    if (license.used_seats >= license.total_seats) {
      return res.status(400).json({ error: 'No available seats' });
    }

    // Check if already assigned
    const existing = db.prepare('SELECT id FROM license_assignments WHERE license_id = ? AND user_id = ? AND status = ?').get(req.params.id, user_id, 'active');
    if (existing) {
      return res.status(400).json({ error: 'License already assigned to user' });
    }

    const assignmentId = `la-${uuidv4()}`;
    db.prepare(`
      INSERT INTO license_assignments (id, license_id, user_id, assigned_by)
      VALUES (?, ?, ?, ?)
    `).run(assignmentId, req.params.id, user_id, req.user.id);

    // Update used seats
    db.prepare('UPDATE software_licenses SET used_seats = used_seats + 1 WHERE id = ?').run(req.params.id);

    res.json({ message: 'License assigned' });
  } catch (error) {
    console.error('Error assigning license:', error);
    res.status(500).json({ error: 'Failed to assign license' });
  }
});

// Revoke license
router.post('/licenses/:id/revoke', authenticateToken, isAdmin, (req, res) => {
  try {
    const { user_id } = req.body;

    db.prepare(`
      UPDATE license_assignments SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP
      WHERE license_id = ? AND user_id = ? AND status = 'active'
    `).run(req.params.id, user_id);

    // Update used seats
    db.prepare('UPDATE software_licenses SET used_seats = used_seats - 1 WHERE id = ? AND used_seats > 0').run(req.params.id);

    res.json({ message: 'License revoked' });
  } catch (error) {
    console.error('Error revoking license:', error);
    res.status(500).json({ error: 'Failed to revoke license' });
  }
});

// ==========================================
// ASSETS DASHBOARD
// ==========================================

router.get('/dashboard', authenticateToken, isAdmin, (req, res) => {
  try {
    const stats = {
      totalAssets: db.prepare('SELECT COUNT(*) as count FROM assets').get().count,
      availableAssets: db.prepare('SELECT COUNT(*) as count FROM assets WHERE status = ?').get('available').count,
      assignedAssets: db.prepare('SELECT COUNT(*) as count FROM assets WHERE status = ?').get('assigned').count,
      maintenanceAssets: db.prepare('SELECT COUNT(*) as count FROM assets WHERE status = ?').get('maintenance').count,
      pendingRequests: db.prepare('SELECT COUNT(*) as count FROM asset_requests WHERE status = ?').get('pending').count,
      upcomingMaintenance: db.prepare(`
        SELECT COUNT(*) as count FROM asset_maintenance
        WHERE status = 'scheduled' AND scheduled_date BETWEEN date('now') AND date('now', '+30 days')
      `).get().count,
      totalAssetValue: db.prepare('SELECT SUM(current_value) as total FROM assets').get().total || 0,
      assetsByCategory: db.prepare(`
        SELECT ac.name, COUNT(a.id) as count
        FROM asset_categories ac
        LEFT JOIN assets a ON ac.id = a.category_id
        WHERE ac.is_active = 1
        GROUP BY ac.id
      `).all(),
      licensesExpiringSoon: db.prepare(`
        SELECT COUNT(*) as count FROM software_licenses
        WHERE expiry_date BETWEEN date('now') AND date('now', '+90 days')
      `).get().count,
      totalLicenses: db.prepare('SELECT COUNT(*) as count FROM software_licenses WHERE status = ?').get('active').count
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
