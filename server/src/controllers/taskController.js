const Task = require('../models/Task');

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const STATUSES = ['pending', 'in-progress', 'completed', 'overdue', 'cancelled'];

const taskController = {
  getAllTasks: async (req, res) => {
    try {
      const { status, subject, completed } = req.query;
      const query = {};
      
      if (status) query.status = status;
      if (subject) query.subject = subject;
      if (completed !== undefined) query.completed = completed === 'true';
      
      const tasks = await Task.find(query).sort({ createdAt: -1 }).lean();
      
      res.json({
        success: true,
        message: 'Tasks retrieved successfully',
        data: tasks,
        count: tasks.length
      });
    } catch (error) {
      console.error('[TaskController] Error retrieving tasks:', error);
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
        return res.status(404).json({ 
          success: false, 
          message: 'Task not found' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Task retrieved successfully', 
        data: task 
      });
    } catch (error) {
      console.error('[TaskController] Error retrieving task:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid task ID format',
          error: error.message
        });
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
      
      // Validate required fields
      if (!payload.title || typeof payload.title !== 'string' || payload.title.trim().length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Title is required and must be a non-empty string' 
        });
      }

      // Create task data object
      const taskData = {
        title: payload.title.trim(),
        description: payload.description || '',
        subject: payload.subject || null,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        priority: payload.priority || 'Medium',
        urgency: payload.urgency || null,
        difficulty: payload.difficulty || null,
        status: payload.status || 'pending',
        completed: payload.completed || false,
        prepStatus: payload.prepStatus || 'not-started',
        revisionStatus: payload.revisionStatus || 'not-started',
        priorityScore: payload.priorityScore || 0,
        estimatedDuration: typeof payload.estimatedDuration === 'number' ? payload.estimatedDuration : null,
        actualDuration: typeof payload.actualDuration === 'number' ? payload.actualDuration : null,
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        notes: payload.notes || '',
        userId: payload.userId || null
      };

      const task = new Task(taskData);
      await task.save();
      
      res.status(201).json({ 
        success: true, 
        message: 'Task created successfully', 
        data: task 
      });
    } catch (error) {
      console.error('[TaskController] Error creating task:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.message,
          errors: Object.keys(error.errors).map(key => ({
            field: key,
            message: error.errors[key].message
          }))
        });
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
      
      // Remove fields that shouldn't be updated directly
      delete updates._id;
      delete updates.createdAt;
      
      // Trim title if provided
      if (updates.title) {
        updates.title = updates.title.trim();
      }
      
      // Parse dueDate if provided
      if (updates.dueDate) {
        updates.dueDate = new Date(updates.dueDate);
      }

      const task = await Task.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!task) {
        return res.status(404).json({ 
          success: false, 
          message: 'Task not found' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Task updated successfully', 
        data: task 
      });
    } catch (error) {
      console.error('[TaskController] Error updating task:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid task ID format',
          error: error.message
        });
      }
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.message,
          errors: Object.keys(error.errors).map(key => ({
            field: key,
            message: error.errors[key].message
          }))
        });
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
        return res.status(404).json({ 
          success: false, 
          message: 'Task not found' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Task deleted successfully', 
        data: { id: task._id } 
      });
    } catch (error) {
      console.error('[TaskController] Error deleting task:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid task ID format',
          error: error.message
        });
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
