const Timetable = require('../models/Timetable');

function isValidTime(t) {
  return typeof t === 'string' && /^([01]?\d|2[0-3]):[0-5]\d$/.test(t);
}

function validateTimetablePayload(payload) {
  const errors = [];
  if (payload == null || typeof payload !== 'object' || Array.isArray(payload)) {
    errors.push({ field: 'root', message: 'Payload must be an object' });
    return { valid: false, errors };
  }
  if (payload.days != null && typeof payload.days !== 'object') {
    errors.push({ field: 'days', message: 'days must be an object keyed by weekday' });
  }
  if (payload.days && typeof payload.days === 'object') {
    for (const [day, blocks] of Object.entries(payload.days)) {
      if (!Array.isArray(blocks)) {
        errors.push({ field: `days.${day}`, message: 'Each day must be an array of blocks' });
        continue;
      }
      blocks.forEach((b, idx) => {
        if (!b || typeof b !== 'object') {
          errors.push({ field: `days.${day}[${idx}]`, message: 'Block must be an object' });
          return;
        }
        if (b.subject != null && typeof b.subject !== 'string') {
          errors.push({ field: `days.${day}[${idx}].subject`, message: 'subject must be a string' });
        }
        if (b.start != null && !isValidTime(b.start)) {
          errors.push({ field: `days.${day}[${idx}].start`, message: 'start must be HH:MM (24h)' });
        }
        if (b.end != null && !isValidTime(b.end)) {
          errors.push({ field: `days.${day}[${idx}].end`, message: 'end must be HH:MM (24h)' });
        }
        if (b.start && b.end && isValidTime(b.start) && isValidTime(b.end)) {
          const [sh, sm] = b.start.split(':').map(Number);
          const [eh, em] = b.end.split(':').map(Number);
          const s = sh * 60 + sm; const e = eh * 60 + em;
          if (e <= s) {
            errors.push({ field: `days.${day}[${idx}].end`, message: 'end must be after start' });
          }
        }
        if (b.color != null && typeof b.color !== 'string') {
          errors.push({ field: `days.${day}[${idx}].color`, message: 'color must be a string' });
        }
      });
    }
  }
  return { valid: errors.length === 0, errors };
}

const timetableController = {
  getTimetable: async (req, res) => {
    try {
      // For now, we'll use a default userId. In production, this would come from auth middleware
      const userId = req.query.userId || 'default';
      
      let timetable = await Timetable.findOne({ userId }).lean();
      
      if (!timetable) {
        // Create a default timetable if it doesn't exist
        timetable = {
          version: 1,
          weekStart: new Date().toISOString(),
          days: {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: []
          },
          updatedAt: new Date().toISOString()
        };
      } else {
        // Format response - remove _id and __v
        timetable = {
          ...timetable,
          _id: undefined,
          __v: undefined
        };
      }
      
      res.json({
        success: true,
        message: 'Timetable retrieved successfully',
        data: timetable
      });
    } catch (error) {
      console.error('Error retrieving timetable:', error);
      res.status(500).json({ success: false, message: 'Error retrieving timetable', error: error.message });
    }
  },

  upsertTimetable: async (req, res) => {
    try {
      const payload = req.body || {};
      const { valid, errors } = validateTimetablePayload(payload);
      
      if (!valid) {
        return res.status(400).json({ success: false, message: 'Invalid timetable payload', errors });
      }

      // For now, we'll use a default userId. In production, this would come from auth middleware
      const userId = req.query.userId || payload.userId || 'default';
      
      // Check for version conflict if client sends version
      const currentTimetable = await Timetable.findOne({ userId });
      const clientVersion = typeof payload.version === 'number' ? payload.version : null;
      
      if (currentTimetable && clientVersion != null && clientVersion !== currentTimetable.version) {
        return res.status(409).json({ 
          success: false, 
          conflict: true, 
          message: 'Version conflict', 
          data: currentTimetable.toObject() 
        });
      }

      const updateData = {
        weekStart: payload.weekStart || (currentTimetable ? currentTimetable.weekStart : new Date()),
        days: payload.days || (currentTimetable ? currentTimetable.days : {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: []
        }),
        version: (currentTimetable ? currentTimetable.version : 0) + 1
      };

      const timetable = await Timetable.findOneAndUpdate(
        { userId },
        { $set: updateData },
        { new: true, upsert: true, runValidators: true }
      ).lean();

      const formattedTimetable = {
        ...timetable,
        _id: undefined,
        __v: undefined
      };

      res.json({ success: true, message: 'Timetable saved successfully', data: formattedTimetable });
    } catch (error) {
      console.error('Error saving timetable:', error);
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        return res.status(400).json({ success: false, message: 'Validation error', errors: validationErrors });
      }
      
      res.status(500).json({ success: false, message: 'Error saving timetable', error: error.message });
    }
  }
};

module.exports = timetableController;
