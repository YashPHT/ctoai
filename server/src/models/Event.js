const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  date: {
    type: Date,
    required: [true, 'Event date is required'],
    index: true
  },
  startTime: {
    type: String,
    trim: true
  },
  endTime: {
    type: String,
    trim: true
  },
  subject: {
    type: String,
    trim: true,
    maxlength: 100,
    index: true
  },
  type: {
    type: String,
    enum: ['exam', 'quiz', 'assignment', 'presentation', 'class', 'lab', 'meeting', 'study-session', 'other'],
    default: 'other'
  },
  location: {
    type: String,
    trim: true,
    maxlength: 200
  },
  color: {
    type: String,
    trim: true,
    default: '#3b82f6',
    validate: {
      validator: function(v) {
        return !v || /^#[0-9A-Fa-f]{6}$/.test(v);
      },
      message: 'Color must be a valid hex color code'
    }
  },
  isAllDay: {
    type: Boolean,
    default: false
  },
  reminder: {
    enabled: {
      type: Boolean,
      default: false
    },
    minutesBefore: {
      type: Number,
      min: 0,
      default: 30
    }
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrence: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      default: 'weekly'
    },
    interval: {
      type: Number,
      min: 1,
      default: 1
    },
    endDate: {
      type: Date
    }
  },
  notes: {
    type: String,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled',
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
eventSchema.index({ userId: 1, date: 1 });
eventSchema.index({ userId: 1, subject: 1 });
eventSchema.index({ userId: 1, type: 1 });
eventSchema.index({ userId: 1, status: 1 });
eventSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Event', eventSchema);
