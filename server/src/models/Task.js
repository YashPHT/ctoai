const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  subject: {
    type: String,
    trim: true,
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
    enum: ['low', 'medium', 'high'],
    lowercase: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'moderate', 'hard'],
    lowercase: true
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'overdue', 'cancelled'],
    default: 'pending',
    index: true
  },
  completed: {
    type: Boolean,
    default: false,
    index: true
  },
  prepStatus: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed'],
    default: 'not-started'
  },
  revisionStatus: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed'],
    default: 'not-started'
  },
  priorityScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  estimatedDuration: {
    type: Number,
    min: [0, 'Duration cannot be negative']
  },
  actualDuration: {
    type: Number,
    min: [0, 'Duration cannot be negative']
  },
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
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

// Compound indexes for common queries
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ subject: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });

// Pre-save middleware to update completed flag based on status
taskSchema.pre('save', function(next) {
  if (this.status === 'completed') {
    this.completed = true;
  } else {
    this.completed = false;
  }
  next();
});

// Method to check if task is overdue
taskSchema.methods.isOverdue = function() {
  if (!this.dueDate || this.completed) return false;
  return new Date() > this.dueDate;
};

// Static method to find overdue tasks
taskSchema.statics.findOverdue = function(userId = null) {
  const query = {
    dueDate: { $lt: new Date() },
    completed: false
  };
  if (userId) query.userId = userId;
  return this.find(query);
};

module.exports = mongoose.model('Task', taskSchema);
