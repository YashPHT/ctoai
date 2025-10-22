const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    intent: {
      type: String,
      trim: true
    },
    payload: {
      type: mongoose.Schema.Types.Mixed
    },
    entities: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    }
  }
}, { _id: false });

const chatHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  messages: {
    type: [messageSchema],
    default: []
  },
  context: {
    currentStep: {
      type: String,
      trim: true
    },
    taskData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    studyPlanData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active',
    index: true
  },
  summary: {
    type: String,
    maxlength: 500
  },
  tags: [{
    type: String,
    trim: true
  }],
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes
chatHistorySchema.index({ userId: 1, sessionId: 1 });
chatHistorySchema.index({ userId: 1, status: 1 });
chatHistorySchema.index({ userId: 1, lastMessageAt: -1 });
chatHistorySchema.index({ sessionId: 1, status: 1 });

// Method to add a message
chatHistorySchema.methods.addMessage = function(role, content, metadata = {}) {
  this.messages.push({
    role,
    content,
    timestamp: new Date(),
    metadata
  });
  this.lastMessageAt = new Date();
  return this.messages[this.messages.length - 1];
};

// Method to get recent messages
chatHistorySchema.methods.getRecentMessages = function(limit = 10) {
  return this.messages.slice(-limit);
};

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
