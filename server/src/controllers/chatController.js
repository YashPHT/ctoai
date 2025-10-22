const ChatHistory = require('../models/ChatHistory');
const Task = require('../models/Task');
const Subject = require('../models/Subject');
const Event = require('../models/Event');
const { callGemini } = require('../services/geminiService');
const { validateIntentResponse, executeIntent, normalizeJsonText } = require('../services/intentExec');

// Simple in-memory rate limiter per session/user
const rateBuckets = new Map();
function checkRateLimit(key, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const bucket = rateBuckets.get(key) || [];
  const recent = bucket.filter(ts => now - ts < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  rateBuckets.set(key, recent);
  return true;
}

const chatController = {
  sendMessage: async (req, res) => {
    try {
      const userId = req.user._id;
      const userMessage = (req.body && req.body.message) ? String(req.body.message) : '';
      let { sessionId } = req.body || {};

      if (!userMessage || userMessage.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'message is required' });
      }

      // Rate limiting per session or user
      const rateKey = sessionId ? `s:${sessionId}` : `u:${userId}`;
      if (!checkRateLimit(rateKey)) {
        return res.status(429).json({ success: false, message: 'Too many requests. Please slow down.' });
      }

      // Ensure session exists for current user
      let session = sessionId ? await ChatHistory.findOne({ sessionId, userId }) : null;
      if (!session) {
        sessionId = `session_${Date.now()}`;
        session = new ChatHistory({
          sessionId,
          userId,
          messages: [],
          status: 'active'
        });
        await session.save();
      }

      // Append user message
      session.messages.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      });
      session.lastMessageAt = new Date();
      await session.save();

      // Prepare messages for Gemini (last 10 messages)
      const messages = session.messages.slice(-10);

      // Call Gemini
      const { text } = await callGemini({ messages });

      // Parse and validate
      const maybeJson = normalizeJsonText(text);
      let parsed;
      try {
        parsed = JSON.parse(maybeJson);
      } catch (e) {
        parsed = { intent: 'none', payload: {}, reply: 'I had trouble understanding that. Could you rephrase?' };
      }

      const { valid, errors } = validateIntentResponse(parsed);
      if (!valid) {
        parsed = { intent: 'none', payload: {}, reply: parsed && parsed.reply ? parsed.reply : 'I had trouble understanding that. Could you clarify your request?' };
      }

      // Execute intent if applicable
      let execResult = { resources: undefined, result: undefined };
      if (parsed.intent && parsed.intent !== 'none') {
        execResult = await executeIntent(parsed.intent, parsed.payload || {});
      }
      
      // Fetch current resources from MongoDB for current user
      const tasks = await Task.find({ userId }).lean();
      const subjects = await Subject.find({ userId }).lean();
      const events = await Event.find({ userId }).lean();
      const resources = execResult.resources || { tasks, subjects, events };

      // Store assistant message
      session.messages.push({
        role: 'assistant',
        content: parsed.reply,
        timestamp: new Date(),
        metadata: { intent: parsed.intent, payload: parsed.payload }
      });
      session.lastMessageAt = new Date();
      await session.save();

      res.json({
        success: true,
        message: 'OK',
        data: {
          sessionId,
          intent: parsed.intent,
          payload: parsed.payload,
          reply: parsed.reply,
          resources
        }
      });
    } catch (error) {
      console.error('[ChatController] Error processing chat message:', error);
      const safeMsg = process.env.NODE_ENV === 'development' ? error.message : 'Internal error';
      res.status(error.statusCode || 500).json({ success: false, message: 'Error processing chat message', error: safeMsg });
    }
  },

  getChatHistory: async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await ChatHistory.findOne({ sessionId, userId: req.user._id }).lean();
      
      if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
      }
      
      res.json({ success: true, message: 'Chat history retrieved successfully', data: session });
    } catch (error) {
      console.error('[ChatController] Error retrieving chat history:', error);
      res.status(500).json({ success: false, message: 'Error retrieving chat history', error: error.message });
    }
  },

  createChatSession: async (req, res) => {
    try {
      const sessionId = `session_${Date.now()}`;
      const userId = req.user._id;
      
      const session = new ChatHistory({
        sessionId,
        userId,
        messages: [],
        status: 'active'
      });
      await session.save();
      
      res.status(201).json({ 
        success: true, 
        message: 'Chat session created successfully', 
        data: { 
          sessionId, 
          status: session.status, 
          createdAt: session.createdAt 
        } 
      });
    } catch (error) {
      console.error('[ChatController] Error creating chat session:', error);
      res.status(500).json({ success: false, message: 'Error creating chat session', error: error.message });
    }
  },

  deleteChatHistory: async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await ChatHistory.findOneAndDelete({ sessionId, userId: req.user._id });
      
      if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
      }
      
      res.json({ success: true, message: 'Chat history deleted successfully', data: { sessionId } });
    } catch (error) {
      console.error('[ChatController] Error deleting chat history:', error);
      res.status(500).json({ success: false, message: 'Error deleting chat history', error: error.message });
    }
  }
};

module.exports = chatController;
