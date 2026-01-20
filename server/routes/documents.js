const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// ==========================================
// DOCUMENT CATEGORIES
// ==========================================

// Get all document categories
router.get('/categories', authenticateToken, (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT dc.*, p.name as parent_name,
             (SELECT COUNT(*) FROM documents WHERE category_id = dc.id AND status = 'active') as documents_count
      FROM document_categories dc
      LEFT JOIN document_categories p ON dc.parent_category_id = p.id
      WHERE dc.is_active = 1
      ORDER BY dc.name
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
    const { name, description, parent_category_id, access_level, retention_days } = req.body;

    const id = `dc-${uuidv4()}`;
    db.prepare(`
      INSERT INTO document_categories (id, name, description, parent_category_id, access_level, retention_days)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, description, parent_category_id, access_level || 'all', retention_days);

    const category = db.prepare('SELECT * FROM document_categories WHERE id = ?').get(id);
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// ==========================================
// DOCUMENTS
// ==========================================

// Get all documents (with access control)
router.get('/', authenticateToken, (req, res) => {
  try {
    const { category_id, is_template, search } = req.query;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    let query = `
      SELECT d.*, dc.name as category_name, o.name as owner_name, o.department as owner_department
      FROM documents d
      LEFT JOIN document_categories dc ON d.category_id = dc.id
      JOIN users o ON d.owner_id = o.id
      WHERE d.status = 'active'
        AND (
          d.access_type = 'public'
          OR d.owner_id = ?
          OR EXISTS (SELECT 1 FROM document_shares ds WHERE ds.document_id = d.id AND ds.shared_with_user_id = ?)
          ${isAdmin ? "OR 1=1" : ""}
        )
    `;
    const params = [userId, userId];

    if (category_id) {
      query += ' AND d.category_id = ?';
      params.push(category_id);
    }
    if (is_template === 'true') {
      query += ' AND d.is_template = 1';
    }
    if (search) {
      query += ' AND (d.title LIKE ? OR d.description LIKE ? OR d.tags LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ' ORDER BY d.updated_at DESC';

    const documents = db.prepare(query).all(...params);
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get my documents
router.get('/my-documents', authenticateToken, (req, res) => {
  try {
    const documents = db.prepare(`
      SELECT d.*, dc.name as category_name
      FROM documents d
      LEFT JOIN document_categories dc ON d.category_id = dc.id
      WHERE d.owner_id = ? AND d.status = 'active'
      ORDER BY d.updated_at DESC
    `).all(req.user.id);
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get shared with me
router.get('/shared-with-me', authenticateToken, (req, res) => {
  try {
    const documents = db.prepare(`
      SELECT d.*, dc.name as category_name, o.name as owner_name,
             ds.permission, ds.shared_by, sb.name as shared_by_name
      FROM document_shares ds
      JOIN documents d ON ds.document_id = d.id
      LEFT JOIN document_categories dc ON d.category_id = dc.id
      JOIN users o ON d.owner_id = o.id
      JOIN users sb ON ds.shared_by = sb.id
      WHERE ds.shared_with_user_id = ? AND d.status = 'active'
        AND (ds.expires_at IS NULL OR ds.expires_at > datetime('now'))
      ORDER BY ds.created_at DESC
    `).all(req.user.id);
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get single document
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const document = db.prepare(`
      SELECT d.*, dc.name as category_name, o.name as owner_name
      FROM documents d
      LEFT JOIN document_categories dc ON d.category_id = dc.id
      JOIN users o ON d.owner_id = o.id
      WHERE d.id = ?
    `).get(req.params.id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access
    const hasAccess = document.access_type === 'public' ||
      document.owner_id === req.user.id ||
      req.user.role === 'admin' ||
      db.prepare('SELECT 1 FROM document_shares WHERE document_id = ? AND shared_with_user_id = ?').get(req.params.id, req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get shares
    document.shares = db.prepare(`
      SELECT ds.*, u.name as shared_with_name, sb.name as shared_by_name
      FROM document_shares ds
      LEFT JOIN users u ON ds.shared_with_user_id = u.id
      JOIN users sb ON ds.shared_by = sb.id
      WHERE ds.document_id = ?
    `).all(req.params.id);

    // Get signatures if required
    if (document.requires_signature) {
      document.signatures = db.prepare(`
        SELECT ds.*, u.name as signer_name
        FROM document_signatures ds
        JOIN users u ON ds.signer_id = u.id
        WHERE ds.document_id = ?
        ORDER BY ds.order_index
      `).all(req.params.id);
    }

    // Get version history
    document.versions = db.prepare(`
      SELECT d.id, d.version, d.created_at, o.name as owner_name
      FROM documents d
      JOIN users o ON d.owner_id = o.id
      WHERE d.id = ? OR d.parent_document_id = ?
      ORDER BY d.version DESC
    `).all(req.params.id, req.params.id);

    // Log access
    db.prepare(`
      INSERT INTO document_access_log (id, document_id, user_id, action)
      VALUES (?, ?, ?, 'view')
    `).run(`dal-${uuidv4()}`, req.params.id, req.user.id);

    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Upload document
router.post('/', authenticateToken, (req, res) => {
  try {
    const { title, description, category_id, file_url, file_name, file_type, file_size, access_type, department_access, tags, is_template, requires_signature } = req.body;

    const id = `doc-${uuidv4()}`;
    db.prepare(`
      INSERT INTO documents (id, title, description, category_id, file_url, file_name, file_type, file_size, owner_id, access_type, department_access, tags, is_template, requires_signature)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description, category_id, file_url, file_name, file_type, file_size, req.user.id, access_type || 'private', department_access, tags, is_template ? 1 : 0, requires_signature ? 1 : 0);

    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Update document
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { title, description, category_id, access_type, department_access, tags } = req.body;

    // Verify ownership
    const doc = db.prepare('SELECT owner_id FROM documents WHERE id = ?').get(req.params.id);
    if (doc.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.prepare(`
      UPDATE documents SET title = ?, description = ?, category_id = ?,
      access_type = ?, department_access = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, description, category_id, access_type, department_access, tags, req.params.id);

    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
    res.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Upload new version
router.post('/:id/version', authenticateToken, (req, res) => {
  try {
    const { file_url, file_name, file_type, file_size } = req.body;

    // Get current document
    const current = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
    if (current.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create new version
    const newId = `doc-${uuidv4()}`;
    db.prepare(`
      INSERT INTO documents (id, title, description, category_id, file_url, file_name, file_type, file_size, version, parent_document_id, owner_id, access_type, department_access, tags, is_template, requires_signature)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(newId, current.title, current.description, current.category_id, file_url, file_name, file_type, file_size, current.version + 1, req.params.id, req.user.id, current.access_type, current.department_access, current.tags, current.is_template, current.requires_signature);

    // Archive old version
    db.prepare('UPDATE documents SET status = ? WHERE id = ?').run('archived', req.params.id);

    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(newId);
    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating version:', error);
    res.status(500).json({ error: 'Failed to create version' });
  }
});

// Delete document
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const doc = db.prepare('SELECT owner_id FROM documents WHERE id = ?').get(req.params.id);
    if (doc.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.prepare('UPDATE documents SET status = ?, archived_at = CURRENT_TIMESTAMP WHERE id = ?').run('archived', req.params.id);
    res.json({ message: 'Document deleted' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// ==========================================
// DOCUMENT SHARING
// ==========================================

// Share document
router.post('/:id/share', authenticateToken, (req, res) => {
  try {
    const { shared_with_user_id, shared_with_department, permission, expires_at } = req.body;

    // Verify ownership
    const doc = db.prepare('SELECT owner_id FROM documents WHERE id = ?').get(req.params.id);
    if (doc.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const id = `ds-${uuidv4()}`;
    db.prepare(`
      INSERT INTO document_shares (id, document_id, shared_with_user_id, shared_with_department, permission, shared_by, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, shared_with_user_id, shared_with_department, permission || 'view', req.user.id, expires_at);

    res.json({ message: 'Document shared' });
  } catch (error) {
    console.error('Error sharing document:', error);
    res.status(500).json({ error: 'Failed to share document' });
  }
});

// Remove share
router.delete('/shares/:id', authenticateToken, (req, res) => {
  try {
    const share = db.prepare(`
      SELECT ds.*, d.owner_id FROM document_shares ds
      JOIN documents d ON ds.document_id = d.id
      WHERE ds.id = ?
    `).get(req.params.id);

    if (share.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.prepare('DELETE FROM document_shares WHERE id = ?').run(req.params.id);
    res.json({ message: 'Share removed' });
  } catch (error) {
    console.error('Error removing share:', error);
    res.status(500).json({ error: 'Failed to remove share' });
  }
});

// ==========================================
// E-SIGNATURES
// ==========================================

// Request signature
router.post('/:id/signatures', authenticateToken, (req, res) => {
  try {
    const { signers } = req.body; // Array of { signer_id, order_index }

    // Verify ownership
    const doc = db.prepare('SELECT owner_id FROM documents WHERE id = ?').get(req.params.id);
    if (doc.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mark document as requiring signature
    db.prepare('UPDATE documents SET requires_signature = 1 WHERE id = ?').run(req.params.id);

    // Add signature requests
    const insertSig = db.prepare(`
      INSERT INTO document_signatures (id, document_id, signer_id, order_index)
      VALUES (?, ?, ?, ?)
    `);

    for (const signer of signers) {
      insertSig.run(`sig-${uuidv4()}`, req.params.id, signer.signer_id, signer.order_index || 0);
    }

    res.json({ message: 'Signature requests created' });
  } catch (error) {
    console.error('Error requesting signatures:', error);
    res.status(500).json({ error: 'Failed to request signatures' });
  }
});

// Sign document
router.post('/signatures/:id/sign', authenticateToken, (req, res) => {
  try {
    const { notes } = req.body;

    const signature = db.prepare('SELECT * FROM document_signatures WHERE id = ?').get(req.params.id);
    if (signature.signer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to sign' });
    }
    if (signature.status !== 'pending') {
      return res.status(400).json({ error: 'Signature already processed' });
    }

    // Check if previous signers have signed (if order matters)
    const pendingBefore = db.prepare(`
      SELECT COUNT(*) as count FROM document_signatures
      WHERE document_id = ? AND order_index < ? AND status = 'pending'
    `).get(signature.document_id, signature.order_index);

    if (pendingBefore.count > 0) {
      return res.status(400).json({ error: 'Waiting for previous signers' });
    }

    db.prepare(`
      UPDATE document_signatures SET status = 'signed', signed_at = CURRENT_TIMESTAMP, notes = ?
      WHERE id = ?
    `).run(notes, req.params.id);

    res.json({ message: 'Document signed' });
  } catch (error) {
    console.error('Error signing document:', error);
    res.status(500).json({ error: 'Failed to sign document' });
  }
});

// Decline signature
router.post('/signatures/:id/decline', authenticateToken, (req, res) => {
  try {
    const { notes } = req.body;

    const signature = db.prepare('SELECT * FROM document_signatures WHERE id = ?').get(req.params.id);
    if (signature.signer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.prepare(`
      UPDATE document_signatures SET status = 'declined', signed_at = CURRENT_TIMESTAMP, notes = ?
      WHERE id = ?
    `).run(notes, req.params.id);

    res.json({ message: 'Signature declined' });
  } catch (error) {
    console.error('Error declining signature:', error);
    res.status(500).json({ error: 'Failed to decline signature' });
  }
});

// Get pending signatures
router.get('/signatures/pending', authenticateToken, (req, res) => {
  try {
    const signatures = db.prepare(`
      SELECT ds.*, d.title as document_title, d.file_url, o.name as owner_name
      FROM document_signatures ds
      JOIN documents d ON ds.document_id = d.id
      JOIN users o ON d.owner_id = o.id
      WHERE ds.signer_id = ? AND ds.status = 'pending'
      ORDER BY ds.created_at
    `).all(req.user.id);
    res.json(signatures);
  } catch (error) {
    console.error('Error fetching signatures:', error);
    res.status(500).json({ error: 'Failed to fetch signatures' });
  }
});

// ==========================================
// POLICIES
// ==========================================

// Get all policies
router.get('/policies/all', authenticateToken, (req, res) => {
  try {
    const policies = db.prepare(`
      SELECT p.*, d.title as document_title, d.file_url, cb.name as created_by_name, ab.name as approved_by_name,
             (SELECT COUNT(*) FROM policy_acknowledgments WHERE policy_id = p.id) as acknowledgments_count
      FROM policies p
      LEFT JOIN documents d ON p.document_id = d.id
      LEFT JOIN users cb ON p.created_by = cb.id
      LEFT JOIN users ab ON p.approved_by = ab.id
      WHERE p.status = 'published'
      ORDER BY p.effective_date DESC
    `).all();
    res.json(policies);
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

// Get policy for acknowledgment
router.get('/policies/:id', authenticateToken, (req, res) => {
  try {
    const policy = db.prepare(`
      SELECT p.*, d.title as document_title, d.file_url, d.file_name
      FROM policies p
      LEFT JOIN documents d ON p.document_id = d.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    // Check if user acknowledged
    const ack = db.prepare(`
      SELECT * FROM policy_acknowledgments WHERE policy_id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    policy.acknowledged = !!ack;
    policy.acknowledged_at = ack?.acknowledged_at;

    res.json(policy);
  } catch (error) {
    console.error('Error fetching policy:', error);
    res.status(500).json({ error: 'Failed to fetch policy' });
  }
});

// Create policy
router.post('/policies', authenticateToken, isAdmin, (req, res) => {
  try {
    const { title, category, description, content, document_id, version, effective_date, review_date, requires_acknowledgment } = req.body;

    const id = `pol-${uuidv4()}`;
    db.prepare(`
      INSERT INTO policies (id, title, category, description, content, document_id, version, effective_date, review_date, requires_acknowledgment, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, category, description, content, document_id, version, effective_date, review_date, requires_acknowledgment ? 1 : 0, req.user.id);

    const policy = db.prepare('SELECT * FROM policies WHERE id = ?').get(id);
    res.status(201).json(policy);
  } catch (error) {
    console.error('Error creating policy:', error);
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

// Publish policy
router.post('/policies/:id/publish', authenticateToken, isAdmin, (req, res) => {
  try {
    db.prepare(`
      UPDATE policies SET status = 'published', approved_by = ?, approved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user.id, req.params.id);
    res.json({ message: 'Policy published' });
  } catch (error) {
    console.error('Error publishing policy:', error);
    res.status(500).json({ error: 'Failed to publish policy' });
  }
});

// Acknowledge policy
router.post('/policies/:id/acknowledge', authenticateToken, (req, res) => {
  try {
    // Check if already acknowledged
    const existing = db.prepare('SELECT id FROM policy_acknowledgments WHERE policy_id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (existing) {
      return res.status(400).json({ error: 'Already acknowledged' });
    }

    const id = `pa-${uuidv4()}`;
    db.prepare(`
      INSERT INTO policy_acknowledgments (id, policy_id, user_id)
      VALUES (?, ?, ?)
    `).run(id, req.params.id, req.user.id);

    res.json({ message: 'Policy acknowledged' });
  } catch (error) {
    console.error('Error acknowledging policy:', error);
    res.status(500).json({ error: 'Failed to acknowledge policy' });
  }
});

// Get pending acknowledgments
router.get('/policies/acknowledgments/pending', authenticateToken, (req, res) => {
  try {
    const pending = db.prepare(`
      SELECT p.id, p.title, p.category, p.effective_date
      FROM policies p
      WHERE p.status = 'published' AND p.requires_acknowledgment = 1
        AND NOT EXISTS (
          SELECT 1 FROM policy_acknowledgments pa WHERE pa.policy_id = p.id AND pa.user_id = ?
        )
      ORDER BY p.effective_date DESC
    `).all(req.user.id);
    res.json(pending);
  } catch (error) {
    console.error('Error fetching pending:', error);
    res.status(500).json({ error: 'Failed to fetch pending acknowledgments' });
  }
});

// ==========================================
// DOCUMENT TEMPLATES
// ==========================================

// Get templates
router.get('/templates/all', authenticateToken, (req, res) => {
  try {
    const templates = db.prepare(`
      SELECT d.*, dc.name as category_name, o.name as owner_name
      FROM documents d
      LEFT JOIN document_categories dc ON d.category_id = dc.id
      JOIN users o ON d.owner_id = o.id
      WHERE d.is_template = 1 AND d.status = 'active'
      ORDER BY d.title
    `).all();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// ==========================================
// DOCUMENTS DASHBOARD
// ==========================================

router.get('/dashboard', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const myStats = {
      myDocuments: db.prepare('SELECT COUNT(*) as count FROM documents WHERE owner_id = ? AND status = ?').get(userId, 'active').count,
      sharedWithMe: db.prepare(`
        SELECT COUNT(*) as count FROM document_shares WHERE shared_with_user_id = ?
      `).get(userId).count,
      pendingSignatures: db.prepare(`
        SELECT COUNT(*) as count FROM document_signatures WHERE signer_id = ? AND status = 'pending'
      `).get(userId).count,
      pendingAcknowledgments: db.prepare(`
        SELECT COUNT(*) as count FROM policies p
        WHERE p.status = 'published' AND p.requires_acknowledgment = 1
        AND NOT EXISTS (SELECT 1 FROM policy_acknowledgments pa WHERE pa.policy_id = p.id AND pa.user_id = ?)
      `).get(userId).count
    };

    let orgStats = null;
    if (isAdmin) {
      orgStats = {
        totalDocuments: db.prepare('SELECT COUNT(*) as count FROM documents WHERE status = ?').get('active').count,
        totalTemplates: db.prepare('SELECT COUNT(*) as count FROM documents WHERE is_template = 1 AND status = ?').get('active').count,
        publishedPolicies: db.prepare('SELECT COUNT(*) as count FROM policies WHERE status = ?').get('published').count,
        pendingSignatureRequests: db.prepare(`
          SELECT COUNT(*) as count FROM document_signatures WHERE status = 'pending'
        `).get().count,
        recentDocuments: db.prepare(`
          SELECT d.id, d.title, d.file_type, o.name as owner_name, d.created_at
          FROM documents d
          JOIN users o ON d.owner_id = o.id
          WHERE d.status = 'active'
          ORDER BY d.created_at DESC
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
