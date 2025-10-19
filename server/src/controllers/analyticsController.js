const datastore = require('../datastore');

function toNumber(val, def = 0) {
  return typeof val === 'number' && !isNaN(val) ? val : def;
}

const analyticsController = {
  getAnalytics: async (req, res) => {
    try {
      const now = new Date();
      const tasks = datastore.get('tasks') || [];
      const subjects = datastore.get('subjects') || [];
      const events = datastore.get('events') || [];

      const totals = {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
        pendingTasks: tasks.filter(t => !t.status || t.status === 'pending').length
      };
      const completionRate = totals.totalTasks ? +(totals.completedTasks / totals.totalTasks * 100).toFixed(2) : 0;

      const perSubject = {};
      for (const t of tasks) {
        const key = t.subject || 'Uncategorized';
        if (!perSubject[key]) {
          perSubject[key] = { tasks: 0, completed: 0, estimatedMinutes: 0, actualMinutes: 0 };
        }
        perSubject[key].tasks += 1;
        if (t.status === 'completed') perSubject[key].completed += 1;
        perSubject[key].estimatedMinutes += toNumber(t.estimatedDuration, 0);
        perSubject[key].actualMinutes += toNumber(t.actualDuration, 0);
      }

      const upcomingTasks = tasks
        .filter(t => t.dueDate && !isNaN(Date.parse(t.dueDate)))
        .map(t => ({
          id: t.id,
          title: t.title,
          subject: t.subject || null,
          dueDate: t.dueDate,
          daysUntilDue: Math.ceil((new Date(t.dueDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        }))
        .filter(x => x.daysUntilDue >= -1) // include overdue by 1 day
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5);

      res.json({
        success: true,
        message: 'Analytics computed successfully',
        data: {
          generatedAt: now.toISOString(),
          totals: { ...totals, completionRate },
          perSubject,
          subjectsCount: subjects.length,
          events: {
            totalEvents: events.length
          },
          upcomingDeadlines: upcomingTasks
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error computing analytics', error: error.message });
    }
  }
};

module.exports = analyticsController;
