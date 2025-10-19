(function () {
  function bind() {
    const btn = document.querySelector('[data-action="edit-timetable"]');
    if (btn) btn.addEventListener('click', () => {
      if (window.smartMentor && window.smartMentor.openTimetableEditor) {
        window.smartMentor.openTimetableEditor();
      }
    });
  }

  window.DashboardTimetable = { init: bind };
})();
