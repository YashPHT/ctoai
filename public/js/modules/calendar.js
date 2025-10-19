(function () {
  const U = window.DashboardUtils || {};

  function bind() {
    // Calendar navigation
    document.querySelectorAll('[data-calendar-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = btn.getAttribute('data-calendar-nav');
        if (window.smartMentor && window.smartMentor.handleCalendarNavClick) {
          window.smartMentor.handleCalendarNavClick(dir);
        }
      });
    });

    // Date selection via delegation
    const days = document.querySelector('[data-calendar-days]');
    if (days) {
      U.delegate(days, 'click', '.calendar__day', (e, el) => {
        if (window.smartMentor && window.smartMentor.selectCalendarDate) {
          const parent = days.closest('[data-component="calendar"]');
          // Try to compute date from current month label and cell
          let dateObj = new Date();
          try {
            const label = document.querySelector('[data-current-month]')?.textContent || '';
            const [monthName, year] = label.split(' ');
            const d = parseInt(el.textContent, 10);
            if (!Number.isNaN(d)) dateObj = new Date(`${monthName} ${d}, ${year}`);
          } catch (_) {}
          window.smartMentor.selectCalendarDate(dateObj);
        }
      });
    }
  }

  window.DashboardCalendar = { init: bind };
})();
