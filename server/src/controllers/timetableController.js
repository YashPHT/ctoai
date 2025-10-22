const Timetable = require('../models/Timetable');

const timetableController = {
  getTimetable: async (req, res) => {
    try {
      // Get the first (and typically only) timetable
      // In a multi-user system, you'd filter by userId
      let timetable = await Timetable.findOne({}).lean();
      
      // If no timetable exists, return a default structure
      if (!timetable) {
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
      }
      
      res.json({
        success: true,
        message: 'Timetable retrieved successfully',
        data: timetable
      });
    } catch (error) {
      console.error('[TimetableController] Error retrieving timetable:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving timetable',
        error: error.message
      });
    }
  },

  updateTimetable: async (req, res) => {
    try {
      const payload = req.body || {};
      
      // Validate the structure
      if (!payload.days || typeof payload.days !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Invalid timetable structure: days object is required'
        });
      }

      // Try to find existing timetable
      let timetable = await Timetable.findOne({});
      
      if (timetable) {
        // Update existing timetable
        timetable.version = payload.version || timetable.version;
        timetable.weekStart = payload.weekStart ? new Date(payload.weekStart) : timetable.weekStart;
        timetable.days = payload.days;
        await timetable.save();
      } else {
        // Create new timetable
        timetable = new Timetable({
          version: payload.version || 1,
          weekStart: payload.weekStart ? new Date(payload.weekStart) : new Date(),
          days: payload.days,
          userId: payload.userId || null
        });
        await timetable.save();
      }
      
      res.json({
        success: true,
        message: 'Timetable updated successfully',
        data: timetable
      });
    } catch (error) {
      console.error('[TimetableController] Error updating timetable:', error);
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
        message: 'Error updating timetable',
        error: error.message
      });
    }
  }
};

module.exports = timetableController;
