const Task = require('../models/Task');

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const STATUSES = ['pending', 'in-progress', 'completed', 'overdue', 'cancelled'];

function isISODate(val) {
  if (val == null) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

function validateTaskPayload(payload, isUpdate = false) {
  const errors = [];
  if (!isUpdate && (!payload.title || typeof payload.title !== 'string' || payload.title.trim().length === 0)) {
    errors.push({ field: 'title', message: 'Title is required' });
  }
  if (payload.title && typeof payload.title !== 'string') {
    errors.push({ field: 'title', message: 'Title must be a string' });
  }
  if (payload.description && typeof payload.description !== 'string') {
    errors.push({ field: 'description', message: 'Description must be a string' });
  }
  if (payload.subject && typeof payload.subject !== 'string') {
    errors.push({ field: 'subject', message: 'Subject must be a string' });
  }
  if (payload.priority && !PRIORITIES.includes(payload.priority)) {
    errors.push({ field: 'priority', message: `Priority must be one of: ${PRIORITIES.join(', ')}` });
  }
  if (payload.status && !STATUSES.includes(payload.status)) {
    errors.push({ field: 'status', message: `Status must be one of: ${STATUSES.join(', ')}` });
  }
  if (payload.dueDate && !isISODate(payload.dueDate)) {
    errors.push({ field: 'dueDate', message: 'dueDate must be a valid date string' });
  }
  if (payload.estimatedDuration != null && typeof payload.estimatedDuration !== 'number') {
    errors.push({ field: 'estimatedDuration', message: 'estimatedDuration must be a number (minutes)' });
  }
  if (payload.actualDuration != null && typeof payload.actualDuration !== 'number') {
    errors.push({ field: 'actualDuration', message: 'actualDuration must be a number (minutes)' });
  }
  if (payload.tags && !Array.isArray(payload.tags)) {
    errors.push({ field: 'tags', message: 'tags must be an array of strings' });
  }
  return { valid: errors.length === 0, errors };
}

// Helper to convert MongoDB document to plain object with 'id' field for backward compatibility
function toResponseFormat(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: obj._id.toString(),
    ...obj,
    _id: undefined,
    __v: undefined
  };
}

const taskController = {
  getAllTasks: async (req, res) => {
    try {
      const query = {};
      
      // Support filtering by status, subject, priority
      if (req.query.status) {
        query.status = req.query.status;
      }
      if (req.query.subject) {
        query.subject = req.query.subject;
      }
      if (req.query.priority) {
        query.priority = req.query.priority;
      }
      
      const tasks = await Task.find(query).sort({ priorityScore: -1, dueDate: 1 }).lean();
      
      // Convert to response format with 'id' field
      const formattedTasks = tasks.map(task => ({
        id: task._id.toString(),
        ...task,
        _id: undefined,
        __v: undefined
      }));
      
      res.json({
        success: true,
        message: 'Tasks retrieved successfully',
        data: formattedTasks,
        count: formattedTasks.length
      });
    } catch (error) {
      console.error('Error retrieving tasks:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving tasks',
        error: error.message
      });
    }
  },

  getTaskById: async (req, res) => {
    try {
      const { id } = req.params;
      const task = await Task.findById(id).lean();
      
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      
      const formattedTask = {
        id: task._id.toString(),
        ...task,
        _id: undefined,
        __v: undefined
      };
      
      res.json({ success: true, message: 'Task retrieved successfully', data: formattedTask });
    } catch (error) {
      console.error('Error retrieving task:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid task ID format' });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error retrieving task',
        error: error.message
      });
    }
  },

  createTask: async (req, res) => {
    try {
      const payload = req.body || {};
      const { valid, errors } = validateTaskPayload(payload, false);
      
      if (!valid) {
        return res.status(400).json({ success: false, message: 'Invalid task payload', errors });
      }

      const taskData = {
        title: payload.title.trim(),
        description: payload.description || '',
        subject: payload.subject || null,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        priority: payload.priority || 'Medium',
        urgency: payload.urgency || null,
        difficulty: payload.difficulty || null,
        preparation: payload.preparation || 'minimal',
        revision: payload.revision || 0,
        status: payload.status || 'pending',
        estimatedDuration: typeof payload.estimatedDuration === 'number' ? payload.estimatedDuration : null,
        actualDuration: typeof payload.actualDuration === 'number' ? payload.actualDuration : null,
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        notes: payload.notes || ''
      };

      const task = new Task(taskData);
      await task.save();
      
      const formattedTask = toResponseFormat(task);

      res.status(201).json({ success: true, message: 'Task created successfully', data: formattedTask });
    } catch (error) {
      console.error('Error creating task:', error);
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        return res.status(400).json({ success: false, message: 'Validation error', errors: validationErrors });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error creating task',
        error: error.message
      });
    }
  },

  updateTask: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};
      const { valid, errors } = validateTaskPayload(updates, true);
      
      if (!valid) {
        return res.status(400).json({ success: false, message: 'Invalid task payload', errors });
      }

      // Prepare update data
      const updateData = {};
      if (updates.title) updateData.title = updates.title.trim();
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.subject !== undefined) updateData.subject = updates.subject;
      if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
      if (updates.priority) updateData.priority = updates.priority;
      if (updates.urgency !== undefined) updateData.urgency = updates.urgency;
      if (updates.difficulty !== undefined) updateData.difficulty = updates.difficulty;
      if (updates.preparation !== undefined) updateData.preparation = updates.preparation;
      if (updates.revision !== undefined) updateData.revision = updates.revision;
      if (updates.status) updateData.status = updates.status;
      if (updates.estimatedDuration !== undefined) updateData.estimatedDuration = updates.estimatedDuration;
      if (updates.actualDuration !== undefined) updateData.actualDuration = updates.actualDuration;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      const task = await Task.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).lean();

      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      const formattedTask = {
        id: task._id.toString(),
        ...task,
        _id: undefined,
        __v: undefined
      };

      res.json({ success: true, message: 'Task updated successfully', data: formattedTask });
    } catch (error) {
      console.error('Error updating task:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid task ID format' });
      }
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        return res.status(400).json({ success: false, message: 'Validation error', errors: validationErrors });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating task',
        error: error.message
      });
    }
  },

  deleteTask: async (req, res) => {
    try {
      const { id } = req.params;
      const task = await Task.findByIdAndDelete(id);

      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      res.json({ success: true, message: 'Task deleted successfully', data: { id } });
    } catch (error) {
      console.error('Error deleting task:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid task ID format' });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error deleting task',
        error: error.message
      });
    }
  }
};

module.exports = taskController;
