(function(){
  const U = window.DashboardUtils || {};

  function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function computeStatus(a) {
    if (a.status === 'completed') return 'completed';
    if (!a.date) return 'unscheduled';
    const t = new Date(a.date).getTime();
    return (isNaN(t) || t < Date.now()) ? 'overdue' : 'upcoming';
  }

  function sparklineSVG(values, width=100, height=28) {
    const data = Array.isArray(values) && values.length ? values.slice(-10) : [];
    if (!data.length) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = Math.max(1, max - min);
    const step = width / Math.max(1, data.length - 1);
    const points = data.map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const last = data[data.length - 1];
    const color = last >= 85 ? '#10B981' : last >= 70 ? '#2563EB' : '#F59E0B';
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true"><polyline fill="none" stroke="${color}" stroke-width="2" points="${points}" /></svg>`;
  }

  const Assessments = {
    state: { list: [], filtered: [], loading: false, error: null, filters: { subject: '', from: '', to: '' } },
    els: {},

    init() {
      // Only initialize on assessment page
      const container = document.querySelector('[data-assessments-root]');
      if (!container) return;
      this.cacheEls();
      this.bindEvents();
      this.load();
    },

    cacheEls() {
      this.els.list = document.getElementById('assessments-list');
      this.els.count = document.querySelector('[data-assessments-count]');
      this.els.error = document.getElementById('assessments-error');
      this.els.loading = document.getElementById('assessments-loading');
      this.els.subjectFilter = document.getElementById('assessment-filter-subject');
      this.els.fromFilter = document.getElementById('assessment-filter-from');
      this.els.toFilter = document.getElementById('assessment-filter-to');
      this.els.addBtn = document.getElementById('add-assessment');
      this.els.modalOverlay = document.getElementById('assessment-modal-overlay');
      this.els.modal = document.getElementById('assessment-form-modal');
      this.els.form = document.getElementById('assessment-form');
      this.els.formId = document.getElementById('assessment-form-id');
      this.els.formTitle = document.getElementById('assessment-form-title-input');
      this.els.formSubject = document.getElementById('assessment-form-subject');
      this.els.formDate = document.getElementById('assessment-form-date');
      this.els.formTime = document.getElementById('assessment-form-time');
      this.els.formResources = document.getElementById('assessment-form-resources');
      this.els.formSubmit = document.getElementById('assessment-form-submit');
      this.els.modalClose = document.getElementById('assessment-modal-close');
    },

    bindEvents() {
      if (this.els.addBtn) this.els.addBtn.addEventListener('click', () => this.openModal());
      if (this.els.modalOverlay) this.els.modalOverlay.addEventListener('click', () => this.closeModal());
      if (this.els.modalClose) this.els.modalClose.addEventListener('click', () => this.closeModal());
      const cancelBtn = document.getElementById('assessment-modal-cancel');
      if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());
      if (this.els.form) this.els.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
      if (this.els.subjectFilter) this.els.subjectFilter.addEventListener('change', () => this.applyFilters());
      if (this.els.fromFilter) this.els.fromFilter.addEventListener('change', () => this.applyFilters());
      if (this.els.toFilter) this.els.toFilter.addEventListener('change', () => this.applyFilters());
      U.delegate(this.els.list, 'click', '[data-action="edit"]', (e, el) => {
        const id = el.getAttribute('data-id');
        this.openModal(id);
      });
      U.delegate(this.els.list, 'click', '[data-action="resources"]', (e, el) => {
        const id = el.getAttribute('data-id');
        this.toggleResources(id, el);
      });
      U.delegate(this.els.list, 'click', '[data-action="schedule"]', (e, el) => {
        const id = el.getAttribute('data-id');
        this.openModal(id);
      });
    },

    async load() {
      this.setError(null); this.setLoading(true);
      try {
        const data = await window.api.getAssessments();
        this.state.list = Array.isArray(data) ? data : [];
        this.populateSubjectFilter();
        this.applyFilters();
      } catch (e) {
        this.setError(String(e));
      } finally {
        this.setLoading(false);
      }
    },

    setLoading(v) {
      this.state.loading = !!v;
      if (this.els.loading) this.els.loading.hidden = !v;
    },
    setError(msg) {
      this.state.error = msg || null;
      if (this.els.error) {
        this.els.error.hidden = !msg;
        this.els.error.textContent = msg || '';
      }
    },

    populateSubjectFilter() {
      if (!this.els.subjectFilter) return;
      const subjects = Array.from(new Set(this.state.list.map(a => a.subject).filter(Boolean))).sort();
      this.els.subjectFilter.innerHTML = '<option value="">All subjects</option>' + subjects.map(s => `<option value="${s}">${s}</option>`).join('');
    },

    applyFilters() {
      const subject = this.els.subjectFilter ? this.els.subjectFilter.value : '';
      const from = this.els.fromFilter ? this.els.fromFilter.value : '';
      const to = this.els.toFilter ? this.els.toFilter.value : '';
      const fromTime = from ? new Date(from).getTime() : null;
      const toTime = to ? new Date(to).getTime() : null;
      let list = this.state.list.slice();
      if (subject) list = list.filter(a => a.subject === subject);
      if (fromTime) list = list.filter(a => a.date && new Date(a.date).getTime() >= fromTime);
      if (toTime) list = list.filter(a => a.date && new Date(a.date).getTime() <= toTime);
      this.state.filtered = list;
      this.renderList();
    },

    renderList() {
      if (!this.els.list) return;
      const list = this.state.filtered;
      if (this.els.count) this.els.count.textContent = String(list.length);
      if (!list.length) {
        this.els.list.innerHTML = `<div class="empty-state"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg><h3>No assessments found</h3><p>Use Add Assessment to create one, or adjust filters.</p><button class="primary-button" id="create-first-assessment">Add Assessment</button></div>`;
        const btn = document.getElementById('create-first-assessment');
        if (btn) btn.addEventListener('click', () => this.openModal());
        return;
      }
      const html = list.map(a => this.renderItem(a)).join('');
      this.els.list.innerHTML = html;
    },

    renderItem(a) {
      const st = computeStatus(a);
      const dateText = a.date ? formatDateTime(a.date) : 'Not scheduled';
      const badgeClass = st === 'completed' ? 'status-badge--completed' : (st === 'overdue' ? 'status-badge--overdue' : (st === 'unscheduled' ? 'status-badge--unscheduled' : 'status-badge--upcoming'));
      const score = Array.isArray(a.scoreHistory) && a.scoreHistory.length ? a.scoreHistory[a.scoreHistory.length-1] : null;
      const spark = sparklineSVG(a.scoreHistory || [], 100, 28);
      const hasResources = Array.isArray(a.resources) && a.resources.length;
      return `
        <div class="assessment-item" role="listitem">
          <div class="assessment-item__left">
            <div class="assessment-item__title">${a.title}</div>
            <div class="assessment-item__meta">
              <span>${a.subject || '—'}</span>
              <span>•</span>
              <span>${dateText}</span>
              <span class="status-badge ${badgeClass}" aria-label="${st}">${st.charAt(0).toUpperCase() + st.slice(1)}</span>
            </div>
          </div>
          <div class="assessment-item__chart" aria-hidden="true">${spark}</div>
          <div class="assessment-item__actions">
            <button class="secondary-button" data-action="edit" data-id="${a.id}">Review</button>
            <button class="secondary-button" data-action="schedule" data-id="${a.id}">Schedule</button>
            <button class="secondary-button" data-action="resources" data-id="${a.id}" ${hasResources? '' : 'disabled'}>Resources</button>
          </div>
        </div>
        <div class="assessment-resources" id="resources-${a.id}" hidden>
          ${(hasResources ? a.resources.map(r => `<a class="resource-link" href="${r.url}" target="_blank" rel="noopener">${r.label || r.url}</a>`).join('') : '<div class="assessment-resources__empty">No resources</div>')}
        </div>
      `;
    },

    toggleResources(id, btn) {
      const el = document.getElementById(`resources-${id}`);
      if (!el) return;
      const isHidden = el.hasAttribute('hidden');
      if (isHidden) {
        el.removeAttribute('hidden');
        btn?.setAttribute('aria-expanded', 'true');
      } else {
        el.setAttribute('hidden', '');
        btn?.setAttribute('aria-expanded', 'false');
      }
    },

    openModal(id) {
      const editing = !!id;
      this.els.form.reset();
      this.els.formId.value = id || '';
      const header = this.els.modal.querySelector('#assessment-form-title');
      if (header) header.textContent = editing ? 'Edit Assessment' : 'Add Assessment';
      if (editing) {
        const a = this.state.list.find(x => x.id === id);
        if (a) {
          this.els.formTitle.value = a.title || '';
          this.els.formSubject.value = a.subject || '';
          if (a.date) {
            const d = new Date(a.date);
            this.els.formDate.value = d.toISOString().slice(0,10);
            this.els.formTime.value = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
          }
          this.els.formResources.value = (Array.isArray(a.resources)? a.resources: []).map(r => r.url || r).join('\n');
        }
      }
      this.showModal();
    },

    showModal() {
      this.els.modal.removeAttribute('hidden');
      this.els.modal.classList.add('active');
      this.els.modalOverlay.removeAttribute('hidden');
      this.els.modalOverlay.classList.add('active');
      setTimeout(() => { try { this.els.formTitle.focus(); } catch (_) {} }, 10);
    },
    closeModal() {
      this.els.modal.classList.remove('active');
      this.els.modalOverlay.classList.remove('active');
      setTimeout(() => {
        this.els.modal.setAttribute('hidden','');
        this.els.modalOverlay.setAttribute('hidden','');
      }, 250);
    },

    async handleFormSubmit(e) {
      e.preventDefault();
      const id = this.els.formId.value || null;
      const title = this.els.formTitle.value.trim();
      const subject = this.els.formSubject.value.trim() || null;
      const dateStr = this.els.formDate.value ? `${this.els.formDate.value}T${this.els.formTime.value || '00:00'}` : null;
      const resourcesLines = this.els.formResources.value.split('\n').map(s => s.trim()).filter(Boolean);
      const resources = resourcesLines.map(url => ({ label: url.replace(/^https?:\/\//,'').slice(0,40), url }));
      const payload = { title, subject, date: dateStr, resources };
      try {
        if (id) {
          const updated = await window.api.updateAssessment(id, payload);
          const idx = this.state.list.findIndex(x => x.id === id);
          if (idx !== -1) this.state.list[idx] = updated;
        } else {
          const created = await window.api.createAssessment(payload);
          this.state.list.push(created);
        }
        this.applyFilters();
        this.closeModal();
        U.announce('Assessment saved');
      } catch (err) {
        this.setError(String(err));
      }
    }
  };

  window.DashboardAssessments = Assessments;
})();
