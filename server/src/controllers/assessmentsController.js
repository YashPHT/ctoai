const Assessment = require('../models/Assessment');

const assessmentsController = {
  getAll: async (req, res) => {
    try {
      const { status, subject } = req.query;
      const query = { userId: req.user._id };
      
      if (status) query.status = status;
      if (subject) query.subject = subject;
      
      const assessments = await Assessment.find(query).sort({ date: 1 }).lean();
      
      res.json({
        success: true,
        message: 'Assessments retrieved successfully',
        data: assessments,
        count: assessments.length
      });
    } catch (error) {
      console.error('[AssessmentsController] Error retrieving assessments:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving assessments',
        error: error.message
      });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const assessment = await Assessment.findOne({ _id: id, userId: req.user._id }).lean();
      
      if (!assessment) {
        return res.status(404).json({
          success: false,
          message: 'Assessment not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Assessment retrieved successfully',
        data: assessment
      });
    } catch (error) {
      console.error('[AssessmentsController] Error retrieving assessment:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid assessment ID format',
          error: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error retrieving assessment',
        error: error.message
      });
    }
  },

  create: async (req, res) => {
    try {
      const payload = req.body || {};
      
      if (!payload.title || typeof payload.title !== 'string' || payload.title.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Title is required and must be a non-empty string'
        });
      }
      
      if (!payload.subject) {
        return res.status(400).json({
          success: false,
          message: 'Subject is required'
        });
      }
      
      if (!payload.date) {
        return res.status(400).json({
          success: false,
          message: 'Date is required'
        });
      }

      const assessmentData = {
        title: payload.title.trim(),
        subject: payload.subject,
        date: new Date(payload.date),
        status: payload.status || 'upcoming',
        weight: payload.weight || 0,
        scoreHistory: Array.isArray(payload.scoreHistory) ? payload.scoreHistory : [],
        resources: Array.isArray(payload.resources) ? payload.resources : [],
        description: payload.description || '',
        userId: req.user._id
      };

      const assessment = new Assessment(assessmentData);
      await assessment.save();

      res.status(201).json({
        success: true,
        message: 'Assessment created successfully',
        data: assessment
      });
    } catch (error) {
      console.error('[AssessmentsController] Error creating assessment:', error);
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
        message: 'Error creating assessment',
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
      
      if (updates.title) {
        updates.title = updates.title.trim();
      }
      
      if (updates.date) {
        updates.date = new Date(updates.date);
      }

      const assessment = await Assessment.findOneAndUpdate(
        { _id: id, userId: req.user._id },
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!assessment) {
        return res.status(404).json({
          success: false,
          message: 'Assessment not found'
        });
      }

      res.json({
        success: true,
        message: 'Assessment updated successfully',
        data: assessment
      });
    } catch (error) {
      console.error('[AssessmentsController] Error updating assessment:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid assessment ID format',
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
        message: 'Error updating assessment',
        error: error.message
      });
    }
  },

  remove: async (req, res) => {
    try {
      const { id } = req.params;
      const assessment = await Assessment.findOneAndDelete({ _id: id, userId: req.user._id });

      if (!assessment) {
        return res.status(404).json({
          success: false,
          message: 'Assessment not found'
        });
      }

      res.json({
        success: true,
        message: 'Assessment deleted successfully',
        data: { id: assessment._id }
      });
    } catch (error) {
      console.error('[AssessmentsController] Error deleting assessment:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid assessment ID format',
          error: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error deleting assessment',
        error: error.message
      });
    }
  }
};

module.exports = assessmentsController;
