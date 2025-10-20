(function () {
  function init() {
    try { window.DashboardNav && window.DashboardNav.init && window.DashboardNav.init(); } catch (_) {}
    try { window.DashboardCharts && window.DashboardCharts.init && window.DashboardCharts.init(); } catch (_) {}
    try { window.DashboardTasksUI && window.DashboardTasksUI.init && window.DashboardTasksUI.init(); } catch (_) {}
    try { window.DashboardCalendar && window.DashboardCalendar.init && window.DashboardCalendar.init(); } catch (_) {}
    try { window.DashboardTimetable && window.DashboardTimetable.init && window.DashboardTimetable.init(); } catch (_) {}
    try { window.DashboardAssessments && window.DashboardAssessments.init && window.DashboardAssessments.init(); } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
