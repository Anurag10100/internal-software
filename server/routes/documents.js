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
// DOCUMENT CATEGORIES
// ==========================================

router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const { data: categories, error } = await req.supabase
      .from('document_categories')
      .select('*, parent:document_categories!parent_category_id(name)')
      .eq('is_active', 1)
      .order('name');
    if (error) throw error;
    const list = categories || [];
    const categoryIds = list.map((c) => c.id);
    const { data: docCounts } = categoryIds.length ? await req.supabase.from('documents').select('category_id').eq('status', 'active').in('category_id', categoryIds) : { data: [] };
    const countByCat = (docCounts || []).reduce((acc, r) => { if (r.category_id) acc[r.category_id] = (acc[r.category_id] || 0) + 1; return acc; }, {});
    const formatted = list.map((c) => ({
      ...c,
      parent_name: c.parent?.name,
      documents_count: countByCat[c.id] || 0,
      parent: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/categories', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, description, parent_category_id, access_level, retention_days } = req.body;
    const id = `dc-${uuidv4()}`;
    const { error } = await req.supabase.from('document_categories').insert({
      id, name, description, parent_category_id, access_level: access_level || 'all', retention_days,
    });
    if (error) throw error;
    const { data: category, error: e2 } = await req.supabase.from('document_categories').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// ==========================================
// DOCUMENTS
// ==========================================

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category_id, is_template, search } = req.query;
    const userId = req.user.id;
    const isAdminUser = req.user.role === 'admin';
    let documentIds = [];
    if (isAdminUser) {
      const { data: all } = await req.supabase.from('documents').select('id').eq('status', 'active');
      documentIds = (all || []).map((d) => d.id);
    } else {
      const [publicDocs, ownedDocs, sharedDocs] = await Promise.all([
        req.supabase.from('documents').select('id').eq('status', 'active').eq('access_type', 'public'),
        req.supabase.from('documents').select('id').eq('status', 'active').eq('owner_id', userId),
        req.supabase.from('document_shares').select('document_id').eq('shared_with_user_id', userId),
      ]);
      const ids = new Set([
        ...(publicDocs.data || []).map((d) => d.id),
        ...(ownedDocs.data || []).map((d) => d.id),
        ...(sharedDocs.data || []).map((d) => d.document_id),
      ]);
      documentIds = [...ids];
    }
    if (!documentIds.length) return res.json([]);
    let q = req.supabase
      .from('documents')
      .select('*, category:document_categories!category_id(name), owner:users!owner_id(name, department)')
      .eq('status', 'active')
      .in('id', documentIds)
      .order('updated_at', { ascending: false });
    if (category_id) q = q.eq('category_id', category_id);
    if (is_template === 'true') q = q.eq('is_template', 1);
    if (search) q = q.or(`title.ilike.%${search}%,description.ilike.%${search}%,tags.ilike.%${search}%`);
    const { data: documents, error } = await q;
    if (error) throw error;
    const formatted = (documents || []).map((d) => ({
      ...d,
      category_name: d.category?.name,
      owner_name: d.owner?.name,
      owner_department: d.owner?.department,
      category: undefined,
      owner: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

router.get('/my-documents', authenticateToken, async (req, res) => {
  try {
    const { data: documents, error } = await req.supabase
      .from('documents')
      .select('*, category:document_categories!category_id(name)')
      .eq('owner_id', req.user.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    const formatted = (documents || []).map((d) => ({ ...d, category_name: d.category?.name, category: undefined }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

router.get('/shared-with-me', authenticateToken, async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { data: shares, error: se } = await req.supabase
      .from('document_shares')
      .select('document_id, permission, shared_by')
      .eq('shared_with_user_id', req.user.id);
    if (se) throw se;
    const docIds = [...new Set((shares.data || []).map((s) => s.document_id))];
    if (!docIds.length) return res.json([]);
    const { data: documents, error } = await req.supabase
      .from('documents')
      .select('*, category:document_categories!category_id(name), owner:users!owner_id(name)')
      .in('id', docIds)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    const shareByDoc = new Map((shares.data || []).map((s) => [s.document_id, s]));
    const sharedByIds = [...new Set((shares.data || []).map((s) => s.shared_by))];
    const { data: sharedByUsers } = sharedByIds.length ? await req.supabase.from('users').select('id, name').in('id', sharedByIds) : { data: [] };
    const sharedByName = new Map((sharedByUsers || []).map((u) => [u.id, u.name]));
    const formatted = (documents || []).map((d) => {
      const s = shareByDoc.get(d.id);
      return {
        ...d,
        category_name: d.category?.name,
        owner_name: d.owner?.name,
        permission: s?.permission,
        shared_by: s?.shared_by,
        shared_by_name: s ? sharedByName.get(s.shared_by) : null,
        category: undefined,
        owner: undefined,
      };
    });
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data: document, error } = await req.supabase
      .from('documents')
      .select('*, category:document_categories!category_id(name), owner:users!owner_id(name)')
      .eq('id', req.params.id)
      .single();
    if (error || !document) {
      if (error?.code === 'PGRST116') return res.status(404).json({ error: 'Document not found' });
      throw error || new Error('Not found');
    }
    const hasAccess = document.access_type === 'public' || document.owner_id === req.user.id || req.user.role === 'admin';
    if (!hasAccess) {
      const { data: share } = await req.supabase.from('document_shares').select('id').eq('document_id', req.params.id).eq('shared_with_user_id', req.user.id).maybeSingle();
      if (!share) return res.status(403).json({ error: 'Access denied' });
    }
    const category_name = document.category?.name;
    const owner_name = document.owner?.name;
    delete document.category;
    delete document.owner;
    const { data: shares } = await req.supabase
      .from('document_shares')
      .select('*, shared_with_user:users!shared_with_user_id(name), shared_by_user:users!shared_by(name)')
      .eq('document_id', req.params.id);
    document.shares = (shares || []).map((s) => ({
      ...s,
      shared_with_name: s.shared_with_user?.name,
      shared_by_name: s.shared_by_user?.name,
      shared_with_user: undefined,
      shared_by_user: undefined,
    }));
    if (document.requires_signature) {
      const { data: sigs } = await req.supabase
        .from('document_signatures')
        .select('*, signer:users!signer_id(name)')
        .eq('document_id', req.params.id)
        .order('order_index');
      document.signatures = (sigs || []).map((s) => ({ ...s, signer_name: s.signer?.name, signer: undefined }));
    }
    const { data: versions } = await req.supabase
      .from('documents')
      .select('id, version, created_at, owner_id')
      .or(`id.eq.${req.params.id},parent_document_id.eq.${req.params.id}`)
      .order('version', { ascending: false });
    const ownerIds = [...new Set((versions || []).map((v) => v.owner_id))];
    const { data: owners } = ownerIds.length ? await req.supabase.from('users').select('id, name').in('id', ownerIds) : { data: [] };
    const ownerByName = new Map((owners || []).map((u) => [u.id, u.name]));
    document.versions = (versions || []).map((v) => ({ ...v, owner_name: ownerByName.get(v.owner_id), owner_id: undefined }));
    await req.supabase.from('document_access_log').insert({ id: `dal-${uuidv4()}`, document_id: req.params.id, user_id: req.user.id, action: 'view' });
    res.json({ ...document, category_name, owner_name });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, category_id, file_url, file_name, file_type, file_size, access_type, department_access, tags, is_template, requires_signature } = req.body;
    const id = `doc-${uuidv4()}`;
    const { error } = await req.supabase.from('documents').insert({
      id, title, description, category_id, file_url, file_name, file_type, file_size, owner_id: req.user.id, access_type: access_type || 'private', department_access, tags, is_template: is_template ? 1 : 0, requires_signature: requires_signature ? 1 : 0,
    });
    if (error) throw error;
    const { data: document, error: e2 } = await req.supabase.from('documents').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, category_id, access_type, department_access, tags } = req.body;
    const { data: doc, error: fe } = await req.supabase.from('documents').select('owner_id').eq('id', req.params.id).single();
    if (fe || !doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.owner_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
    const { error } = await req.supabase.from('documents').update({
      title, description, category_id, access_type, department_access, tags, updated_at: new Date().toISOString(),
    }).eq('id', req.params.id);
    if (error) throw error;
    const { data: document, error: e2 } = await req.supabase.from('documents').select('*').eq('id', req.params.id).single();
    if (e2) throw e2;
    res.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

router.post('/:id/version', authenticateToken, async (req, res) => {
  try {
    const { file_url, file_name, file_type, file_size } = req.body;
    const { data: current, error: fe } = await req.supabase.from('documents').select('*').eq('id', req.params.id).single();
    if (fe || !current) return res.status(404).json({ error: 'Document not found' });
    if (current.owner_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
    const newId = `doc-${uuidv4()}`;
    const { error } = await req.supabase.from('documents').insert({
      id: newId, title: current.title, description: current.description, category_id: current.category_id, file_url, file_name, file_type, file_size, version: (current.version || 1) + 1, parent_document_id: req.params.id, owner_id: req.user.id, access_type: current.access_type, department_access: current.department_access, tags: current.tags, is_template: current.is_template, requires_signature: current.requires_signature,
    });
    if (error) throw error;
    await req.supabase.from('documents').update({ status: 'archived', archived_at: new Date().toISOString() }).eq('id', req.params.id);
    const { data: document, error: e2 } = await req.supabase.from('documents').select('*').eq('id', newId).single();
    if (e2) throw e2;
    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating version:', error);
    res.status(500).json({ error: 'Failed to create version' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { data: doc, error: fe } = await req.supabase.from('documents').select('owner_id').eq('id', req.params.id).single();
    if (fe || !doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.owner_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
    const { error } = await req.supabase.from('documents').update({ status: 'archived', archived_at: new Date().toISOString() }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Document deleted' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// ==========================================
// DOCUMENT SHARING
// ==========================================

router.post('/:id/share', authenticateToken, async (req, res) => {
  try {
    const { shared_with_user_id, shared_with_department, permission, expires_at } = req.body;
    const { data: doc, error: fe } = await req.supabase.from('documents').select('owner_id').eq('id', req.params.id).single();
    if (fe || !doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.owner_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
    const id = `ds-${uuidv4()}`;
    const { error } = await req.supabase.from('document_shares').insert({
      id, document_id: req.params.id, shared_with_user_id, shared_with_department, permission: permission || 'view', shared_by: req.user.id, expires_at,
    });
    if (error) throw error;
    res.json({ message: 'Document shared' });
  } catch (error) {
    console.error('Error sharing document:', error);
    res.status(500).json({ error: 'Failed to share document' });
  }
});

router.delete('/shares/:id', authenticateToken, async (req, res) => {
  try {
    const { data: share, error: fe } = await req.supabase.from('document_shares').select('*, document:documents!document_id(owner_id)').eq('id', req.params.id).single();
    if (fe || !share) return res.status(404).json({ error: 'Share not found' });
    const ownerId = share.document?.owner_id;
    if (ownerId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
    await req.supabase.from('document_shares').delete().eq('id', req.params.id);
    res.json({ message: 'Share removed' });
  } catch (error) {
    console.error('Error removing share:', error);
    res.status(500).json({ error: 'Failed to remove share' });
  }
});

// ==========================================
// E-SIGNATURES
// ==========================================

router.post('/:id/signatures', authenticateToken, async (req, res) => {
  try {
    const { signers } = req.body;
    const { data: doc, error: fe } = await req.supabase.from('documents').select('owner_id').eq('id', req.params.id).single();
    if (fe || !doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.owner_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
    await req.supabase.from('documents').update({ requires_signature: 1 }).eq('id', req.params.id);
    const rows = (signers || []).map((s) => ({ id: `sig-${uuidv4()}`, document_id: req.params.id, signer_id: s.signer_id, order_index: s.order_index || 0 }));
    if (rows.length) await req.supabase.from('document_signatures').insert(rows);
    res.json({ message: 'Signature requests created' });
  } catch (error) {
    console.error('Error requesting signatures:', error);
    res.status(500).json({ error: 'Failed to request signatures' });
  }
});

router.post('/signatures/:id/sign', authenticateToken, async (req, res) => {
  try {
    const { notes } = req.body;
    const { data: signature, error: fe } = await req.supabase.from('document_signatures').select('*').eq('id', req.params.id).single();
    if (fe || !signature) return res.status(404).json({ error: 'Signature not found' });
    if (signature.signer_id !== req.user.id) return res.status(403).json({ error: 'Not authorized to sign' });
    if (signature.status !== 'pending') return res.status(400).json({ error: 'Signature already processed' });
    const { data: pendingBefore } = await req.supabase.from('document_signatures').select('id').eq('document_id', signature.document_id).lt('order_index', signature.order_index).eq('status', 'pending');
    if ((pendingBefore || []).length > 0) return res.status(400).json({ error: 'Waiting for previous signers' });
    const { error } = await req.supabase.from('document_signatures').update({ status: 'signed', signed_at: new Date().toISOString(), notes }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Document signed' });
  } catch (error) {
    console.error('Error signing document:', error);
    res.status(500).json({ error: 'Failed to sign document' });
  }
});

router.post('/signatures/:id/decline', authenticateToken, async (req, res) => {
  try {
    const { notes } = req.body;
    const { data: signature, error: fe } = await req.supabase.from('document_signatures').select('*').eq('id', req.params.id).single();
    if (fe || !signature) return res.status(404).json({ error: 'Signature not found' });
    if (signature.signer_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    const { error } = await req.supabase.from('document_signatures').update({ status: 'declined', signed_at: new Date().toISOString(), notes }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Signature declined' });
  } catch (error) {
    console.error('Error declining signature:', error);
    res.status(500).json({ error: 'Failed to decline signature' });
  }
});

router.get('/signatures/pending', authenticateToken, async (req, res) => {
  try {
    const { data: signatures, error } = await req.supabase
      .from('document_signatures')
      .select('*, document:documents!document_id(title, file_url), owner:users!documents.owner_id(name)')
      .eq('signer_id', req.user.id)
      .eq('status', 'pending')
      .order('created_at');
    if (error) throw error;
    const list = signatures || [];
    const docIds = list.map((s) => s.document_id);
    const { data: docs } = docIds.length ? await req.supabase.from('documents').select('id, title, file_url, owner_id').in('id', docIds) : { data: [] };
    const ownerIds = [...new Set((docs || []).map((d) => d.owner_id))];
    const { data: owners } = ownerIds.length ? await req.supabase.from('users').select('id, name').in('id', ownerIds) : { data: [] };
    const ownerByName = new Map((owners || []).map((u) => [u.id, u.name]));
    const docById = new Map((docs || []).map((d) => [d.id, d]));
    const formatted = list.map((s) => ({
      ...s,
      document_title: docById.get(s.document_id)?.title,
      file_url: docById.get(s.document_id)?.file_url,
      owner_name: docById.get(s.document_id) ? ownerByName.get(docById.get(s.document_id).owner_id) : null,
      document: undefined,
      owner: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching signatures:', error);
    res.status(500).json({ error: 'Failed to fetch signatures' });
  }
});

// ==========================================
// POLICIES
// ==========================================

router.get('/policies/all', authenticateToken, async (req, res) => {
  try {
    const { data: policies, error } = await req.supabase
      .from('policies')
      .select('*, document:documents!document_id(title, file_url), created_by_user:users!created_by(name), approved_by_user:users!approved_by(name)')
      .eq('status', 'published')
      .order('effective_date', { ascending: false });
    if (error) throw error;
    const list = policies || [];
    const policyIds = list.map((p) => p.id);
    const { data: acks } = policyIds.length ? await req.supabase.from('policy_acknowledgments').select('policy_id').in('policy_id', policyIds) : { data: [] };
    const countByPolicy = (acks || []).reduce((acc, r) => { acc[r.policy_id] = (acc[r.policy_id] || 0) + 1; return acc; }, {});
    const formatted = list.map((p) => ({
      ...p,
      document_title: p.document?.title,
      file_url: p.document?.file_url,
      created_by_name: p.created_by_user?.name,
      approved_by_name: p.approved_by_user?.name,
      acknowledgments_count: countByPolicy[p.id] || 0,
      document: undefined,
      created_by_user: undefined,
      approved_by_user: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

router.get('/policies/:id', authenticateToken, async (req, res) => {
  try {
    const { data: policy, error } = await req.supabase
      .from('policies')
      .select('*, document:documents!document_id(title, file_url, file_name)')
      .eq('id', req.params.id)
      .single();
    if (error || !policy) {
      if (error?.code === 'PGRST116') return res.status(404).json({ error: 'Policy not found' });
      throw error || new Error('Not found');
    }
    const { data: ack } = await req.supabase.from('policy_acknowledgments').select('*').eq('policy_id', req.params.id).eq('user_id', req.user.id).maybeSingle();
    res.json({
      ...policy,
      document_title: policy.document?.title,
      file_url: policy.document?.file_url,
      file_name: policy.document?.file_name,
      acknowledged: !!ack,
      acknowledged_at: ack?.acknowledged_at,
      document: undefined,
    });
  } catch (error) {
    console.error('Error fetching policy:', error);
    res.status(500).json({ error: 'Failed to fetch policy' });
  }
});

router.post('/policies', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, category, description, content, document_id, version, effective_date, review_date, requires_acknowledgment } = req.body;
    const id = `pol-${uuidv4()}`;
    const { error } = await req.supabase.from('policies').insert({
      id, title, category, description, content, document_id, version, effective_date, review_date, requires_acknowledgment: requires_acknowledgment ? 1 : 0, created_by: req.user.id,
    });
    if (error) throw error;
    const { data: policy, error: e2 } = await req.supabase.from('policies').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(policy);
  } catch (error) {
    console.error('Error creating policy:', error);
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

router.post('/policies/:id/publish', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { error } = await req.supabase.from('policies').update({ status: 'published', approved_by: req.user.id, approved_at: new Date().toISOString() }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Policy published' });
  } catch (error) {
    console.error('Error publishing policy:', error);
    res.status(500).json({ error: 'Failed to publish policy' });
  }
});

router.post('/policies/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    const { data: existing } = await req.supabase.from('policy_acknowledgments').select('id').eq('policy_id', req.params.id).eq('user_id', req.user.id).maybeSingle();
    if (existing) return res.status(400).json({ error: 'Already acknowledged' });
    const id = `pa-${uuidv4()}`;
    const { error } = await req.supabase.from('policy_acknowledgments').insert({ id, policy_id: req.params.id, user_id: req.user.id });
    if (error) throw error;
    res.json({ message: 'Policy acknowledged' });
  } catch (error) {
    console.error('Error acknowledging policy:', error);
    res.status(500).json({ error: 'Failed to acknowledge policy' });
  }
});

router.get('/policies/acknowledgments/pending', authenticateToken, async (req, res) => {
  try {
    const { data: published } = await req.supabase.from('policies').select('id').eq('status', 'published').eq('requires_acknowledgment', 1);
    const policyIds = (published || []).map((p) => p.id);
    if (!policyIds.length) return res.json([]);
    const { data: acks } = await req.supabase.from('policy_acknowledgments').select('policy_id').eq('user_id', req.user.id).in('policy_id', policyIds);
    const ackedIds = new Set((acks || []).map((a) => a.policy_id));
    const pendingIds = policyIds.filter((id) => !ackedIds.has(id));
    if (!pendingIds.length) return res.json([]);
    const { data: pending } = await req.supabase.from('policies').select('id, title, category, effective_date').in('id', pendingIds).order('effective_date', { ascending: false });
    res.json(pending || []);
  } catch (error) {
    console.error('Error fetching pending acknowledgments:', error);
    res.status(500).json({ error: 'Failed to fetch pending acknowledgments' });
  }
});

// ==========================================
// DOCUMENT TEMPLATES
// ==========================================

router.get('/templates/all', authenticateToken, async (req, res) => {
  try {
    const { data: templates, error } = await req.supabase
      .from('documents')
      .select('*, category:document_categories!category_id(name), owner:users!owner_id(name)')
      .eq('is_template', 1)
      .eq('status', 'active')
      .order('title');
    if (error) throw error;
    const formatted = (templates || []).map((d) => ({ ...d, category_name: d.category?.name, owner_name: d.owner?.name, category: undefined, owner: undefined }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// ==========================================
// DOCUMENTS DASHBOARD
// ==========================================

router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdminUser = req.user.role === 'admin';
    const [myDocsRes, sharedRes, pendingSigsRes, pendingAcksRes] = await Promise.all([
      req.supabase.from('documents').select('*', { count: 'exact', head: true }).eq('owner_id', userId).eq('status', 'active'),
      req.supabase.from('document_shares').select('*', { count: 'exact', head: true }).eq('shared_with_user_id', userId),
      req.supabase.from('document_signatures').select('*', { count: 'exact', head: true }).eq('signer_id', userId).eq('status', 'pending'),
      req.supabase.from('policies').select('id').eq('status', 'published').eq('requires_acknowledgment', 1).then(async (pub) => {
        const ids = (pub.data || []).map((p) => p.id);
        if (!ids.length) return { count: 0 };
        const { data: acks } = await req.supabase.from('policy_acknowledgments').select('policy_id').eq('user_id', userId).in('policy_id', ids);
        const acked = new Set((acks || []).map((a) => a.policy_id));
        return { count: ids.filter((id) => !acked.has(id)).length };
      }),
    ]);
    const myStats = {
      myDocuments: myDocsRes.count ?? 0,
      sharedWithMe: sharedRes.count ?? 0,
      pendingSignatures: pendingSigsRes.count ?? 0,
      pendingAcknowledgments: pendingAcksRes?.count ?? 0,
    };
    let orgStats = null;
    if (isAdminUser) {
      const [totalDocsRes, templatesRes, policiesRes, pendingSigsAllRes, recentDocs] = await Promise.all([
        req.supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        req.supabase.from('documents').select('*', { count: 'exact', head: true }).eq('is_template', 1).eq('status', 'active'),
        req.supabase.from('policies').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        req.supabase.from('document_signatures').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        req.supabase.from('documents').select('id, title, file_type, owner_id, created_at').eq('status', 'active').order('created_at', { ascending: false }).limit(5),
      ]);
      const ownerIds = [...new Set((recentDocs.data || []).map((d) => d.owner_id))];
      const { data: owners } = ownerIds.length ? await req.supabase.from('users').select('id, name').in('id', ownerIds) : { data: [] };
      const ownerByName = new Map((owners || []).map((u) => [u.id, u.name]));
      orgStats = {
        totalDocuments: totalDocsRes.count ?? 0,
        totalTemplates: templatesRes.count ?? 0,
        publishedPolicies: policiesRes.count ?? 0,
        pendingSignatureRequests: pendingSigsAllRes.count ?? 0,
        recentDocuments: (recentDocs.data || []).map((d) => ({ ...d, owner_name: ownerByName.get(d.owner_id), owner_id: undefined })),
      };
    }
    res.json({ myStats, orgStats });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
