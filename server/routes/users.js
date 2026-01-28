const express = require('express');
const bcrypt = require('bcryptjs');
const { getSupabaseClient } = require('../config/supabase');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users
router.get('/', authenticateToken, async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, department, designation, role, avatar, created_at')
      .order('name');

    if (error) throw error;

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get team members with additional info
router.get('/team', authenticateToken, async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { data: members, error } = await supabase
      .from('users')
      .select('id, name, email, department, designation, role, created_at, team_members!left(profile, in_probation, status)')
      .order('name');

    if (error) throw error;

    const formattedMembers = members.map(m => ({
      id: m.id,
      name: m.name,
      email: m.email,
      department: m.department,
      designation: m.designation,
      role: m.role,
      profile: m.team_members?.[0]?.profile || 'Standard',
      inProbation: m.team_members?.[0]?.in_probation === 1,
      status: m.team_members?.[0]?.status || 'Active',
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
    const supabase = getSupabaseClient();
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { name, email, password, department, designation, profile, role = 'employee' } = req.body;

    if (!name || !email || !password || !department) {
      return res.status(400).json({ error: 'Name, email, password, and department are required' });
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const userId = `user-${Date.now()}`;

    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        name,
        email,
        password: hashedPassword,
        department,
        designation: designation || '',
        role
      });

    if (userError) throw userError;

    const { error: tmError } = await supabase
      .from('team_members')
      .insert({
        id: `tm-${Date.now()}`,
        user_id: userId,
        profile: profile || 'Standard',
        in_probation: 1,
        status: 'Active'
      });

    if (tmError) throw tmError;

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
    const supabase = getSupabaseClient();
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { id } = req.params;
    const { name, email, department, designation, profile, status, inProbation } = req.body;

    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select()
      .eq('id', id)
      .single();

    if (findError || !existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update users table
    const userUpdate = {};
    if (name !== undefined) userUpdate.name = name;
    if (email !== undefined) userUpdate.email = email;
    if (department !== undefined) userUpdate.department = department;
    if (designation !== undefined) userUpdate.designation = designation;

    if (Object.keys(userUpdate).length > 0) {
      const { error } = await supabase
        .from('users')
        .update(userUpdate)
        .eq('id', id);

      if (error) throw error;
    }

    // Update team_members table
    if (profile !== undefined || status !== undefined || inProbation !== undefined) {
      const tmUpdate = {};
      if (profile !== undefined) tmUpdate.profile = profile;
      if (status !== undefined) tmUpdate.status = status;
      if (inProbation !== undefined) tmUpdate.in_probation = inProbation ? 1 : 0;

      const { error } = await supabase
        .from('team_members')
        .update(tmUpdate)
        .eq('user_id', id);

      if (error) throw error;
    }

    const { data: updatedUser, error: getError } = await supabase
      .from('users')
      .select('id, name, email, department, designation, role, team_members!left(profile, in_probation, status)')
      .eq('id', id)
      .single();

    if (getError) throw getError;

    res.json({
      message: 'Team member updated successfully',
      member: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        department: updatedUser.department,
        designation: updatedUser.designation,
        role: updatedUser.role,
        profile: updatedUser.team_members?.[0]?.profile,
        inProbation: updatedUser.team_members?.[0]?.in_probation === 1,
        status: updatedUser.team_members?.[0]?.status,
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
    const supabase = getSupabaseClient();
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { id } = req.params;

    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select()
      .eq('id', id)
      .single();

    if (findError || !existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    // Delete related records
    await supabase.from('team_members').delete().eq('user_id', id);
    await supabase.from('tasks').delete().or(`assigned_to_user_id.eq.${id},assigned_by_user_id.eq.${id}`);
    await supabase.from('leave_requests').delete().eq('user_id', id);
    await supabase.from('check_ins').delete().eq('user_id', id);
    await supabase.from('users').delete().eq('id', id);

    res.json({ message: 'Team member deleted successfully' });
  } catch (error) {
    console.error('Delete team member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile (self)
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { name, avatar } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (avatar !== undefined) updateData.avatar = avatar;

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.user.id);

    if (error) throw error;

    const { data: updatedUser, error: getError } = await supabase
      .from('users')
      .select('id, name, email, department, designation, role, avatar')
      .eq('id', req.user.id)
      .single();

    if (getError) throw getError;

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
