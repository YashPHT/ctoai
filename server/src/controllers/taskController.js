const Task = require('../models/Task');

const taskController = {
  getAllTasks: async (req, res) => {
    try {
      const tasks = [
        {
          id: '1',
          title: 'Complete Math Assignment',
          description: 'Solve problems 1-20 from Chapter 5',
          subject: 'Mathematics',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          priority: 'High',
          urgency: 'high',
          difficulty: 'moderate',
          status: 'pending',
          estimatedDuration: 120
        },
        {
          id: '2',
          title: 'Read Biology Chapter',
          description: 'Read and take notes on Chapter 3',
          subject: 'Biology',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          priority: 'Medium',
          urgency: 'medium',
          difficulty: 'easy',
          status: 'pending',
          estimatedDuration: 90
        }
      ];

      res.json({
        success: true,
        message: 'Tasks retrieved successfully (placeholder data)',
        data: tasks,
        count: tasks.length
      });
    } catch (error) {
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

      res.json({
        success: true,
        message: 'Task retrieved successfully (placeholder data)',
        data: {
          id,
          title: 'Sample Task',
          description: 'This is a placeholder task',
          subject: 'General',
          dueDate: new Date(),
          priority: 'Medium',
          urgency: 'medium',
          difficulty: 'moderate',
          status: 'pending'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving task',
        error: error.message
      });
    }
  },

  createTask: async (req, res) => {
    try {
      const taskData = req.body;

      res.status(201).json({
        success: true,
        message: 'Task created successfully (placeholder)',
        data: {
          id: Date.now().toString(),
          ...taskData,
          status: 'pending',
          createdAt: new Date()
        }
      });
    } catch (error) {
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
      const updates = req.body;

      res.json({
        success: true,
        message: 'Task updated successfully (placeholder)',
        data: {
          id,
          ...updates,
          updatedAt: new Date()
        }
      });
    } catch (error) {
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

      res.json({
        success: true,
        message: 'Task deleted successfully (placeholder)',
        data: { id }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting task',
        error: error.message
      });
    }
  }
};

module.exports = taskController;
