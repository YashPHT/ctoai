const Subject = require('../models/Subject');

function validateSubjectPayload(payload, isUpdate = false) {
  const errors = [];
  if (!isUpdate && (!payload.name || typeof payload.name !== 'string' || payload.name.trim().length === 0)) {
    errors.push({ field: 'name', message: 'Name is required' });
  }
  if (payload.name && typeof payload.name !== 'string') {
    errors.push({ field: 'name', message: 'Name must be a string' });
  }
  if (payload.color && typeof payload.color !== 'string') {
    errors.push({ field: 'color', message: 'Color must be a string' });
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

const subjectsController = {
  getAll: async (req, res) => {
    try {
      const query = {};
      
      // Support filtering by isActive
      if (req.query.isActive !== undefined) {
        query.isActive = req.query.isActive === 'true';
      }
      
      const subjects = await Subject.find(query).sort({ name: 1 }).lean();
      
      const formattedSubjects = subjects.map(subject => ({
        id: subject._id.toString(),
        ...subject,
        _id: undefined,
        __v: undefined
      }));
      
      res.json({ 
        success: true, 
        message: 'Subjects retrieved successfully', 
        data: formattedSubjects, 
        count: formattedSubjects.length 
      });
    } catch (error) {
      console.error('Error retrieving subjects:', error);
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
        return res.status(404).json({ success: false, message: 'Subject not found' });
      }
      
      const formattedSubject = {
        id: subject._id.toString(),
        ...subject,
        _id: undefined,
        __v: undefined
      };
      
      res.json({ success: true, message: 'Subject retrieved successfully', data: formattedSubject });
    } catch (error) {
      console.error('Error retrieving subject:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid subject ID format' });
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
      const { valid, errors } = validateSubjectPayload(payload, false);
      
      if (!valid) {
        return res.status(400).json({ success: false, message: 'Invalid subject payload', errors });
      }

      const subjectData = {
        name: payload.name.trim(),
        color: payload.color || undefined,
        hoursPerWeek: payload.hoursPerWeek || 0,
        description: payload.description || '',
        instructor: payload.instructor || '',
        room: payload.room || '',
        credits: payload.credits || 0
      };

      const subject = new Subject(subjectData);
      await subject.save();
      
      const formattedSubject = toResponseFormat(subject);

      res.status(201).json({ success: true, message: 'Subject created successfully', data: formattedSubject });
    } catch (error) {
      console.error('Error creating subject:', error);
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        return res.status(400).json({ success: false, message: 'Validation error', errors: validationErrors });
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
      const { valid, errors } = validateSubjectPayload(updates, true);
      
      if (!valid) {
        return res.status(400).json({ success: false, message: 'Invalid subject payload', errors });
      }

      const updateData = {};
      if (updates.name) updateData.name = updates.name.trim();
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.hoursPerWeek !== undefined) updateData.hoursPerWeek = updates.hoursPerWeek;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.instructor !== undefined) updateData.instructor = updates.instructor;
      if (updates.room !== undefined) updateData.room = updates.room;
      if (updates.credits !== undefined) updateData.credits = updates.credits;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

      const subject = await Subject.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).lean();

      if (!subject) {
        return res.status(404).json({ success: false, message: 'Subject not found' });
      }

      const formattedSubject = {
        id: subject._id.toString(),
        ...subject,
        _id: undefined,
        __v: undefined
      };

      res.json({ success: true, message: 'Subject updated successfully', data: formattedSubject });
    } catch (error) {
      console.error('Error updating subject:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid subject ID format' });
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
        return res.status(404).json({ success: false, message: 'Subject not found' });
      }

      res.json({ success: true, message: 'Subject deleted successfully', data: { id } });
    } catch (error) {
      console.error('Error deleting subject:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid subject ID format' });
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
