const Assessment = require('../models/Assessment');

function isISODate(val) {
  if (val == null) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

function validateAssessmentPayload(payload, isUpdate = false) {
  const errors = [];
  if (!isUpdate && (!payload.title || typeof payload.title !== 'string' || payload.title.trim().length === 0)) {
    errors.push({ field: 'title', message: 'Title is required' });
  }
  if (payload.title && typeof payload.title !== 'string') {
    errors.push({ field: 'title', message: 'Title must be a string' });
  }
  if (payload.subject && typeof payload.subject !== 'string') {
    errors.push({ field: 'subject', message: 'Subject must be a string' });
  }
  if (payload.date && !isISODate(payload.date)) {
    errors.push({ field: 'date', message: 'date must be a valid date string' });
  }
  if (payload.scoreHistory && !Array.isArray(payload.scoreHistory)) {
    errors.push({ field: 'scoreHistory', message: 'scoreHistory must be an array of numbers' });
  }
  if (Array.isArray(payload.scoreHistory) && payload.scoreHistory.some(n => typeof n !== 'number')) {
    errors.push({ field: 'scoreHistory', message: 'scoreHistory must contain only numbers' });
  }
  if (payload.resources && !Array.isArray(payload.resources)) {
    errors.push({ field: 'resources', message: 'resources must be an array' });
  }
  return { valid: errors.length === 0, errors };
}

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

const assessmentsController = {
  getAssessments: async (req, res) => {
    try {
      const { subject, from, to, status } = req.query || {};
      const query = {};

      // Filtering
      if (subject) {
        query.subject = subject;
      }
      if (status) {
        query.status = status;
      }
      if (from || to) {
        query.date = {};
        if (from) {
          query.date.$gte = new Date(from);
        }
        if (to) {
          query.date.$lte = new Date(to);
        }
      }

      const assessments = await Assessment.find(query).sort({ date: 1 }).lean();
      
      const formattedAssessments = assessments.map(a => ({
        id: a._id.toString(),
        ...a,
        _id: undefined,
        __v: undefined
      }));

      res.json({ 
        success: true, 
        message: 'Assessments retrieved successfully', 
        data: formattedAssessments, 
        count: formattedAssessments.length 
      });
    } catch (error) {
      console.error('Error retrieving assessments:', error);
      res.status(500).json({ success: false, message: 'Error retrieving assessments', error: error.message });
    }
  },

  getAssessmentById: async (req, res) => {
    try {
      const { id } = req.params;
      const assessment = await Assessment.findById(id).lean();
      
      if (!assessment) {
        return res.status(404).json({ success: false, message: 'Assessment not found' });
      }
      
      const formattedAssessment = {
        id: assessment._id.toString(),
        ...assessment,
        _id: undefined,
        __v: undefined
      };
      
      res.json({ success: true, message: 'Assessment retrieved successfully', data: formattedAssessment });
    } catch (error) {
      console.error('Error retrieving assessment:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid assessment ID format' });
      }
      
      res.status(500).json({ success: false, message: 'Error retrieving assessment', error: error.message });
    }
  },

  createAssessment: async (req, res) => {
    try {
      const payload = req.body || {};
      const { valid, errors } = validateAssessmentPayload(payload, false);
      
      if (!valid) {
        return res.status(400).json({ success: false, message: 'Invalid assessment payload', errors });
      }

      const assessmentData = {
        title: payload.title.trim(),
        subject: payload.subject || '',
        date: payload.date ? new Date(payload.date) : new Date(),
        type: payload.type || 'exam',
        status: payload.status || 'upcoming',
        weight: payload.weight || 0,
        scoreHistory: payload.scoreHistory || [],
        resources: payload.resources || [],
        notes: payload.notes || ''
      };

      const assessment = new Assessment(assessmentData);
      await assessment.save();
      
      const formattedAssessment = toResponseFormat(assessment);

      res.status(201).json({ success: true, message: 'Assessment created successfully', data: formattedAssessment });
    } catch (error) {
      console.error('Error creating assessment:', error);
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        return res.status(400).json({ success: false, message: 'Validation error', errors: validationErrors });
      }
      
      res.status(500).json({ success: false, message: 'Error creating assessment', error: error.message });
    }
  },

  updateAssessment: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};
      const { valid, errors } = validateAssessmentPayload(updates, true);
      
      if (!valid) {
        return res.status(400).json({ success: false, message: 'Invalid assessment payload', errors });
      }

      const updateData = {};
      if (updates.title) updateData.title = updates.title.trim();
      if (updates.subject !== undefined) updateData.subject = updates.subject;
      if (updates.date !== undefined) updateData.date = new Date(updates.date);
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.weight !== undefined) updateData.weight = updates.weight;
      if (updates.scoreHistory !== undefined) updateData.scoreHistory = updates.scoreHistory;
      if (updates.resources !== undefined) updateData.resources = updates.resources;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      const assessment = await Assessment.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).lean();

      if (!assessment) {
        return res.status(404).json({ success: false, message: 'Assessment not found' });
      }

      const formattedAssessment = {
        id: assessment._id.toString(),
        ...assessment,
        _id: undefined,
        __v: undefined
      };

      res.json({ success: true, message: 'Assessment updated successfully', data: formattedAssessment });
    } catch (error) {
      console.error('Error updating assessment:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid assessment ID format' });
      }
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        return res.status(400).json({ success: false, message: 'Validation error', errors: validationErrors });
      }
      
      res.status(500).json({ success: false, message: 'Error updating assessment', error: error.message });
    }
  },

  deleteAssessment: async (req, res) => {
    try {
      const { id } = req.params;
      const assessment = await Assessment.findByIdAndDelete(id);

      if (!assessment) {
        return res.status(404).json({ success: false, message: 'Assessment not found' });
      }

      res.json({ success: true, message: 'Assessment deleted successfully', data: { id } });
    } catch (error) {
      console.error('Error deleting assessment:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid assessment ID format' });
      }
      
      res.status(500).json({ success: false, message: 'Error deleting assessment', error: error.message });
    }
  }
};

module.exports = assessmentsController;
