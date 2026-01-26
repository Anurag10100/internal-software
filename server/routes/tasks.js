const express = require('express');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all tasks (with user info)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tasks = await db.prepare(`
      SELECT
        t.*,
        assignedBy.name as assigned_by_name,
        assignedTo.name as assigned_to_name
      FROM tasks t
      LEFT JOIN users assignedBy ON t.assigned_by_user_id = assignedBy.id
      LEFT JOIN users assignedTo ON t.assigned_to_user_id = assignedTo.id
      ORDER BY t.created_at DESC
    `).all();

    // Transform to match frontend format
    const formattedTasks = tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      assignedBy: t.assigned_by_name,
      assignedByUserId: t.assigned_by_user_id,
      assignedTo: t.assigned_to_user_id,
      assignedToName: t.assigned_to_name,
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
    const tasks = await db.prepare(`
      SELECT
        t.*,
        assignedBy.name as assigned_by_name
      FROM tasks t
      LEFT JOIN users assignedBy ON t.assigned_by_user_id = assignedBy.id
      WHERE t.assigned_to_user_id = ?
      ORDER BY t.created_at DESC
    `).all(req.user.id);

    const formattedTasks = tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      assignedBy: t.assigned_by_name,
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
    const tasks = await db.prepare(`
      SELECT
        t.*,
        assignedTo.name as assigned_to_name
      FROM tasks t
      LEFT JOIN users assignedTo ON t.assigned_to_user_id = assignedTo.id
      WHERE t.assigned_by_user_id = ?
      ORDER BY t.created_at DESC
    `).all(req.user.id);

    const formattedTasks = tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      assignedBy: req.user.name,
      assignedByUserId: t.assigned_by_user_id,
      assignedTo: t.assigned_to_user_id,
      assignedToName: t.assigned_to_name,
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

    await db.prepare(`
      INSERT INTO tasks (id, title, description, assigned_by_user_id, assigned_to_user_id, due_date, due_time, status, priority, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(taskId, title, description || '', req.user.id, assignedTo, dueDate, dueTime, priority || 'medium', tagsString);

    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

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

    const existingTask = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const tagsString = Array.isArray(tags) ? tags.join(',') : (tags !== undefined ? tags : existingTask.tags);

    await db.prepare(`
      UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        due_date = COALESCE(?, due_date),
        due_time = COALESCE(?, due_time),
        tags = ?
      WHERE id = ?
    `).run(title, description, status, priority, dueDate, dueTime, tagsString, id);

    const updatedTask = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

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

    const existingTask = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
