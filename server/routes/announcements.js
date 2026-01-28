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
// ANNOUNCEMENTS
// ==========================================

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, priority } = req.query;
    const userDept = req.user.department || '';
    const now = new Date().toISOString();
    let q = req.supabase
      .from('announcements')
      .select('*, author:users!author_id(name, avatar)')
      .eq('status', 'published')
      .or(`publish_at.is.null,publish_at.lte.${now}`)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('is_pinned', { ascending: false })
      .order('publish_at', { ascending: false })
      .order('created_at', { ascending: false });
    if (type) q = q.eq('type', type);
    if (priority) q = q.eq('priority', priority);
    const { data: announcements, error } = await q;
    if (error) throw error;
    let list = announcements || [];
    list = list.filter((a) => a.target_audience === 'all' || (a.target_departments && a.target_departments.includes(userDept)));
    const ids = list.map((a) => a.id);
    const [readsRes, myReadsRes] = await Promise.all([
      ids.length ? req.supabase.from('announcement_reads').select('announcement_id').in('announcement_id', ids) : { data: [] },
      ids.length ? req.supabase.from('announcement_reads').select('announcement_id, id').eq('user_id', req.user.id).in('announcement_id', ids) : { data: [] },
    ]);
    const countByAnn = (readsRes.data || []).reduce((acc, r) => { acc[r.announcement_id] = (acc[r.announcement_id] || 0) + 1; return acc; }, {});
    const myReadByAnn = new Map((myReadsRes.data || []).map((r) => [r.announcement_id, r.id]));
    const formatted = list.map((a) => ({
      ...a,
      author_name: a.author?.name,
      author_avatar: a.author?.avatar,
      reads_count: countByAnn[a.id] || 0,
      my_read_id: myReadByAnn.get(a.id) ?? null,
      author: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

router.get('/admin/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let q = req.supabase
      .from('announcements')
      .select('*, author:users!author_id(name)')
      .order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    const { data: announcements, error } = await q;
    if (error) throw error;
    const list = announcements || [];
    const ids = list.map((a) => a.id);
    const { data: reads } = ids.length ? await req.supabase.from('announcement_reads').select('announcement_id').in('announcement_id', ids) : { data: [] };
    const countByAnn = (reads || []).reduce((acc, r) => { acc[r.announcement_id] = (acc[r.announcement_id] || 0) + 1; return acc; }, {});
    const formatted = list.map((a) => ({
      ...a,
      author_name: a.author?.name,
      reads_count: countByAnn[a.id] || 0,
      author: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data: announcement, error } = await req.supabase
      .from('announcements')
      .select('*, author:users!author_id(name, avatar)')
      .eq('id', req.params.id)
      .single();
    if (error || !announcement) {
      if (error?.code === 'PGRST116') return res.status(404).json({ error: 'Announcement not found' });
      throw error || new Error('Not found');
    }
    const { data: existing } = await req.supabase.from('announcement_reads').select('id').eq('announcement_id', req.params.id).eq('user_id', req.user.id).maybeSingle();
    if (!existing) {
      await req.supabase.from('announcement_reads').insert({
        id: `ar-${uuidv4()}`, announcement_id: req.params.id, user_id: req.user.id,
      });
    }
    res.json({
      ...announcement,
      author_name: announcement.author?.name,
      author_avatar: announcement.author?.avatar,
      author: undefined,
    });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({ error: 'Failed to fetch announcement' });
  }
});

router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, content, type, priority, target_audience, target_departments, target_locations, publish_at, expires_at, is_pinned, requires_acknowledgment, attachment_url, status } = req.body;
    const id = `ann-${uuidv4()}`;
    const { error } = await req.supabase.from('announcements').insert({
      id, title, content, type: type || 'general', priority: priority || 'normal', target_audience: target_audience || 'all', target_departments, target_locations, author_id: req.user.id, publish_at, expires_at, is_pinned: is_pinned ? 1 : 0, requires_acknowledgment: requires_acknowledgment ? 1 : 0, attachment_url, status: status || 'draft',
    });
    if (error) throw error;
    const { data: announcement, error: e2 } = await req.supabase.from('announcements').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(announcement);
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, content, type, priority, target_audience, target_departments, target_locations, publish_at, expires_at, is_pinned, requires_acknowledgment, attachment_url, status } = req.body;
    const { error } = await req.supabase.from('announcements').update({
      title, content, type, priority, target_audience, target_departments, target_locations, publish_at, expires_at, is_pinned: is_pinned ? 1 : 0, requires_acknowledgment: requires_acknowledgment ? 1 : 0, attachment_url, status,
    }).eq('id', req.params.id);
    if (error) throw error;
    const { data: announcement, error: e2 } = await req.supabase.from('announcements').select('*').eq('id', req.params.id).single();
    if (e2) throw e2;
    res.json(announcement);
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await req.supabase.from('announcement_reads').delete().eq('announcement_id', req.params.id);
    await req.supabase.from('announcements').delete().eq('id', req.params.id);
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

router.post('/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    const { error } = await req.supabase.from('announcement_reads').update({ acknowledged_at: new Date().toISOString() }).eq('announcement_id', req.params.id).eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Acknowledged' });
  } catch (error) {
    console.error('Error acknowledging:', error);
    res.status(500).json({ error: 'Failed to acknowledge' });
  }
});

