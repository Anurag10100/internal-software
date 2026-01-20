const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// ==========================================
// ANNOUNCEMENTS
// ==========================================

// Get all announcements (filtered by audience)
router.get('/', authenticateToken, (req, res) => {
  try {
    const { type, priority } = req.query;
    const userDept = req.user.department;

    let query = `
      SELECT a.*, u.name as author_name, u.avatar as author_avatar,
             (SELECT COUNT(*) FROM announcement_reads WHERE announcement_id = a.id) as reads_count,
             (SELECT id FROM announcement_reads WHERE announcement_id = a.id AND user_id = ?) as my_read_id
      FROM announcements a
      JOIN users u ON a.author_id = u.id
      WHERE a.status = 'published'
        AND (a.publish_at IS NULL OR a.publish_at <= datetime('now'))
        AND (a.expires_at IS NULL OR a.expires_at > datetime('now'))
        AND (
          a.target_audience = 'all'
          OR a.target_departments LIKE ?
        )
    `;
    const params = [req.user.id, `%${userDept}%`];

    if (type) {
      query += ' AND a.type = ?';
      params.push(type);
    }
    if (priority) {
      query += ' AND a.priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY a.is_pinned DESC, a.publish_at DESC, a.created_at DESC';

    const announcements = db.prepare(query).all(...params);
    res.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Get all announcements (admin)
router.get('/admin/all', authenticateToken, isAdmin, (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT a.*, u.name as author_name,
             (SELECT COUNT(*) FROM announcement_reads WHERE announcement_id = a.id) as reads_count
      FROM announcements a
      JOIN users u ON a.author_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    query += ' ORDER BY a.created_at DESC';

    const announcements = db.prepare(query).all(...params);
    res.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Get single announcement
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const announcement = db.prepare(`
      SELECT a.*, u.name as author_name, u.avatar as author_avatar
      FROM announcements a
      JOIN users u ON a.author_id = u.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    // Mark as read
    const existing = db.prepare('SELECT id FROM announcement_reads WHERE announcement_id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) {
      db.prepare(`
        INSERT INTO announcement_reads (id, announcement_id, user_id)
        VALUES (?, ?, ?)
      `).run(`ar-${uuidv4()}`, req.params.id, req.user.id);
    }

    res.json(announcement);
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({ error: 'Failed to fetch announcement' });
  }
});

// Create announcement
router.post('/', authenticateToken, isAdmin, (req, res) => {
  try {
    const { title, content, type, priority, target_audience, target_departments, target_locations, publish_at, expires_at, is_pinned, requires_acknowledgment, attachment_url, status } = req.body;

    const id = `ann-${uuidv4()}`;
    db.prepare(`
      INSERT INTO announcements (id, title, content, type, priority, target_audience, target_departments, target_locations, author_id, publish_at, expires_at, is_pinned, requires_acknowledgment, attachment_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, content, type || 'general', priority || 'normal', target_audience || 'all', target_departments, target_locations, req.user.id, publish_at, expires_at, is_pinned ? 1 : 0, requires_acknowledgment ? 1 : 0, attachment_url, status || 'draft');

    const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
    res.status(201).json(announcement);
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// Update announcement
router.put('/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { title, content, type, priority, target_audience, target_departments, target_locations, publish_at, expires_at, is_pinned, requires_acknowledgment, attachment_url, status } = req.body;

    db.prepare(`
      UPDATE announcements SET title = ?, content = ?, type = ?, priority = ?,
      target_audience = ?, target_departments = ?, target_locations = ?,
      publish_at = ?, expires_at = ?, is_pinned = ?, requires_acknowledgment = ?,
      attachment_url = ?, status = ?
      WHERE id = ?
    `).run(title, content, type, priority, target_audience, target_departments, target_locations, publish_at, expires_at, is_pinned ? 1 : 0, requires_acknowledgment ? 1 : 0, attachment_url, status, req.params.id);

    const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
    res.json(announcement);
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// Delete announcement
router.delete('/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM announcement_reads WHERE announcement_id = ?').run(req.params.id);
    db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// Acknowledge announcement
router.post('/:id/acknowledge', authenticateToken, (req, res) => {
  try {
    db.prepare(`
      UPDATE announcement_reads SET acknowledged_at = CURRENT_TIMESTAMP
      WHERE announcement_id = ? AND user_id = ?
    `).run(req.params.id, req.user.id);
    res.json({ message: 'Acknowledged' });
  } catch (error) {
    console.error('Error acknowledging:', error);
    res.status(500).json({ error: 'Failed to acknowledge' });
  }
});

// ==========================================
// COMPANY EVENTS
// ==========================================

// Get all events
router.get('/events/all', authenticateToken, (req, res) => {
  try {
    const { start_date, end_date, event_type } = req.query;
    const userDept = req.user.department;

    let query = `
      SELECT e.*, o.name as organizer_name, o.avatar as organizer_avatar,
             (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id AND status = 'registered') as registrations_count,
             (SELECT id FROM event_registrations WHERE event_id = e.id AND user_id = ?) as my_registration
      FROM company_events e
      JOIN users o ON e.organizer_id = o.id
      WHERE e.status != 'cancelled'
        AND (
          e.target_audience = 'all'
          OR e.target_departments LIKE ?
        )
    `;
    const params = [req.user.id, `%${userDept}%`];

    if (start_date) {
      query += ' AND e.start_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND e.end_date <= ?';
      params.push(end_date);
    }
    if (event_type) {
      query += ' AND e.event_type = ?';
      params.push(event_type);
    }

    query += ' ORDER BY e.start_date, e.start_time';

    const events = db.prepare(query).all(...params);
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get upcoming events
router.get('/events/upcoming', authenticateToken, (req, res) => {
  try {
    const events = db.prepare(`
      SELECT e.*, o.name as organizer_name,
             (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id AND status = 'registered') as registrations_count,
             (SELECT id FROM event_registrations WHERE event_id = e.id AND user_id = ?) as my_registration
      FROM company_events e
      JOIN users o ON e.organizer_id = o.id
      WHERE e.status = 'scheduled' AND e.start_date >= date('now')
      ORDER BY e.start_date, e.start_time
      LIMIT 10
    `).all(req.user.id);
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get single event
router.get('/events/:id', authenticateToken, (req, res) => {
  try {
    const event = db.prepare(`
      SELECT e.*, o.name as organizer_name, o.email as organizer_email
      FROM company_events e
      JOIN users o ON e.organizer_id = o.id
      WHERE e.id = ?
    `).get(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get registrations
    event.registrations = db.prepare(`
      SELECT er.*, u.name as user_name, u.department, u.avatar
      FROM event_registrations er
      JOIN users u ON er.user_id = u.id
      WHERE er.event_id = ?
      ORDER BY er.registered_at
    `).all(req.params.id);

    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Create event
router.post('/events', authenticateToken, isAdmin, (req, res) => {
  try {
    const { title, description, event_type, start_date, end_date, start_time, end_time, location, virtual_link, is_all_day, is_recurring, recurrence_pattern, target_audience, target_departments, max_participants, registration_required, registration_deadline } = req.body;

    const id = `evt-${uuidv4()}`;
    db.prepare(`
      INSERT INTO company_events (id, title, description, event_type, start_date, end_date, start_time, end_time, location, virtual_link, is_all_day, is_recurring, recurrence_pattern, organizer_id, target_audience, target_departments, max_participants, registration_required, registration_deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description, event_type || 'meeting', start_date, end_date || start_date, start_time, end_time, location, virtual_link, is_all_day ? 1 : 0, is_recurring ? 1 : 0, recurrence_pattern, req.user.id, target_audience || 'all', target_departments, max_participants, registration_required ? 1 : 0, registration_deadline);

    const event = db.prepare('SELECT * FROM company_events WHERE id = ?').get(id);
    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
router.put('/events/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { title, description, event_type, start_date, end_date, start_time, end_time, location, virtual_link, is_all_day, target_audience, target_departments, max_participants, registration_required, registration_deadline, status } = req.body;

    db.prepare(`
      UPDATE company_events SET title = ?, description = ?, event_type = ?,
      start_date = ?, end_date = ?, start_time = ?, end_time = ?, location = ?,
      virtual_link = ?, is_all_day = ?, target_audience = ?, target_departments = ?,
      max_participants = ?, registration_required = ?, registration_deadline = ?, status = ?
      WHERE id = ?
    `).run(title, description, event_type, start_date, end_date, start_time, end_time, location, virtual_link, is_all_day ? 1 : 0, target_audience, target_departments, max_participants, registration_required ? 1 : 0, registration_deadline, status, req.params.id);

    const event = db.prepare('SELECT * FROM company_events WHERE id = ?').get(req.params.id);
    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Register for event
router.post('/events/:id/register', authenticateToken, (req, res) => {
  try {
    const event = db.prepare('SELECT max_participants, registration_deadline FROM company_events WHERE id = ?').get(req.params.id);

    // Check deadline
    if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
      return res.status(400).json({ error: 'Registration deadline passed' });
    }

    // Check capacity
    if (event.max_participants) {
      const registered = db.prepare('SELECT COUNT(*) as count FROM event_registrations WHERE event_id = ? AND status = ?').get(req.params.id, 'registered');
      if (registered.count >= event.max_participants) {
        return res.status(400).json({ error: 'Event is full' });
      }
    }

    // Check if already registered
    const existing = db.prepare('SELECT id FROM event_registrations WHERE event_id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (existing) {
      return res.status(400).json({ error: 'Already registered' });
    }

    const id = `er-${uuidv4()}`;
    db.prepare(`
      INSERT INTO event_registrations (id, event_id, user_id)
      VALUES (?, ?, ?)
    `).run(id, req.params.id, req.user.id);

    res.json({ message: 'Registered successfully' });
  } catch (error) {
    console.error('Error registering:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
});

// Cancel registration
router.delete('/events/:id/register', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM event_registrations WHERE event_id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Registration cancelled' });
  } catch (error) {
    console.error('Error cancelling:', error);
    res.status(500).json({ error: 'Failed to cancel registration' });
  }
});

// Get my registered events
router.get('/events/registered/my-events', authenticateToken, (req, res) => {
  try {
    const events = db.prepare(`
      SELECT e.*, er.registered_at, o.name as organizer_name
      FROM event_registrations er
      JOIN company_events e ON er.event_id = e.id
      JOIN users o ON e.organizer_id = o.id
      WHERE er.user_id = ?
      ORDER BY e.start_date DESC
    `).all(req.user.id);
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// ==========================================
// CELEBRATIONS (BIRTHDAYS & ANNIVERSARIES)
// ==========================================

// Get upcoming celebrations
router.get('/celebrations/upcoming', authenticateToken, (req, res) => {
  try {
    const today = new Date();
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekMonthDay = `${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`;

    // Get birthdays from employee_profiles
    const birthdays = db.prepare(`
      SELECT u.id, u.name, u.avatar, u.department, ep.date_of_birth,
             'birthday' as type
      FROM employee_profiles ep
      JOIN users u ON ep.user_id = u.id
      WHERE substr(ep.date_of_birth, 6) BETWEEN ? AND ?
    `).all(monthDay, nextWeekMonthDay);

    // Get work anniversaries (from user created_at)
    const anniversaries = db.prepare(`
      SELECT u.id, u.name, u.avatar, u.department, u.created_at as work_anniversary,
             'anniversary' as type
      FROM users u
      WHERE substr(u.created_at, 6, 5) BETWEEN ? AND ?
    `).all(monthDay, nextWeekMonthDay);

    res.json([...birthdays, ...anniversaries]);
  } catch (error) {
    console.error('Error fetching celebrations:', error);
    res.status(500).json({ error: 'Failed to fetch celebrations' });
  }
});

// Get today's celebrations
router.get('/celebrations/today', authenticateToken, (req, res) => {
  try {
    const today = new Date();
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const birthdays = db.prepare(`
      SELECT u.id, u.name, u.avatar, u.department, 'birthday' as type
      FROM employee_profiles ep
      JOIN users u ON ep.user_id = u.id
      WHERE substr(ep.date_of_birth, 6) = ?
    `).all(monthDay);

    const anniversaries = db.prepare(`
      SELECT u.id, u.name, u.avatar, u.department, 'anniversary' as type,
             CAST((julianday('now') - julianday(u.created_at)) / 365 AS INTEGER) as years
      FROM users u
      WHERE substr(u.created_at, 6, 5) = ?
    `).all(monthDay);

    res.json([...birthdays, ...anniversaries]);
  } catch (error) {
    console.error('Error fetching celebrations:', error);
    res.status(500).json({ error: 'Failed to fetch celebrations' });
  }
});

// ==========================================
// NOTIFICATIONS
// ==========================================

// Get my notifications
router.get('/notifications/my-notifications', authenticateToken, (req, res) => {
  try {
    const { unread_only } = req.query;
    let query = `
      SELECT * FROM notifications WHERE user_id = ?
    `;
    if (unread_only === 'true') {
      query += ' AND is_read = 0';
    }
    query += ' ORDER BY created_at DESC LIMIT 50';

    const notifications = db.prepare(query).all(req.user.id);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread count
router.get('/notifications/unread-count', authenticateToken, (req, res) => {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id);
    res.json({ count: count.count });
  } catch (error) {
    console.error('Error fetching count:', error);
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});

// Mark notification as read
router.post('/notifications/:id/read', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Error marking read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Mark all as read
router.post('/notifications/mark-all-read', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = 0').run(req.user.id);
    res.json({ message: 'All marked as read' });
  } catch (error) {
    console.error('Error marking all read:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// Create notification (internal use)
router.post('/notifications', authenticateToken, isAdmin, (req, res) => {
  try {
    const { user_id, title, message, type, action_url } = req.body;

    const id = `notif-${uuidv4()}`;
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, action_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, user_id, title, message, type || 'info', action_url);

    res.status(201).json({ message: 'Notification created' });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// ==========================================
// COMMUNICATIONS DASHBOARD
// ==========================================

router.get('/dashboard', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const myStats = {
      unreadAnnouncements: db.prepare(`
        SELECT COUNT(*) as count FROM announcements a
        WHERE a.status = 'published'
          AND (a.publish_at IS NULL OR a.publish_at <= datetime('now'))
          AND (a.expires_at IS NULL OR a.expires_at > datetime('now'))
          AND NOT EXISTS (SELECT 1 FROM announcement_reads ar WHERE ar.announcement_id = a.id AND ar.user_id = ?)
      `).get(userId).count,
      upcomingEvents: db.prepare(`
        SELECT COUNT(*) as count FROM event_registrations er
        JOIN company_events e ON er.event_id = e.id
        WHERE er.user_id = ? AND e.start_date >= date('now') AND e.status = 'scheduled'
      `).get(userId).count,
      unreadNotifications: db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(userId).count
    };

    let orgStats = null;
    if (isAdmin) {
      orgStats = {
        totalAnnouncements: db.prepare('SELECT COUNT(*) as count FROM announcements WHERE status = ?').get('published').count,
        upcomingEvents: db.prepare('SELECT COUNT(*) as count FROM company_events WHERE start_date >= date("now") AND status = ?').get('scheduled').count,
        todaysCelebrations: db.prepare(`
          SELECT COUNT(*) as count FROM employee_profiles ep
          WHERE substr(ep.date_of_birth, 6) = strftime('%m-%d', 'now')
        `).get().count,
        recentAnnouncements: db.prepare(`
          SELECT a.id, a.title, a.type, a.priority, a.created_at,
                 (SELECT COUNT(*) FROM announcement_reads WHERE announcement_id = a.id) as reads_count
          FROM announcements a
          WHERE a.status = 'published'
          ORDER BY a.created_at DESC
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
