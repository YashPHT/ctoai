const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

const assessmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Assessment title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    index: true
  },
  date: {
    type: Date,
    required: [true, 'Assessment date is required'],
    index: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'in-progress', 'completed', 'cancelled'],
    default: 'upcoming',
    index: true
  },
  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative'],
    max: [1, 'Weight cannot exceed 1'],
    default: 0
  },
  scoreHistory: [{
    type: Number,
    min: 0,
    max: 100
  }],
  resources: [resourceSchema],
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
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
assessmentSchema.index({ userId: 1, date: 1 });
assessmentSchema.index({ subject: 1, status: 1 });
assessmentSchema.index({ date: 1, status: 1 });

// Method to calculate average score
assessmentSchema.methods.getAverageScore = function() {
  if (!this.scoreHistory || this.scoreHistory.length === 0) return null;
  const sum = this.scoreHistory.reduce((acc, score) => acc + score, 0);
  return Math.round(sum / this.scoreHistory.length);
};

// Method to get latest score
assessmentSchema.methods.getLatestScore = function() {
  if (!this.scoreHistory || this.scoreHistory.length === 0) return null;
  return this.scoreHistory[this.scoreHistory.length - 1];
};

// Method to add a score
assessmentSchema.methods.addScore = function(score) {
  if (!this.scoreHistory) {
    this.scoreHistory = [];
  }
  this.scoreHistory.push(score);
  return this.save();
};

module.exports = mongoose.model('Assessment', assessmentSchema);
