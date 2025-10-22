const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
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
    maxlength: 100,
    index: true
  },
  date: {
    type: Date,
    required: [true, 'Assessment date is required'],
    index: true
  },
  type: {
    type: String,
    enum: ['exam', 'quiz', 'assignment', 'project', 'presentation', 'lab', 'midterm', 'final', 'other'],
    default: 'exam'
  },
  status: {
    type: String,
    enum: ['upcoming', 'in-progress', 'completed', 'graded', 'missed'],
    default: 'upcoming',
    index: true
  },
  weight: {
    type: Number,
    min: 0,
    max: 1,
    default: 0,
    comment: 'Weight of this assessment in the final grade (0-1)'
  },
  totalPoints: {
    type: Number,
    min: 0
  },
  earnedPoints: {
    type: Number,
    min: 0
  },
  grade: {
    type: String,
    trim: true
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  scoreHistory: [{
    type: Number,
    min: 0,
    max: 100
  }],
  resources: [{
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    }
  }],
  topics: [{
    type: String,
    trim: true,
    maxlength: 200
  }],
  studyTime: {
    type: Number,
    min: 0,
    default: 0,
    comment: 'Total study time in minutes'
  },
  notes: {
    type: String,
    maxlength: 2000
  },
  isGraded: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound indexes
assessmentSchema.index({ userId: 1, status: 1 });
assessmentSchema.index({ userId: 1, date: 1 });
assessmentSchema.index({ userId: 1, subject: 1 });
assessmentSchema.index({ subject: 1, status: 1 });
assessmentSchema.index({ date: 1, status: 1 });

// Pre-save middleware to calculate percentage
assessmentSchema.pre('save', function(next) {
  if (this.totalPoints && this.earnedPoints !== undefined) {
    this.percentage = Math.round((this.earnedPoints / this.totalPoints) * 100);
  }
  
  if (this.earnedPoints !== undefined && !this.isGraded) {
    this.isGraded = true;
    this.status = 'graded';
  }
  
  next();
});

// Method to add a score to history
assessmentSchema.methods.addScore = function(score) {
  if (!this.scoreHistory) {
    this.scoreHistory = [];
  }
  this.scoreHistory.push(score);
  return this;
};

// Method to calculate average score from history
assessmentSchema.methods.getAverageScore = function() {
  if (!this.scoreHistory || this.scoreHistory.length === 0) {
    return null;
  }
  const sum = this.scoreHistory.reduce((acc, score) => acc + score, 0);
  return Math.round(sum / this.scoreHistory.length);
};

module.exports = mongoose.model('Assessment', assessmentSchema);
