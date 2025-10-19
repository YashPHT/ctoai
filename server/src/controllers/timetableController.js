const datastore = require('../datastore');

const timetableController = {
  getTimetable: async (req, res) => {
    try {
      const timetable = datastore.get('timetable') || { weekStart: new Date().toISOString(), days: {}, updatedAt: new Date().toISOString() };
      res.json({
        success: true,
        message: 'Timetable retrieved successfully',
        data: timetable
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error retrieving timetable', error: error.message });
    }
  },

  upsertTimetable: async (req, res) => {
    try {
      const payload = req.body || {};
      if (typeof payload !== 'object' || Array.isArray(payload)) {
        return res.status(400).json({ success: false, message: 'Invalid timetable payload' });
      }

      let saved = null;
      await datastore.update('timetable', (current) => {
        const base = current || { weekStart: new Date().toISOString(), days: {}, updatedAt: new Date().toISOString() };
        const next = {
          ...base,
          ...payload,
          days: { ...(base.days || {}), ...(payload.days || {}) },
          updatedAt: new Date().toISOString()
        };
        saved = next;
        return next;
      });

      res.json({ success: true, message: 'Timetable saved successfully', data: saved });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error saving timetable', error: error.message });
    }
  }
};

module.exports = timetableController;
