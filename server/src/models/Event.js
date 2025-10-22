const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  date: {
    type: Date,
    required: [true, 'Event date is required'],
    index: true
  },
  type: {
    type: String,
    enum: ['exam', 'quiz', 'assignment', 'project', 'presentation', 'other'],
    default: 'other'
  },
  subject: {
    type: String,
    trim: true,
    index: true
  },
  location: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  duration: {
    type: Number,
    min: [0, 'Duration cannot be negative']
  },
  completed: {
    type: Boolean,
    default: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes
eventSchema.index({ userId: 1, date: 1 });
eventSchema.index({ date: 1, type: 1 });
eventSchema.index({ subject: 1, date: 1 });

// Method to check if event is upcoming
eventSchema.methods.isUpcoming = function() {
  return new Date(this.date) > new Date();
};

// Static method to find upcoming events
eventSchema.statics.findUpcoming = function(userId = null, days = 7) {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);
  
  const query = {
    date: { $gte: now, $lte: future }
  };
  if (userId) query.userId = userId;
  
  return this.find(query).sort({ date: 1 });
};

module.exports = mongoose.model('Event', eventSchema);
