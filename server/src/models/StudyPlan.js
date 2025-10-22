const mongoose = require('mongoose');

const studyBlockSchema = new mongoose.Schema({
  taskId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  subject: String,
  hours: {
    type: Number,
    required: true,
    min: [0, 'Hours cannot be negative']
  },
  startTime: String,
  endTime: String,
  completed: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const dailyScheduleSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  items: [studyBlockSchema]
}, { _id: false });

const studyPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  startDate: {
    type: Date,
    index: true
  },
  endDate: {
    type: Date,
    index: true
  },
  windowDays: {
    type: Number,
    default: 7,
    min: 1
  },
  dailyCapacityHours: {
    type: Number,
    default: 4,
    min: 1,
    max: 24
  },
  dailySchedule: [dailyScheduleSchema],
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft',
    index: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  progress: {
    totalPlannedHours: { type: Number, default: 0 },
    totalCompletedHours: { type: Number, default: 0 },
    completionPercentage: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Compound indexes
studyPlanSchema.index({ userId: 1, status: 1 });
studyPlanSchema.index({ userId: 1, startDate: 1 });
studyPlanSchema.index({ startDate: 1, endDate: 1 });

// Method to calculate progress
studyPlanSchema.methods.calculateProgress = function() {
  let totalHours = 0;
  let completedHours = 0;
  
  for (const day of this.dailySchedule) {
    for (const item of day.items) {
      totalHours += item.hours;
      if (item.completed) {
        completedHours += item.hours;
      }
    }
  }
  
  this.progress.totalPlannedHours = totalHours;
  this.progress.totalCompletedHours = completedHours;
  this.progress.completionPercentage = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;
  
  return this.progress;
};

// Method to mark a block as completed
studyPlanSchema.methods.markBlockCompleted = function(date, taskId) {
  const targetDate = new Date(date).toISOString().split('T')[0];
  
  for (const day of this.dailySchedule) {
    const dayDate = new Date(day.date).toISOString().split('T')[0];
    if (dayDate === targetDate) {
      const block = day.items.find(item => item.taskId === taskId);
      if (block) {
        block.completed = true;
        this.calculateProgress();
        return this.save();
      }
    }
  }
  
  return Promise.resolve(this);
};

// Static method to find active plans
studyPlanSchema.statics.findActive = function(userId = null) {
  const query = { status: 'active' };
  if (userId) query.userId = userId;
  return this.find(query).sort({ startDate: -1 });
};

module.exports = mongoose.model('StudyPlan', studyPlanSchema);