// ==========================================
// COMPANY EVENTS
// ==========================================

router.get('/events/all', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, event_type } = req.query;
    const userDept = req.user.department || '';
    let q = req.supabase
      .from('company_events')
      .select('*, organizer:users!organizer_id(name, avatar)')
      .neq('status', 'cancelled')
      .order('start_date')
      .order('start_time');
    if (start_date) q = q.gte('start_date', start_date);
    if (end_date) q = q.lte('end_date', end_date);
    if (event_type) q = q.eq('event_type', event_type);
    const { data: events, error } = await q;
    if (error) throw error;
    let list = (events || []).filter((e) => e.target_audience === 'all' || (e.target_departments && e.target_departments.includes(userDept)));
    const eventIds = list.map((e) => e.id);
    const [regCounts, myRegs] = await Promise.all([
      eventIds.length ? req.supabase.from('event_registrations').select('event_id').eq('status', 'registered').in('event_id', eventIds) : { data: [] },
      eventIds.length ? req.supabase.from('event_registrations').select('event_id, id').eq('user_id', req.user.id).in('event_id', eventIds) : { data: [] },
    ]);
    const countByEvent = (regCounts.data || []).reduce((acc, r) => { acc[r.event_id] = (acc[r.event_id] || 0) + 1; return acc; }, {});
    const myRegByEvent = new Map((myRegs.data || []).map((r) => [r.event_id, r.id]));
    const formatted = list.map((e) => ({
      ...e,
      organizer_name: e.organizer?.name,
      organizer_avatar: e.organizer?.avatar,
      registrations_count: countByEvent[e.id] || 0,
      my_registration: myRegByEvent.get(e.id) ?? null,
      organizer: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.get('/events/upcoming', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data: events, error } = await req.supabase
      .from('company_events')
      .select('*, organizer:users!organizer_id(name)')
      .eq('status', 'scheduled')
      .gte('start_date', today)
      .order('start_date')
      .order('start_time')
      .limit(10);
    if (error) throw error;
    const list = events || [];
    const eventIds = list.map((e) => e.id);
    const [regCounts, myRegs] = await Promise.all([
      eventIds.length ? req.supabase.from('event_registrations').select('event_id').eq('status', 'registered').in('event_id', eventIds) : { data: [] },
      eventIds.length ? req.supabase.from('event_registrations').select('event_id, id').eq('user_id', req.user.id).in('event_id', eventIds) : { data: [] },
    ]);
    const countByEvent = (regCounts.data || []).reduce((acc, r) => { acc[r.event_id] = (acc[r.event_id] || 0) + 1; return acc; }, {});
    const myRegByEvent = new Map((myRegs.data || []).map((r) => [r.event_id, r.id]));
    const formatted = list.map((e) => ({
      ...e,
      organizer_name: e.organizer?.name,
      registrations_count: countByEvent[e.id] || 0,
      my_registration: myRegByEvent.get(e.id) ?? null,
      organizer: undefined,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.get('/events/:id', authenticateToken, async (req, res) => {
  try {
    const { data: event, error } = await req.supabase
      .from('company_events')
      .select('*, organizer:users!organizer_id(name, email)')
      .eq('id', req.params.id)
      .single();
    if (error || !event) {
      if (error?.code === 'PGRST116') return res.status(404).json({ error: 'Event not found' });
      throw error || new Error('Not found');
    }
    const { data: regs } = await req.supabase
      .from('event_registrations')
      .select('*, user:users!user_id(name, department, avatar)')
      .eq('event_id', req.params.id)
      .order('registered_at');
    event.registrations = (regs || []).map((r) => ({
      ...r,
      user_name: r.user?.name,
      department: r.user?.department,
      avatar: r.user?.avatar,
      user: undefined,
    }));
    res.json({
      ...event,
      organizer_name: event.organizer?.name,
      organizer_email: event.organizer?.email,
      organizer: undefined,
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

router.post('/events', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, description, event_type, start_date, end_date, start_time, end_time, location, virtual_link, is_all_day, is_recurring, recurrence_pattern, target_audience, target_departments, max_participants, registration_required, registration_deadline } = req.body;
    const id = `evt-${uuidv4()}`;
    const { error } = await req.supabase.from('company_events').insert({
      id, title, description, event_type: event_type || 'meeting', start_date, end_date: end_date || start_date, start_time, end_time, location, virtual_link, is_all_day: is_all_day ? 1 : 0, is_recurring: is_recurring ? 1 : 0, recurrence_pattern, organizer_id: req.user.id, target_audience: target_audience || 'all', target_departments, max_participants, registration_required: registration_required ? 1 : 0, registration_deadline,
    });
    if (error) throw error;
    const { data: event, error: e2 } = await req.supabase.from('company_events').select('*').eq('id', id).single();
    if (e2) throw e2;
    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

router.put('/events/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, description, event_type, start_date, end_date, start_time, end_time, location, virtual_link, is_all_day, target_audience, target_departments, max_participants, registration_required, registration_deadline, status } = req.body;
    const { error } = await req.supabase.from('company_events').update({
      title, description, event_type, start_date, end_date, start_time, end_time, location, virtual_link, is_all_day: is_all_day ? 1 : 0, target_audience, target_departments, max_participants, registration_required: registration_required ? 1 : 0, registration_deadline, status,
    }).eq('id', req.params.id);
    if (error) throw error;
    const { data: event, error: e2 } = await req.supabase.from('company_events').select('*').eq('id', req.params.id).single();
    if (e2) throw e2;
    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.post('/events/:id/register', authenticateToken, async (req, res) => {
  try {
    const { data: event, error: fe } = await req.supabase.from('company_events').select('max_participants, registration_deadline').eq('id', req.params.id).single();
    if (fe || !event) return res.status(404).json({ error: 'Event not found' });
    if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) return res.status(400).json({ error: 'Registration deadline passed' });
    if (event.max_participants) {
      const { count } = await req.supabase.from('event_registrations').select('*', { count: 'exact', head: true }).eq('event_id', req.params.id).eq('status', 'registered');
      if (count >= event.max_participants) return res.status(400).json({ error: 'Event is full' });
    }
    const { data: existing } = await req.supabase.from('event_registrations').select('id').eq('event_id', req.params.id).eq('user_id', req.user.id).maybeSingle();
    if (existing) return res.status(400).json({ error: 'Already registered' });
    const id = `er-${uuidv4()}`;
    await req.supabase.from('event_registrations').insert({ id, event_id: req.params.id, user_id: req.user.id });
    res.json({ message: 'Registered successfully' });
  } catch (error) {
    console.error('Error registering:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
});

router.delete('/events/:id/register', authenticateToken, async (req, res) => {
  try {
    await req.supabase.from('event_registrations').delete().eq('event_id', req.params.id).eq('user_id', req.user.id);
    res.json({ message: 'Registration cancelled' });
  } catch (error) {
    console.error('Error cancelling registration:', error);
    res.status(500).json({ error: 'Failed to cancel registration' });
  }
});

router.get('/events/registered/my-events', authenticateToken, async (req, res) => {
  try {
    const { data: regs, error } = await req.supabase
      .from('event_registrations')
      .select('*, event:company_events!event_id(*)')
      .eq('user_id', req.user.id);
    if (error) throw error;
    const list = regs || [];
    const events = list.map((r) => ({ ...(r.event || {}), registered_at: r.registered_at }));
    const organizerIds = [...new Set(events.map((e) => e.organizer_id).filter(Boolean))];
    const { data: organizers } = organizerIds.length ? await req.supabase.from('users').select('id, name').in('id', organizerIds) : { data: [] };
    const nameById = new Map((organizers || []).map((u) => [u.id, u.name]));
    const formatted = events.map((e) => ({ ...e, organizer_name: nameById.get(e.organizer_id) ?? null }));
    formatted.sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// ==========================================
// CELEBRATIONS
// ==========================================

router.get('/celebrations/upcoming', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    let nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekMonthDay = `${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`;
    const { data: profiles } = await req.supabase.from('employee_profiles').select('user_id, date_of_birth').not('date_of_birth', 'is', null);
    const userIds = (profiles || []).map((p) => p.user_id);
    const { data: users } = userIds.length ? await req.supabase.from('users').select('id, name, avatar, department').in('id', userIds) : { data: [] };
    const userById = new Map((users || []).map((u) => [u.id, u]));
    const birthdays = (profiles || [])
      .filter((p) => p.date_of_birth && p.date_of_birth.length >= 10 && p.date_of_birth.slice(5, 10) >= monthDay && p.date_of_birth.slice(5, 10) <= nextWeekMonthDay)
      .map((p) => {
        const u = userById.get(p.user_id);
        return u ? { ...u, date_of_birth: p.date_of_birth, type: 'birthday' } : null;
      })
      .filter(Boolean);
    const { data: allUsers } = await req.supabase.from('users').select('id, name, avatar, department, created_at');
    const anniversaries = (allUsers || [])
      .filter((u) => u.created_at && u.created_at.slice(5, 10) >= monthDay && u.created_at.slice(5, 10) <= nextWeekMonthDay)
      .map((u) => ({ ...u, work_anniversary: u.created_at, type: 'anniversary' }));
    res.json([...birthdays, ...anniversaries]);
  } catch (error) {
    console.error('Error fetching celebrations:', error);
    res.status(500).json({ error: 'Failed to fetch celebrations' });
  }
});

router.get('/celebrations/today', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const { data: profiles } = await req.supabase.from('employee_profiles').select('user_id').not('date_of_birth', 'is', null);
    const birthdays = (profiles || [])
      .filter((p) => p.date_of_birth && p.date_of_birth.length >= 10 && p.date_of_birth.slice(5, 10) === monthDay)
      .map((p) => p.user_id);
    const { data: users } = birthdays.length ? await req.supabase.from('users').select('id, name, avatar, department').in('id', birthdays) : { data: [] };
    const bdayList = (users || []).map((u) => ({ ...u, type: 'birthday' }));
    const { data: allUsers } = await req.supabase.from('users').select('id, name, avatar, department, created_at');
    const anniversaries = (allUsers || [])
      .filter((u) => u.created_at && u.created_at.slice(5, 10) === monthDay)
      .map((u) => ({ ...u, type: 'anniversary', years: Math.floor((today - new Date(u.created_at)) / (365.25 * 24 * 60 * 60 * 1000)) }));
    res.json([...bdayList, ...anniversaries]);
  } catch (error) {
    console.error('Error fetching celebrations:', error);
    res.status(500).json({ error: 'Failed to fetch celebrations' });
  }
});

// ==========================================
// NOTIFICATIONS
// ==========================================

router.get('/notifications/my-notifications', authenticateToken, async (req, res) => {
  try {
    const { unread_only } = req.query;
    let q = req.supabase.from('notifications').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(50);
    if (unread_only === 'true') q = q.eq('is_read', 0);
    const { data: notifications, error } = await q;
    if (error) throw error;
    res.json(notifications || []);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.get('/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const { count, error } = await req.supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', req.user.id).eq('is_read', 0);
    if (error) throw error;
    res.json({ count: count ?? 0 });
  } catch (error) {
    console.error('Error fetching count:', error);
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});

router.post('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { error } = await req.supabase.from('notifications').update({ is_read: 1, read_at: new Date().toISOString() }).eq('id', req.params.id).eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Error marking read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

router.post('/notifications/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const { error } = await req.supabase.from('notifications').update({ is_read: 1, read_at: new Date().toISOString() }).eq('user_id', req.user.id).eq('is_read', 0);
    if (error) throw error;
    res.json({ message: 'All marked as read' });
  } catch (error) {
    console.error('Error marking all read:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

router.post('/notifications', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { user_id, title, message, type, action_url } = req.body;
    const id = `notif-${uuidv4()}`;
    const { error } = await req.supabase.from('notifications').insert({
      id, user_id, title, message, type: type || 'info', action_url,
    });
    if (error) throw error;
    res.status(201).json({ message: 'Notification created' });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// ==========================================
// COMMUNICATIONS DASHBOARD
// ==========================================

router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdminUser = req.user.role === 'admin';
    const now = new Date().toISOString();
    const today = new Date().toISOString().slice(0, 10);
    const [publishedAnn, readByUser, eventRegs, unreadNotif, totalAnn, upcomingEvts, profilesToday, recentAnn] = await Promise.all([
      req.supabase.from('announcements').select('id').eq('status', 'published').or(`publish_at.is.null,publish_at.lte.${now}`).or(`expires_at.is.null,expires_at.gt.${now}`),
      req.supabase.from('announcement_reads').select('announcement_id').eq('user_id', userId),
      req.supabase.from('event_registrations').select('event_id').eq('user_id', userId),
      req.supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', 0),
      isAdminUser ? req.supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('status', 'published') : Promise.resolve({ count: 0 }),
      isAdminUser ? req.supabase.from('company_events').select('*', { count: 'exact', head: true }).gte('start_date', today).eq('status', 'scheduled') : Promise.resolve({ count: 0 }),
      isAdminUser ? req.supabase.from('employee_profiles').select('id').not('date_of_birth', 'is', null) : Promise.resolve({ data: [] }),
      isAdminUser ? req.supabase.from('announcements').select('id, title, type, priority, created_at').eq('status', 'published').order('created_at', { ascending: false }).limit(5) : Promise.resolve({ data: [] }),
    ]);
    const readIds = new Set((readByUser.data || []).map((r) => r.announcement_id));
    const unreadAnn = (publishedAnn.data || []).filter((a) => !readIds.has(a.id)).length;
    const eventIds = (eventRegs.data || []).map((r) => r.event_id);
    const { count: upcomingCount } = eventIds.length ? await req.supabase.from('company_events').select('*', { count: 'exact', head: true }).in('id', eventIds).gte('start_date', today).eq('status', 'scheduled') : { count: 0 };
    const myStats = {
      unreadAnnouncements: unreadAnn,
      upcomingEvents: upcomingCount ?? 0,
      unreadNotifications: unreadNotif.count ?? 0,
    };
    let orgStats = null;
    if (isAdminUser) {
      const monthDay = `${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
      const { data: profiles } = await req.supabase.from('employee_profiles').select('id, date_of_birth').not('date_of_birth', 'is', null);
      const todaysBday = (profiles || []).filter((p) => p.date_of_birth && String(p.date_of_birth).length >= 10 && String(p.date_of_birth).slice(5, 10) === monthDay).length;
      const recentIds = (recentAnn.data || []).map((a) => a.id);
      const { data: readCounts } = recentIds.length ? await req.supabase.from('announcement_reads').select('announcement_id').in('announcement_id', recentIds) : { data: [] };
      const countByAnn = (readCounts || []).reduce((acc, r) => { acc[r.announcement_id] = (acc[r.announcement_id] || 0) + 1; return acc; }, {});
      orgStats = {
        totalAnnouncements: totalAnn.count ?? 0,
        upcomingEvents: upcomingEvts.count ?? 0,
        todaysCelebrations: todaysBday,
        recentAnnouncements: (recentAnn.data || []).map((a) => ({ ...a, reads_count: countByAnn[a.id] || 0 })),
      };
    }
    res.json({ myStats, orgStats });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
