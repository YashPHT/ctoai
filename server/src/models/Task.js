const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  subject: {
    type: String,
    trim: true,
    maxlength: 100,
    index: true
  },
  dueDate: {
    type: Date,
    index: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'moderate', 'challenging', 'difficult'],
    default: 'moderate'
  },
  preparation: {
    type: String,
    enum: ['none', 'minimal', 'moderate', 'extensive'],
    default: 'minimal'
  },
  revision: {
    type: Number,
    min: 0,
    default: 0,
    comment: 'Number of times this task has been revised'
  },
  priorityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50,
    index: true,
    comment: 'Computed priority score based on urgency, difficulty, and other factors'
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'overdue', 'cancelled'],
    default: 'pending',
    index: true
  },
  estimatedDuration: {
    type: Number,
    min: 0,
    default: 60,
    comment: 'Estimated duration in minutes'
  },
  actualDuration: {
    type: Number,
    min: 0,
    comment: 'Actual duration in minutes'
  },
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    maxlength: 2000
  },
  completedAt: {
    type: Date
  },
  reminderSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ userId: 1, priority: 1 });
taskSchema.index({ userId: 1, subject: 1 });
taskSchema.index({ status: 1, dueDate: 1 });
taskSchema.index({ subject: 1, status: 1 });

// Pre-save middleware to update completedAt and calculate priority score
taskSchema.pre('save', function(next) {
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  // Calculate priority score if not explicitly set
  if (this.isModified('urgency') || this.isModified('difficulty') || this.isModified('priority') || this.isModified('dueDate')) {
    this.priorityScore = this.calculatePriorityScore();
  }
  
  next();
});

// Method to calculate priority score
taskSchema.methods.calculatePriorityScore = function() {
  let score = 50; // Base score
  
  // Priority weight (0-30 points)
  const priorityWeights = { 'Low': 5, 'Medium': 15, 'High': 25, 'Urgent': 30 };
  score += priorityWeights[this.priority] || 15;
  
  // Urgency weight (0-25 points)
  const urgencyWeights = { 'low': 5, 'medium': 12, 'high': 20, 'critical': 25 };
  score += urgencyWeights[this.urgency] || 12;
  
  // Difficulty weight (0-20 points - harder tasks get higher priority)
  const difficultyWeights = { 'easy': 5, 'moderate': 10, 'challenging': 15, 'difficult': 20 };
  score += difficultyWeights[this.difficulty] || 10;
  
  // Due date proximity (0-25 points)
  if (this.dueDate) {
    const daysUntilDue = Math.ceil((new Date(this.dueDate) - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysUntilDue < 0) {
      score += 25; // Overdue
    } else if (daysUntilDue <= 1) {
      score += 25;
    } else if (daysUntilDue <= 3) {
      score += 20;
    } else if (daysUntilDue <= 7) {
      score += 15;
    } else if (daysUntilDue <= 14) {
      score += 10;
    } else {
      score += 5;
    }
  }
  
  return Math.min(100, Math.max(0, score));
};

module.exports = mongoose.model('Task', taskSchema);
