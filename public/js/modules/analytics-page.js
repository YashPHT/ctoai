(function(){
  const hasChart = () => typeof window.Chart !== 'undefined';
  const lerp = (a,b,t)=>a+(b-a)*t;

  const AnalyticsPage = {
    state: {
      period: 'day',
      charts: {}
    },
    els: {},

    init() {
      this.cacheEls();
      this.bindPeriodToggle();
      this.refresh();
    },

    cacheEls() {
      this.els.trendCanvas = document.getElementById('trendChart');
      this.els.trendLoading = document.getElementById('trend-loading');
      this.els.trendEmpty = document.getElementById('trend-empty');

      this.els.subjectCanvas = document.getElementById('subjectDoughnut');
      this.els.subjectLoading = document.getElementById('subject-loading');
      this.els.subjectEmpty = document.getElementById('subject-empty');

      this.els.hoursCanvas = document.getElementById('hoursBar');
      this.els.hoursLoading = document.getElementById('hours-loading');
      this.els.hoursEmpty = document.getElementById('hours-empty');

      this.els.kpiTotal = document.getElementById('kpi-total');
      this.els.kpiCompleted = document.getElementById('kpi-completed');
      this.els.kpiRate = document.getElementById('kpi-rate');
      this.els.kpiSubjects = document.getElementById('kpi-subjects');
      this.els.kpiRateDonut = document.querySelector('.kpi-card[data-kpi="rate"] .kpi-donut');
    },

    bindPeriodToggle() {
      document.querySelectorAll('[data-period]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = btn.getAttribute('data-period');
          if (!p || p === this.state.period) return;
          document.querySelectorAll('[data-period]').forEach(b => {
            b.classList.toggle('progress-view-toggle__button--active', b === btn);
            b.setAttribute('aria-pressed', String(b === btn));
          });
          this.state.period = p;
          this.refresh();
        });
      });
    },

    setSectionLoading(key, isLoading) {
      const map = {
        trend: [this.els.trendLoading, this.els.trendCanvas, this.els.trendEmpty],
        subject: [this.els.subjectLoading, this.els.subjectCanvas, this.els.subjectEmpty],
        hours: [this.els.hoursLoading, this.els.hoursCanvas, this.els.hoursEmpty]
      };
      const entry = map[key];
      if (!entry) return;
      const [loadingEl, canvasEl, emptyEl] = entry;
      if (loadingEl) loadingEl.style.display = isLoading ? 'block' : 'none';
      if (canvasEl) canvasEl.style.display = isLoading ? 'none' : canvasEl.style.display;
      if (emptyEl) emptyEl.style.display = 'none';
    },

    async refresh() {
      try {
        this.setSectionLoading('trend', true);
        this.setSectionLoading('subject', true);
        this.setSectionLoading('hours', true);
        const data = await (window.api && window.api.getAnalytics ? window.api.getAnalytics({ period: this.state.period }) : Promise.resolve(null));
        const analytics = data && data.totals ? data : ({});
        this.renderKPIs(analytics);
        await this.renderTrend(analytics);
        await this.renderSubjectDoughnut(analytics);
        await this.renderHoursBar(analytics);
      } catch (err) {
        console.error('Failed to load analytics', err);
        this.showEmpty('trend'); this.showEmpty('subject'); this.showEmpty('hours');
      }
    },

    showEmpty(key) {
      const map = {
        trend: [this.els.trendLoading, this.els.trendCanvas, this.els.trendEmpty],
        subject: [this.els.subjectLoading, this.els.subjectCanvas, this.els.subjectEmpty],
        hours: [this.els.hoursLoading, this.els.hoursCanvas, this.els.hoursEmpty]
      };
      const entry = map[key];
      if (!entry) return;
      const [loadingEl, canvasEl, emptyEl] = entry;
      if (loadingEl) loadingEl.style.display = 'none';
      if (canvasEl) canvasEl.style.display = 'none';
      if (emptyEl) emptyEl.style.display = 'block';
    },

    animateNumber(el, target, suffix = '') {
      if (!el) return;
      const start = parseFloat((el.textContent || '0').replace(/[^0-9.]/g, '')) || 0;
      const end = typeof target === 'number' ? target : 0;
      const dur = 420; // ms
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - k, 3);
        const val = lerp(start, end, eased);
        el.textContent = (suffix === '%' ? Math.round(val) : Math.round(val)).toLocaleString() + suffix;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },

    renderKPIs(a) {
      if (!a || !a.totals) return;
      const { totals, subjectsCount } = a;
      const total = totals.totalTasks || 0;
      const completed = totals.completedTasks || 0;
      const rate = totals.completionRate || 0;
      if (this.els.kpiTotal) this.animateNumber(this.els.kpiTotal, total);
      if (this.els.kpiCompleted) this.animateNumber(this.els.kpiCompleted, completed);
      if (this.els.kpiRate) this.animateNumber(this.els.kpiRate, rate, '%');
      if (this.els.kpiSubjects) this.animateNumber(this.els.kpiSubjects, subjectsCount || 0);
      if (this.els.kpiRateDonut) this.els.kpiRateDonut.style.setProperty('--kpi-progress', `${rate}%`);
    },

    async renderTrend(a) {
      const canvas = this.els.trendCanvas; if (!canvas) return;
      try {
        const labels = (a && a.timeSeries && Array.isArray(a.timeSeries.labels)) ? a.timeSeries.labels : [];
        const values = (a && a.timeSeries && Array.isArray(a.timeSeries.values)) ? a.timeSeries.values : [];
        if (!labels.length || !values.length || values.every(v => v === 0)) {
          this.showEmpty('trend');
          return;
        }
        this.els.trendLoading.style.display = 'none';
        canvas.style.display = 'block';
        if (hasChart()) {
          const ctx = canvas.getContext('2d');
          if (this.state.charts.trend) {
            this.state.charts.trend.data.labels = labels;
            this.state.charts.trend.data.datasets[0].data = values;
            this.state.charts.trend.update();
          } else {
            this.state.charts.trend = new Chart(ctx, {
              type: 'line',
              data: { labels, datasets: [{
                label: 'Tasks Due', data: values,
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#3b82f6',
                backgroundColor: 'rgba(59,130,246,0.12)', fill: true, tension: 0.35, borderWidth: 2,
                pointRadius: 2
              }] },
              options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y} task${ctx.parsed.y === 1 ? '' : 's'}` } }
                },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
              }
            });
          }
        } else {
          // Fallback: simple canvas draw
          const ctx = canvas.getContext('2d');
          const w = canvas.width = canvas.clientWidth || 400;
          const h = canvas.height = 220;
          const max = Math.max(1, ...values);
          ctx.clearRect(0,0,w,h);
          ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.beginPath();
          values.forEach((v,i)=>{
            const x = (i/(values.length-1))*(w-40)+20;
            const y = h-20-(v/max)*(h-40);
            if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
          });
          ctx.stroke();
        }
      } finally {
        // nothing
      }
    },

    async renderSubjectDoughnut(a) {
      const canvas = this.els.subjectCanvas; if (!canvas) return;
      const perSubject = (a && a.perSubject) || {};
      const entries = Object.entries(perSubject).map(([name, s]) => ({ name, count: s.tasks||0 }));
      entries.sort((x,y)=>y.count-x.count);
      const top = entries.slice(0, 6);
      if (!top.length) { this.showEmpty('subject'); return; }
      this.els.subjectLoading.style.display = 'none';
      canvas.style.display = 'block';
      if (hasChart()) {
        const colors = top.map((_,i)=>{
          const hues = [222, 199, 158, 142, 197, 255];
          const h = hues[i%hues.length];
          return `hsl(${h} 85% 60%)`;
        });
        const ctx = canvas.getContext('2d');
        if (this.state.charts.subject) {
          this.state.charts.subject.data.labels = top.map(t=>t.name);
          this.state.charts.subject.data.datasets[0].data = top.map(t=>t.count);
          this.state.charts.subject.data.datasets[0].backgroundColor = colors;
          this.state.charts.subject.update();
        } else {
          this.state.charts.subject = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: top.map(t=>t.name), datasets: [{ data: top.map(t=>t.count), backgroundColor: colors, borderWidth: 1 }] },
            options: {
              responsive: true, maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: (c) => `${c.label}: ${c.parsed} task${c.parsed===1?'':'s'}` } }
              }
            }
          });
        }
      }
    },

    async renderHoursBar(a) {
      const canvas = this.els.hoursCanvas; if (!canvas) return;
      const subjects = Array.isArray(a && a.subjects) ? a.subjects.slice() : [];
      subjects.sort((x,y)=> (y.estimatedHours||0)-(x.estimatedHours||0));
      const top = subjects.slice(0, 6);
      if (!top.length || top.every(s=> (s.estimatedHours||0)===0 && (s.actualHours||0)===0)) { this.showEmpty('hours'); return; }
      this.els.hoursLoading.style.display = 'none';
      canvas.style.display = 'block';
      if (hasChart()) {
        const labels = top.map(s => s.subject);
        const est = top.map(s => s.estimatedHours||0);
        const act = top.map(s => s.actualHours||0);
        const ctx = canvas.getContext('2d');
        if (this.state.charts.hours) {
          this.state.charts.hours.data.labels = labels;
          this.state.charts.hours.data.datasets[0].data = est;
          this.state.charts.hours.data.datasets[1].data = act;
          this.state.charts.hours.update();
        } else {
          this.state.charts.hours = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [
              { label: 'Estimated (h)', data: est, backgroundColor: 'rgba(59,130,246,0.6)' },
              { label: 'Actual (h)', data: act, backgroundColor: 'rgba(16,185,129,0.6)' }
            ] },
            options: {
              responsive: true, maintainAspectRatio: false,
              scales: { y: { beginAtZero: true, ticks: { callback: (v) => `${v}h` } } }
            }
          });
        }
      } else {
        // simple fallback bars
        const ctx = canvas.getContext('2d');
        const w = canvas.width = canvas.clientWidth || 400; const h = canvas.height = 220;
        const max = Math.max(1, ...top.map(s=>Math.max(s.estimatedHours||0, s.actualHours||0)));
        const barW = (w-40)/(top.length*3);
        top.forEach((s,i)=>{
          const x0 = 20 + i*barW*3;
          const eh = (s.estimatedHours||0)/max*(h-40);
          const ah = (s.actualHours||0)/max*(h-40);
          ctx.fillStyle = '#3b82f6'; ctx.fillRect(x0, h-20-eh, barW, eh);
          ctx.fillStyle = '#10b981'; ctx.fillRect(x0+barW*1.3, h-20-ah, barW, ah);
        });
      }
    }
  };

  // Kick off once DOM is ready (script is loaded with defer at end of body)
  try { AnalyticsPage.init(); } catch (e) { console.error(e); }
})();
