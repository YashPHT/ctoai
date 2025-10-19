let inMemoryTimetable = {
  weekStart: new Date().toISOString(),
  days: {
    monday: [
      { time: '09:00', subject: 'Mathematics', room: 'Room 101', durationMinutes: 60 },
      { time: '10:30', subject: 'Chemistry', room: 'Lab B', durationMinutes: 60 }
    ],
    tuesday: [
      { time: '09:00', subject: 'Physics', room: 'Lab A', durationMinutes: 60 },
      { time: '13:30', subject: 'History', room: 'Room 204', durationMinutes: 60 }
    ],
    wednesday: [
      { time: '11:00', subject: 'English', room: 'Room 110', durationMinutes: 60 }
    ],
    thursday: [
      { time: '14:00', subject: 'Biology', room: 'Room 303', durationMinutes: 90 }
    ],
    friday: [
      { time: '10:00', subject: 'Computer Science', room: 'Lab C', durationMinutes: 90 }
    ],
    saturday: [],
    sunday: []
  },
  updatedAt: new Date().toISOString()
};

const timetableController = {
  getTimetable: async (req, res) => {
    try {
      res.json({
        success: true,
        message: 'Timetable retrieved successfully',
        data: inMemoryTimetable
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error retrieving timetable', error: error.message });
    }
  },

  upsertTimetable: async (req, res) => {
    try {
      const payload = req.body || {};
      inMemoryTimetable = {
        ...inMemoryTimetable,
        ...payload,
        days: { ...inMemoryTimetable.days, ...(payload.days || {}) },
        updatedAt: new Date().toISOString()
      };

      res.json({ success: true, message: 'Timetable saved successfully', data: inMemoryTimetable });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error saving timetable', error: error.message });
    }
  }
};

module.exports = timetableController;
