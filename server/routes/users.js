const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users
router.get('/', authenticateToken, async (req, res) => {
  try {
    const users = await db.prepare(`
      SELECT id, name, email, department, designation, role, avatar, created_at
      FROM users
      ORDER BY name
    `).all();

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get team members with additional info
router.get('/team', authenticateToken, async (req, res) => {
  try {
    const members = await db.prepare(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.department,
        u.designation,
        u.role,
        u.created_at,
        tm.profile,
        tm.in_probation,
        tm.status
      FROM users u
      LEFT JOIN team_members tm ON u.id = tm.user_id
      ORDER BY u.name
    `).all();

    const formattedMembers = members.map(m => ({
      id: m.id,
      name: m.name,
      email: m.email,
      department: m.department,
      designation: m.designation,
      role: m.role,
      profile: m.profile || 'Standard',
      inProbation: m.in_probation === 1,
      status: m.status || 'Active',
      createdAt: m.created_at,
    }));

    res.json({ members: formattedMembers });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add team member (admin only)
router.post('/team', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, department, designation, profile, role = 'employee' } = req.body;

    if (!name || !email || !password || !department) {
      return res.status(400).json({ error: 'Name, email, password, and department are required' });
    }

    const existingUser = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const userId = `user-${Date.now()}`;

    await db.prepare(`
      INSERT INTO users (id, name, email, password, department, designation, role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, name, email, hashedPassword, department, designation || '', role);

    await db.prepare(`
      INSERT INTO team_members (id, user_id, profile, in_probation, status)
      VALUES (?, ?, ?, 1, 'Active')
    `).run(`tm-${Date.now()}`, userId, profile || 'Standard');

    res.status(201).json({
      message: 'Team member added successfully',
      member: {
        id: userId,
        name,
        email,
        department,
        designation,
        role,
        profile: profile || 'Standard',
        inProbation: true,
        status: 'Active',
      },
    });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update team member (admin only)
router.put('/team/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, department, designation, profile, status, inProbation } = req.body;

    const existingUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update users table
    await db.prepare(`
      UPDATE users SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        department = COALESCE(?, department),
        designation = COALESCE(?, designation)
      WHERE id = ?
    `).run(name, email, department, designation, id);

    // Update team_members table
    if (profile !== undefined || status !== undefined || inProbation !== undefined) {
      await db.prepare(`
        UPDATE team_members SET
          profile = COALESCE(?, profile),
          status = COALESCE(?, status),
          in_probation = COALESCE(?, in_probation)
        WHERE user_id = ?
      `).run(profile, status, inProbation !== undefined ? (inProbation ? 1 : 0) : undefined, id);
    }

    const updatedUser = await db.prepare(`
      SELECT
        u.id, u.name, u.email, u.department, u.designation, u.role,
        tm.profile, tm.in_probation, tm.status
      FROM users u
      LEFT JOIN team_members tm ON u.id = tm.user_id
      WHERE u.id = ?
    `).get(id);

    res.json({
      message: 'Team member updated successfully',
      member: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        department: updatedUser.department,
        designation: updatedUser.designation,
        role: updatedUser.role,
        profile: updatedUser.profile,
        inProbation: updatedUser.in_probation === 1,
        status: updatedUser.status,
      },
    });
  } catch (error) {
    console.error('Update team member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete team member (admin only)
router.delete('/team/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existingUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't allow deleting yourself
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    // Delete from team_members first (foreign key)
    await db.prepare('DELETE FROM team_members WHERE user_id = ?').run(id);
    // Delete related tasks
    await db.prepare('DELETE FROM tasks WHERE assigned_to_user_id = ? OR assigned_by_user_id = ?').run(id, id);
    // Delete related leave requests
    await db.prepare('DELETE FROM leave_requests WHERE user_id = ?').run(id);
    // Delete related check-ins
    await db.prepare('DELETE FROM check_ins WHERE user_id = ?').run(id);
    // Delete user
    await db.prepare('DELETE FROM users WHERE id = ?').run(id);

    res.json({ message: 'Team member deleted successfully' });
  } catch (error) {
    console.error('Delete team member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile (self)
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, avatar } = req.body;

    await db.prepare(`
      UPDATE users SET
        name = COALESCE(?, name),
        avatar = COALESCE(?, avatar)
      WHERE id = ?
    `).run(name, avatar, req.user.id);

    const updatedUser = await db.prepare(`
      SELECT id, name, email, department, designation, role, avatar
      FROM users WHERE id = ?
    `).get(req.user.id);

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
