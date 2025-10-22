const Task = require('../models/Task');
const StudyPlan = require('../models/StudyPlan');

function priorityValue(p) {
  switch ((p || '').toLowerCase()) {
    case 'low': return 1;
    case 'medium': return 2;
    case 'high': return 3;
    case 'urgent': return 4;
    default: return 2;
  }
}

function daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const now = Date.now();
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return Infinity;
  return Math.ceil((ts - now) / (24 * 60 * 60 * 1000));
}

const studyPlanController = {
  getAllStudyPlans: async (req, res) => {
    try {
      const plans = await StudyPlan.find({}).sort({ createdAt: -1 }).lean();

      res.json({
        success: true,
        message: 'Study plans retrieved successfully',
        data: plans,
        count: plans.length
      });
    } catch (error) {
      console.error('[StudyPlanController] Error retrieving study plans:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving study plans',
        error: error.message
      });
    }
  },

  getStudyPlanById: async (req, res) => {
    try {
      const { id } = req.params;
      const plan = await StudyPlan.findById(id).lean();

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Study plan not found'
        });
      }

      res.json({
        success: true,
        message: 'Study plan retrieved successfully',
        data: plan
      });
    } catch (error) {
      console.error('[StudyPlanController] Error retrieving study plan:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid study plan ID format',
          error: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error retrieving study plan',
        error: error.message
      });
    }
  },

  createStudyPlan: async (req, res) => {
    try {
      const studyPlanData = req.body;

      const plan = new StudyPlan(studyPlanData);
      await plan.save();

      res.status(201).json({
        success: true,
        message: 'Study plan created successfully',
        data: plan
      });
    } catch (error) {
      console.error('[StudyPlanController] Error creating study plan:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.message,
          errors: Object.keys(error.errors).map(key => ({
            field: key,
            message: error.errors[key].message
          }))
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error creating study plan',
        error: error.message
      });
    }
  },

  updateStudyPlan: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};

      delete updates._id;
      delete updates.createdAt;

      const plan = await StudyPlan.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Study plan not found'
        });
      }

      res.json({
        success: true,
        message: 'Study plan updated successfully',
        data: plan
      });
    } catch (error) {
      console.error('[StudyPlanController] Error updating study plan:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid study plan ID format',
          error: error.message
        });
      }
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.message,
          errors: Object.keys(error.errors).map(key => ({
            field: key,
            message: error.errors[key].message
          }))
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error updating study plan',
        error: error.message
      });
    }
  },

  deleteStudyPlan: async (req, res) => {
    try {
      const { id } = req.params;
      const plan = await StudyPlan.findByIdAndDelete(id);

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Study plan not found'
        });
      }

      res.json({
        success: true,
        message: 'Study plan deleted successfully',
        data: { id: plan._id }
      });
    } catch (error) {
      console.error('[StudyPlanController] Error deleting study plan:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid study plan ID format',
          error: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error deleting study plan',
        error: error.message
      });
    }
  },

  addStudySession: async (req, res) => {
    try {
      const { id } = req.params;
      const sessionData = req.body;

      res.status(201).json({
        success: true,
        message: 'Study session added successfully (placeholder)',
        data: {
          studyPlanId: id,
          session: {
            id: Date.now().toString(),
            ...sessionData,
            completed: false
          }
        }
      });
    } catch (error) {
      console.error('[StudyPlanController] Error adding study session:', error);
      res.status(500).json({
        success: false,
        message: 'Error adding study session',
        error: error.message
      });
    }
  },

  computeStudyPlan: async (req, res) => {
    try {
      // Get incomplete tasks from MongoDB
      const tasks = await Task.find({ status: { $ne: 'completed' } }).lean();
      
      const dailyCapacityHours = Math.max(1, parseFloat(req.query.dailyHours || '4'));
      const windowDays = Math.max(1, parseInt(req.query.windowDays || '7', 10));

      const scored = tasks.map(t => {
        const estHours = (typeof t.estimatedDuration === 'number' ? t.estimatedDuration : 60) / 60;
        const pScore = priorityValue(t.priority) / 4;
        const d = daysUntil(t.dueDate);
        const uScore = isFinite(d) ? 1 / (Math.max(d, 0) + 1) : 0.2;
        const score = 0.6 * pScore + 0.4 * uScore;
        return {
          id: t._id.toString(),
          title: t.title,
          subject: t.subject || null,
          dueDate: t.dueDate || null,
          priority: t.priority || 'Medium',
          estimatedHours: +estHours.toFixed(2),
          score: +score.toFixed(4)
        };
      }).sort((a, b) => b.score - a.score);

      // Build daily schedule
      const remaining = scored.map(s => ({ ...s, hoursRemaining: s.estimatedHours }));
      const dailySchedule = [];
      for (let d = 0; d < windowDays; d++) {
        let capacity = dailyCapacityHours;
        const dayDate = new Date(Date.now() + d * 24 * 60 * 60 * 1000);
        const entries = [];
        for (const item of remaining) {
          if (capacity <= 0) break;
          if (item.hoursRemaining <= 0) continue;
          const chunk = Math.min(item.hoursRemaining, Math.min(capacity, 2));
          if (chunk <= 0) continue;
          entries.push({ taskId: item.id, title: item.title, hours: +chunk.toFixed(2) });
          item.hoursRemaining = +(item.hoursRemaining - chunk).toFixed(2);
          capacity = +(capacity - chunk).toFixed(2);
        }
        dailySchedule.push({ date: dayDate.toISOString(), items: entries });
      }

      res.json({
        success: true,
        message: 'Study plan generated successfully',
        data: {
          planGeneratedAt: new Date().toISOString(),
          windowDays,
          dailyCapacityHours,
          recommendedOrder: scored.map((s, idx) => ({ order: idx + 1, ...s })),
          dailySchedule
        }
      });
    } catch (error) {
      console.error('[StudyPlanController] Error generating study plan:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error generating study plan', 
        error: error.message 
      });
    }
  }
};

module.exports = studyPlanController;
