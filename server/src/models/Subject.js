const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true,
    maxlength: [100, 'Subject name cannot exceed 100 characters'],
    index: true
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
  hoursPerWeek: {
    type: Number,
    min: 0,
    default: 0,
    comment: 'Target hours per week for this subject'
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  instructor: {
    type: String,
    trim: true,
    maxlength: 100
  },
  room: {
    type: String,
    trim: true,
    maxlength: 50
  },
  credits: {
    type: Number,
    min: 0,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes
subjectSchema.index({ userId: 1, name: 1 });
subjectSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Subject', subjectSchema);
