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
      const userId = (req.body && req.body.userId) || 'anonymous';
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

      // Ensure session exists
      let session = sessionId ? await ChatHistory.findOne({ sessionId }) : null;
      if (!session) {
        sessionId = `session_${Date.now()}`;
        session = new ChatHistory({
          sessionId,
          status: 'active',
          messages: []
        });
        await session.save();
      }

      // Add user message
      session.addMessage('user', userMessage);
      await session.save();

      // Prepare messages for Gemini
      const messages = session.getRecentMessages(10);

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
      
      // Fetch resources for response
      const tasks = await Task.find().lean();
      const subjects = await Subject.find().lean();
      const events = await Event.find().lean();
      
      const resources = execResult.resources || { 
        tasks: tasks.map(t => ({ ...t, id: t._id.toString(), _id: undefined, __v: undefined })),
        subjects: subjects.map(s => ({ ...s, id: s._id.toString(), _id: undefined, __v: undefined })),
        events: events.map(e => ({ ...e, id: e._id.toString(), _id: undefined, __v: undefined }))
      };

      // Store assistant message
      session.addMessage('assistant', parsed.reply, { intent: parsed.intent, payload: parsed.payload });
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
      console.error('Error processing chat message:', error);
      const safeMsg = process.env.NODE_ENV === 'development' ? error.message : 'Internal error';
      res.status(error.statusCode || 500).json({ success: false, message: 'Error processing chat message', error: safeMsg });
    }
  },

  getChatHistory: async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await ChatHistory.findOne({ sessionId }).lean();
      
      if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
      }
      
      // Format response
      const formattedSession = {
        ...session,
        _id: undefined,
        __v: undefined
      };
      
      res.json({ success: true, message: 'Chat history retrieved successfully', data: formattedSession });
    } catch (error) {
      console.error('Error retrieving chat history:', error);
      res.status(500).json({ success: false, message: 'Error retrieving chat history', error: error.message });
    }
  },

  createChatSession: async (req, res) => {
    try {
      const sessionId = `session_${Date.now()}`;
      const session = new ChatHistory({
        sessionId,
        status: 'active',
        messages: []
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
      console.error('Error creating chat session:', error);
      res.status(500).json({ success: false, message: 'Error creating chat session', error: error.message });
    }
  },

  deleteChatHistory: async (req, res) => {
    try {
      const { sessionId } = req.params;
      const result = await ChatHistory.findOneAndDelete({ sessionId });
      
      if (!result) {
        return res.status(404).json({ success: false, message: 'Session not found' });
      }
      
      res.json({ success: true, message: 'Chat history deleted successfully', data: { sessionId } });
    } catch (error) {
      console.error('Error deleting chat history:', error);
      res.status(500).json({ success: false, message: 'Error deleting chat history', error: error.message });
    }
  }
};

module.exports = chatController;
