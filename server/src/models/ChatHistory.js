const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    intent: String,
    payload: mongoose.Schema.Types.Mixed
  }
}, { _id: false });

const chatHistorySchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: [true, 'Session ID is required'],
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  messages: [messageSchema],
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes
chatHistorySchema.index({ userId: 1, lastMessageAt: -1 });
chatHistorySchema.index({ sessionId: 1, status: 1 });

// Method to add a message
chatHistorySchema.methods.addMessage = function(message) {
  this.messages.push({
    role: message.role,
    content: message.content,
    timestamp: new Date(),
    metadata: message.metadata || {}
  });
  this.lastMessageAt = new Date();
  return this.save();
};

// Method to get recent messages
chatHistorySchema.methods.getRecentMessages = function(count = 10) {
  return this.messages.slice(-count);
};

// Static method to find active sessions
chatHistorySchema.statics.findActiveSessions = function(userId = null) {
  const query = { status: 'active' };
  if (userId) query.userId = userId;
  return this.find(query).sort({ lastMessageAt: -1 });
};

// Auto-archive old sessions (older than 30 days with no activity)
chatHistorySchema.statics.archiveOldSessions = async function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.updateMany(
    {
      status: 'active',
      lastMessageAt: { $lt: thirtyDaysAgo }
    },
    {
      $set: { status: 'archived' }
    }
  );
};

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
