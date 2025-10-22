const Event = require('../models/Event');

function isISODate(val) {
  if (val == null) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

function validateEventPayload(payload, isUpdate = false) {
  const errors = [];
  if (!isUpdate && (!payload.title || typeof payload.title !== 'string' || payload.title.trim().length === 0)) {
    errors.push({ field: 'title', message: 'Title is required' });
  }
  if (!isUpdate && (!payload.date || !isISODate(payload.date))) {
    errors.push({ field: 'date', message: 'date is required and must be a valid date string' });
  }
  if (payload.title && typeof payload.title !== 'string') {
    errors.push({ field: 'title', message: 'Title must be a string' });
  }
  if (payload.date && !isISODate(payload.date)) {
    errors.push({ field: 'date', message: 'date must be a valid date string' });
  }
  if (payload.subject && typeof payload.subject !== 'string') {
    errors.push({ field: 'subject', message: 'Subject must be a string' });
  }
  if (payload.type && typeof payload.type !== 'string') {
    errors.push({ field: 'type', message: 'type must be a string' });
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

const eventsController = {
  getEvents: async (req, res) => {
    try {
      const query = {};
      
      // Support filtering
      if (req.query.status) {
        query.status = req.query.status;
      }
      if (req.query.subject) {
        query.subject = req.query.subject;
      }
      if (req.query.type) {
        query.type = req.query.type;
      }
      
      // Support date range filtering
      if (req.query.startDate || req.query.endDate) {
        query.date = {};
        if (req.query.startDate) {
          query.date.$gte = new Date(req.query.startDate);
        }
        if (req.query.endDate) {
          query.date.$lte = new Date(req.query.endDate);
        }
      }
      
      const events = await Event.find(query).sort({ date: 1 }).lean();
      
      const formattedEvents = events.map(event => ({
        id: event._id.toString(),
        ...event,
        _id: undefined,
        __v: undefined
      }));
      
      res.json({ 
        success: true, 
        message: 'Events retrieved successfully', 
        data: formattedEvents, 
        count: formattedEvents.length 
      });
    } catch (error) {
      console.error('Error retrieving events:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error retrieving events', 
        error: error.message 
      });
    }
  },

  getEventById: async (req, res) => {
    try {
      const { id } = req.params;
      const event = await Event.findById(id).lean();
      
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }
      
      const formattedEvent = {
        id: event._id.toString(),
        ...event,
        _id: undefined,
        __v: undefined
      };
      
      res.json({ success: true, message: 'Event retrieved successfully', data: formattedEvent });
    } catch (error) {
      console.error('Error retrieving event:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid event ID format' });
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Error retrieving event', 
        error: error.message 
      });
    }
  },

  createEvent: async (req, res) => {
    try {
      const payload = req.body || {};
      const { valid, errors } = validateEventPayload(payload, false);
      
      if (!valid) {
        return res.status(400).json({ success: false, message: 'Invalid event payload', errors });
      }

      const eventData = {
        title: payload.title.trim(),
        description: payload.description || '',
        date: new Date(payload.date),
        startTime: payload.startTime || '',
        endTime: payload.endTime || '',
        subject: payload.subject || null,
        type: payload.type || 'other',
        location: payload.location || '',
        color: payload.color || undefined,
        isAllDay: payload.isAllDay || false,
        notes: payload.notes || '',
        status: payload.status || 'scheduled'
      };

      const event = new Event(eventData);
      await event.save();
      
      const formattedEvent = toResponseFormat(event);

      res.status(201).json({ success: true, message: 'Event created successfully', data: formattedEvent });
    } catch (error) {
      console.error('Error creating event:', error);
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        return res.status(400).json({ success: false, message: 'Validation error', errors: validationErrors });
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Error creating event', 
        error: error.message 
      });
    }
  },

  updateEvent: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};
      const { valid, errors } = validateEventPayload(updates, true);
      
      if (!valid) {
        return res.status(400).json({ success: false, message: 'Invalid event payload', errors });
      }

      const updateData = {};
      if (updates.title) updateData.title = updates.title.trim();
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.date !== undefined) updateData.date = new Date(updates.date);
      if (updates.startTime !== undefined) updateData.startTime = updates.startTime;
      if (updates.endTime !== undefined) updateData.endTime = updates.endTime;
      if (updates.subject !== undefined) updateData.subject = updates.subject;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.isAllDay !== undefined) updateData.isAllDay = updates.isAllDay;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.status !== undefined) updateData.status = updates.status;

      const event = await Event.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).lean();

      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      const formattedEvent = {
        id: event._id.toString(),
        ...event,
        _id: undefined,
        __v: undefined
      };

      res.json({ success: true, message: 'Event updated successfully', data: formattedEvent });
    } catch (error) {
      console.error('Error updating event:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid event ID format' });
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
        message: 'Error updating event', 
        error: error.message 
      });
    }
  },

  deleteEvent: async (req, res) => {
    try {
      const { id } = req.params;
      const event = await Event.findByIdAndDelete(id);

      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      res.json({ success: true, message: 'Event deleted successfully', data: { id } });
    } catch (error) {
      console.error('Error deleting event:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid event ID format' });
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
