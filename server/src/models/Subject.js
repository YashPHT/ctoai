const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Subject name cannot exceed 100 characters']
  },
  color: {
    type: String,
    trim: true,
    match: [/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)'],
    default: '#3b82f6'
  },
  hoursSpent: {
    type: Number,
    default: 0,
    min: [0, 'Hours spent cannot be negative']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  teacher: {
    type: String,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }
}, {
  timestamps: true
});

// Indexes
subjectSchema.index({ name: 1 });
subjectSchema.index({ userId: 1 });

// Method to add hours
subjectSchema.methods.addHours = function(hours) {
  this.hoursSpent = (this.hoursSpent || 0) + hours;
  return this.save();
};

module.exports = mongoose.model('Subject', subjectSchema);
