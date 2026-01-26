const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get all tasks (with user info)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*, assignedBy:users!assigned_by_user_id(name), assignedTo:users!assigned_to_user_id(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedTasks = tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      assignedBy: t.assignedBy?.name,
      assignedByUserId: t.assigned_by_user_id,
      assignedTo: t.assigned_to_user_id,
      assignedToName: t.assignedTo?.name,
      dueDate: t.due_date,
      dueTime: t.due_time,
      status: t.status,
      priority: t.priority,
      tags: t.tags ? t.tags.split(',') : [],
      createdAt: t.created_at,
    }));

    res.json({ tasks: formattedTasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get my tasks (assigned to me)
router.get('/my-tasks', authenticateToken, async (req, res) => {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*, assignedBy:users!assigned_by_user_id(name)')
      .eq('assigned_to_user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedTasks = tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      assignedBy: t.assignedBy?.name,
      assignedByUserId: t.assigned_by_user_id,
      assignedTo: t.assigned_to_user_id,
      dueDate: t.due_date,
      dueTime: t.due_time,
      status: t.status,
      priority: t.priority,
      tags: t.tags ? t.tags.split(',') : [],
      createdAt: t.created_at,
    }));

    res.json({ tasks: formattedTasks });
  } catch (error) {
    console.error('Get my tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get delegated tasks (assigned by me)
router.get('/delegated', authenticateToken, async (req, res) => {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*, assignedTo:users!assigned_to_user_id(name)')
      .eq('assigned_by_user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedTasks = tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      assignedBy: req.user.name,
      assignedByUserId: t.assigned_by_user_id,
      assignedTo: t.assigned_to_user_id,
      assignedToName: t.assignedTo?.name,
      dueDate: t.due_date,
      dueTime: t.due_time,
      status: t.status,
      priority: t.priority,
      tags: t.tags ? t.tags.split(',') : [],
      createdAt: t.created_at,
    }));

    res.json({ tasks: formattedTasks });
  } catch (error) {
    console.error('Get delegated tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create task
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, assignedTo, dueDate, dueTime, priority, tags } = req.body;

    if (!title || !assignedTo || !dueDate || !dueTime) {
      return res.status(400).json({ error: 'Title, assignedTo, dueDate, and dueTime are required' });
    }

    const taskId = `task-${Date.now()}`;
    const tagsString = Array.isArray(tags) ? tags.join(',') : (tags || '');

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        id: taskId,
        title,
        description: description || '',
        assigned_by_user_id: req.user.id,
        assigned_to_user_id: assignedTo,
        due_date: dueDate,
        due_time: dueTime,
        status: 'pending',
        priority: priority || 'medium',
        tags: tagsString
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Task created successfully',
      task: {
        ...task,
        tags: task.tags ? task.tags.split(',') : [],
      },
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, dueDate, dueTime, tags } = req.body;

    const { data: existingTask, error: findError } = await supabase
      .from('tasks')
      .select()
      .eq('id', id)
      .single();

    if (findError || !existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const tagsString = Array.isArray(tags) ? tags.join(',') : (tags !== undefined ? tags : existingTask.tags);

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.due_date = dueDate;
    if (dueTime !== undefined) updateData.due_time = dueTime;
    updateData.tags = tagsString;

    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Task updated successfully',
      task: {
        ...updatedTask,
        tags: updatedTask.tags ? updatedTask.tags.split(',') : [],
      },
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existingTask, error: findError } = await supabase
      .from('tasks')
      .select()
      .eq('id', id)
      .single();

    if (findError || !existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
