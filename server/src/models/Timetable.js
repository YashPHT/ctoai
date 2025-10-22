const mongoose = require('mongoose');

const timeBlockSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  start: {
    type: String,
    required: [true, 'Start time is required'],
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Start time must be in HH:MM format'
    }
  },
  end: {
    type: String,
    required: [true, 'End time is required'],
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'End time must be in HH:MM format'
    }
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  location: {
    type: String,
    trim: true,
    default: ''
  },
  notes: {
    type: String,
    trim: true,
    default: ''
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
  }
}, { _id: false });

const timetableSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
    unique: true
  },
  version: {
    type: Number,
    default: 1
  },
  weekStart: {
    type: Date,
    default: Date.now
  },
  days: {
    monday: {
      type: [timeBlockSchema],
      default: []
    },
    tuesday: {
      type: [timeBlockSchema],
      default: []
    },
    wednesday: {
      type: [timeBlockSchema],
      default: []
    },
    thursday: {
      type: [timeBlockSchema],
      default: []
    },
    friday: {
      type: [timeBlockSchema],
      default: []
    },
    saturday: {
      type: [timeBlockSchema],
      default: []
    },
    sunday: {
      type: [timeBlockSchema],
      default: []
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
timetableSchema.index({ userId: 1, isActive: 1 });

// Method to add a time block to a specific day
timetableSchema.methods.addTimeBlock = function(day, block) {
  if (!this.days[day.toLowerCase()]) {
    throw new Error('Invalid day of week');
  }
  this.days[day.toLowerCase()].push(block);
  return this;
};

// Method to remove a time block by id from a specific day
timetableSchema.methods.removeTimeBlock = function(day, blockId) {
  if (!this.days[day.toLowerCase()]) {
    throw new Error('Invalid day of week');
  }
  this.days[day.toLowerCase()] = this.days[day.toLowerCase()].filter(b => b.id !== blockId);
  return this;
};

module.exports = mongoose.model('Timetable', timetableSchema);
