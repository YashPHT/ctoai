const analyticsController = {
  getAnalytics: async (req, res) => {
    try {
      const now = new Date();
      const sampleTasks = [
        { subject: 'Mathematics', estimatedDuration: 150, actualDuration: 120, progress: 80, completed: false },
        { subject: 'Chemistry', estimatedDuration: 120, actualDuration: 90, progress: 60, completed: false },
        { subject: 'History', estimatedDuration: 60, actualDuration: 30, progress: 40, completed: false },
        { subject: 'English', estimatedDuration: 90, actualDuration: 90, progress: 100, completed: true },
        { subject: 'Physics', estimatedDuration: 120, actualDuration: 45, progress: 20, completed: false }
      ];

      const subjects = {};
      let completed = 0;
      let inProgress = 0;
      let totalProgress = 0;

      for (const t of sampleTasks) {
        const key = t.subject;
        if (!subjects[key]) {
          subjects[key] = { estimated: 0, actual: 0, sessions: 0 };
        }
        subjects[key].estimated += t.estimatedDuration || 0;
        subjects[key].actual += t.actualDuration || 0;
        subjects[key].sessions += 1;
        if (t.completed) completed += 1; else inProgress += 1;
        totalProgress += t.progress || 0;
      }

      const avgProgress = sampleTasks.length ? Math.round(totalProgress / sampleTasks.length) : 0;

      // Simple trend data generators
      const weeklyTrend = Array.from({ length: 7 }, () => Math.max(0, Math.round(60 + (Math.random() * 40 - 20))));
      const monthlyTrend = Array.from({ length: 30 }, () => Math.max(0, Math.round(60 + (Math.random() * 40 - 20))));
      const yearlyTrend = Array.from({ length: 12 }, () => Math.max(0, Math.round(60 + (Math.random() * 40 - 20))));

      res.json({
        success: true,
        message: 'Analytics computed successfully (placeholder)',
        data: {
          generatedAt: now,
          subjects,
          totals: {
            completed,
            inProgress,
            avgProgress
          },
          trend: {
            weekly: weeklyTrend,
            monthly: monthlyTrend,
            yearly: yearlyTrend
          }
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error computing analytics', error: error.message });
    }
  }
};

module.exports = analyticsController;
