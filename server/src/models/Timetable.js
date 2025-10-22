const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
  id: String,
  start: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format']
  },
  end: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    default: '#3b82f6'
  }
}, { _id: false });

const timetableSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
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
    monday: [blockSchema],
    tuesday: [blockSchema],
    wednesday: [blockSchema],
    thursday: [blockSchema],
    friday: [blockSchema],
    saturday: [blockSchema],
    sunday: [blockSchema]
  }
}, {
  timestamps: true
});

// Indexes
timetableSchema.index({ userId: 1 });
timetableSchema.index({ weekStart: 1 });

// Method to get all blocks for a specific day
timetableSchema.methods.getBlocksForDay = function(dayOfWeek) {
  const day = dayOfWeek.toLowerCase();
  return this.days[day] || [];
};

// Method to add a block to a specific day
timetableSchema.methods.addBlock = function(dayOfWeek, block) {
  const day = dayOfWeek.toLowerCase();
  if (!this.days[day]) {
    this.days[day] = [];
  }
  this.days[day].push(block);
  return this.save();
};

module.exports = mongoose.model('Timetable', timetableSchema);
