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
          let dateObj = new Date();
          try {
            const attr = el.getAttribute('data-date');
            if (attr && /^\d{4}-\d{2}-\d{2}$/.test(attr)) {
              const [y, m, d] = attr.split('-').map(n => parseInt(n, 10));
              dateObj = new Date(y, m - 1, d);
            } else {
              const label = document.querySelector('[data-current-month]')?.textContent || '';
              const [monthName, year] = label.split(' ');
              const d = parseInt(el.textContent, 10);
              if (!Number.isNaN(d)) dateObj = new Date(`${monthName} ${d}, ${year}`);
            }
          } catch (_) {}
          window.smartMentor.selectCalendarDate(dateObj);
        }
      });

      // Keyboard navigation for calendar grid (roving tabindex)
      days.addEventListener('keydown', (e) => {
        const active = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('calendar__day') ? document.activeElement : null;
        if (!active) return;
        const all = Array.from(days.querySelectorAll('.calendar__day'));
        const idx = all.indexOf(active);
        if (idx === -1) return;
        let nextIdx = idx;
        const cols = 7;
        if (e.key === 'ArrowRight') nextIdx = Math.min(all.length - 1, idx + 1);
        else if (e.key === 'ArrowLeft') nextIdx = Math.max(0, idx - 1);
        else if (e.key === 'ArrowDown') nextIdx = Math.min(all.length - 1, idx + cols);
        else if (e.key === 'ArrowUp') nextIdx = Math.max(0, idx - cols);
        else if (e.key === 'Home') nextIdx = Math.floor(idx / cols) * cols;
        else if (e.key === 'End') nextIdx = Math.min(Math.floor(idx / cols) * cols + (cols - 1), all.length - 1);
        else if (e.key === 'PageUp' || e.key === 'PageDown') {
          const dir = e.key === 'PageUp' ? 'prev' : 'next';
          if (window.smartMentor && window.smartMentor.handleCalendarNavClick) {
            e.preventDefault();
            window.smartMentor.handleCalendarNavClick(dir);
            const newAll = Array.from(days.querySelectorAll('.calendar__day'));
            if (newAll.length) newAll[0].focus();
          }
          return;
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          active.click();
          return;
        } else {
          return;
        }
        if (nextIdx !== idx) {
          e.preventDefault();
          const target = all[nextIdx];
          if (target) target.focus();
        }
      });
    }
  }

  window.DashboardCalendar = { init: bind };
})();
