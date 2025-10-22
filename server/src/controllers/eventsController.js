const Event = require('../models/Event');

const eventsController = {
  getAll: async (req, res) => {
    try {
      const { type, subject, upcoming } = req.query;
      const query = {};
      
      if (type) query.type = type;
      if (subject) query.subject = subject;
      if (upcoming === 'true') {
        query.date = { $gte: new Date() };
      }
      
      const events = await Event.find(query).sort({ date: 1 }).lean();
      
      res.json({
        success: true,
        message: 'Events retrieved successfully',
        data: events,
        count: events.length
      });
    } catch (error) {
      console.error('[EventsController] Error retrieving events:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving events',
        error: error.message
      });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const event = await Event.findById(id).lean();
      
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Event retrieved successfully',
        data: event
      });
    } catch (error) {
      console.error('[EventsController] Error retrieving event:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid event ID format',
          error: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error retrieving event',
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
      
      if (!payload.date) {
        return res.status(400).json({
          success: false,
          message: 'Date is required'
        });
      }

      const eventData = {
        title: payload.title.trim(),
        date: new Date(payload.date),
        type: payload.type || 'other',
        subject: payload.subject || '',
        location: payload.location || '',
        description: payload.description || '',
        duration: payload.duration || null,
        completed: payload.completed || false,
        userId: payload.userId || null
      };

      const event = new Event(eventData);
      await event.save();

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: event
      });
    } catch (error) {
      console.error('[EventsController] Error creating event:', error);
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
        message: 'Error creating event',
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

      const event = await Event.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      res.json({
        success: true,
        message: 'Event updated successfully',
        data: event
      });
    } catch (error) {
      console.error('[EventsController] Error updating event:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid event ID format',
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
        message: 'Error updating event',
        error: error.message
      });
    }
  },

  remove: async (req, res) => {
    try {
      const { id } = req.params;
      const event = await Event.findByIdAndDelete(id);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      res.json({
        success: true,
        message: 'Event deleted successfully',
        data: { id: event._id }
      });
    } catch (error) {
      console.error('[EventsController] Error deleting event:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid event ID format',
          error: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error deleting event',
        error: error.message
      });
    }
  }
};

module.exports = eventsController;
