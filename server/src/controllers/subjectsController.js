const Subject = require('../models/Subject');

const subjectsController = {
  getAll: async (req, res) => {
    try {
      const subjects = await Subject.find({}).sort({ name: 1 }).lean();
      res.json({ 
        success: true, 
        message: 'Subjects retrieved successfully', 
        data: subjects, 
        count: subjects.length 
      });
    } catch (error) {
      console.error('[SubjectsController] Error retrieving subjects:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error retrieving subjects', 
        error: error.message 
      });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const subject = await Subject.findById(id).lean();
      
      if (!subject) {
        return res.status(404).json({ 
          success: false, 
          message: 'Subject not found' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Subject retrieved successfully', 
        data: subject 
      });
    } catch (error) {
      console.error('[SubjectsController] Error retrieving subject:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid subject ID format',
          error: error.message
        });
      }
      res.status(500).json({ 
        success: false, 
        message: 'Error retrieving subject', 
        error: error.message 
      });
    }
  },

  create: async (req, res) => {
    try {
      const payload = req.body || {};
      
      if (!payload.name || typeof payload.name !== 'string' || payload.name.trim().length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Name is required and must be a non-empty string' 
        });
      }

      const subjectData = {
        name: payload.name.trim(),
        color: payload.color || '#3b82f6',
        hoursSpent: payload.hoursSpent || 0,
        description: payload.description || '',
        teacher: payload.teacher || '',
        userId: payload.userId || null
      };

      const subject = new Subject(subjectData);
      await subject.save();

      res.status(201).json({ 
        success: true, 
        message: 'Subject created successfully', 
        data: subject 
      });
    } catch (error) {
      console.error('[SubjectsController] Error creating subject:', error);
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'A subject with this name already exists',
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
        message: 'Error creating subject', 
        error: error.message 
      });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};
      
      delete updates._id;
      delete updates.createdAt;
      
      if (updates.name) {
        updates.name = updates.name.trim();
      }

      const subject = await Subject.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!subject) {
        return res.status(404).json({ 
          success: false, 
          message: 'Subject not found' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Subject updated successfully', 
        data: subject 
      });
    } catch (error) {
      console.error('[SubjectsController] Error updating subject:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid subject ID format',
          error: error.message
        });
      }
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'A subject with this name already exists',
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
        message: 'Error updating subject', 
        error: error.message 
      });
    }
  },

  remove: async (req, res) => {
    try {
      const { id } = req.params;
      const subject = await Subject.findByIdAndDelete(id);

      if (!subject) {
        return res.status(404).json({ 
          success: false, 
          message: 'Subject not found' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Subject deleted successfully', 
        data: { id: subject._id } 
      });
    } catch (error) {
      console.error('[SubjectsController] Error deleting subject:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid subject ID format',
          error: error.message
        });
      }
      res.status(500).json({ 
        success: false, 
        message: 'Error deleting subject', 
        error: error.message 
      });
    }
  }
};

module.exports = subjectsController;
