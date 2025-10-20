(function () {
  const els = {
    gridBtn: document.getElementById('subjects-view-grid'),
    listBtn: document.getElementById('subjects-view-list'),
    addBtn: document.getElementById('add-subject'),
    emptyCreateBtn: document.getElementById('empty-create-subject'),
    refreshBtn: document.getElementById('refresh-subjects'),
    countBadge: document.getElementById('subjects-count'),
    container: document.getElementById('subjects-container'),
    emptyState: document.getElementById('subjects-empty'),
    overlay: document.getElementById('subjects-modal-overlay'),
    formModal: document.getElementById('subject-form-modal'),
    form: document.getElementById('subject-form'),
    formId: document.getElementById('subject-id'),
    formName: document.getElementById('subject-name'),
    formColor: document.getElementById('subject-color'),
    formTitle: document.getElementById('subject-form-title'),
    formSubtitle: document.getElementById('subject-form-subtitle'),
    deleteModal: document.getElementById('subject-delete-modal'),
    deleteName: document.getElementById('subject-delete-name'),
    confirmDeleteBtn: document.getElementById('confirm-delete-subject')
  };

  const state = {
    subjects: [],
    analytics: null,
    view: (localStorage.getItem('subjectsView') || 'grid') === 'list' ? 'list' : 'grid',
    loading: false,
    editingId: null,
    deleteId: null
  };

  function setView(view) {
    state.view = view === 'list' ? 'list' : 'grid';
    try { localStorage.setItem('subjectsView', state.view); } catch (_) {}
    if (!els.container) return;
    els.container.classList.toggle('subjects-container--grid', state.view === 'grid');
    els.container.classList.toggle('subjects-container--list', state.view === 'list');
    if (els.gridBtn && els.listBtn) {
      const isGrid = state.view === 'grid';
      els.gridBtn.classList.toggle('progress-view-toggle__button--active', isGrid);
      els.gridBtn.setAttribute('aria-pressed', isGrid ? 'true' : 'false');
      els.listBtn.classList.toggle('progress-view-toggle__button--active', !isGrid);
      els.listBtn.setAttribute('aria-pressed', !isGrid ? 'true' : 'false');
    }
  }

  function hashColorFromName(name) {
    let h = 0;
    const s = (name || '').toLowerCase();
    for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
    const hue = Math.abs(h) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }

  function getSubjectColor(s) {
    if (s && typeof s.color === 'string' && s.color.trim()) return s.color;
    return hashColorFromName(s?.name || 'Subject');
  }

  function openOverlay() {
    if (!els.overlay) return;
    els.overlay.removeAttribute('hidden');
    requestAnimationFrame(() => els.overlay.classList.add('active'));
  }

  function closeOverlayIfNoModals() {
    if (!els.overlay) return;
    const anyActive = document.querySelector('.modal.active');
    if (!anyActive) {
      els.overlay.classList.remove('active');
      setTimeout(() => {
        els.overlay.setAttribute('hidden', '');
      }, 200);
    }
  }

  function openModal(modal) {
    if (!modal) return;
    openOverlay();
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => modal.classList.add('active'));
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
      modal.setAttribute('hidden', '');
      closeOverlayIfNoModals();
    }, 200);
  }

  function renderLoading() {
    if (!els.container) return;
    els.emptyState && els.emptyState.setAttribute('hidden', '');
    els.container.innerHTML = '';
    const count = state.view === 'grid' ? 6 : 3;
    for (let i = 0; i < count; i++) {
      const sk = document.createElement('div');
      sk.className = 'subject-card skeleton';
      sk.style.height = '64px';
      els.container.appendChild(sk);
    }
  }

  function formatHours(h) {
    const n = Number(h) || 0;
    if (n >= 1) return `${n.toFixed(1)}h`;
    const m = Math.round(n * 60);
    return `${m}m`;
  }

  function getStatsForSubject(name) {
    const a = state.analytics || {};
    const per = a.perSubject || {};
    const stats = per[name] || null;
    if (!stats) return { tasks: 0, completed: 0, estimatedMinutes: 0, actualMinutes: 0 };
    return stats;
  }

  function buildSubjectCard(s) {
    const color = getSubjectColor(s);
    const stats = getStatsForSubject(s.name);
    const tasks = Number(stats.tasks || 0);
    const completed = Number(stats.completed || 0);
    const rate = tasks > 0 ? Math.round((completed / tasks) * 100) : 0;
    const actualH = (Number(stats.actualMinutes || 0) / 60).toFixed(2);
    const estH = (Number(stats.estimatedMinutes || 0) / 60).toFixed(2);
    const hoursDisplay = Number(actualH) > 0 ? formatHours(actualH) : formatHours(estH);

    const card = document.createElement('div');
    card.className = 'subject-card';
    card.setAttribute('role', 'listitem');
    card.dataset.subjectId = s.id;

    card.innerHTML = `
      <div class="subject-color" style="background:${color}"></div>
      <div class="subject-content">
        <div class="subject-title" title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</div>
        <div class="subject-meta">
          <span class="badge" title="Time spent">${hoursDisplay}</span>
          <span class="badge" title="Tasks">${tasks} tasks</span>
          <span class="badge" title="Completion rate">${rate}% complete</span>
          <a class="subject-link" href="assignments.html?subject=${encodeURIComponent(s.name)}">View tasks</a>
        </div>
      </div>
      <div class="subject-actions">
        <button class="icon-button" aria-label="Edit ${escapeHtml(s.name)}" data-action="edit" title="Edit">✎</button>
        <button class="icon-button" aria-label="Delete ${escapeHtml(s.name)}" data-action="delete" title="Delete">🗑</button>
      </div>
    `;

    card.querySelector('[data-action="edit"]').addEventListener('click', () => openEditForm(s));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => openDelete(s));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        openEditForm(s);
      }
    });

    return card;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function render() {
    if (!els.container) return;
    if (state.loading) return renderLoading();

    const list = Array.isArray(state.subjects) ? state.subjects : [];
    if (els.countBadge) els.countBadge.textContent = `${list.length} Total`;

    if (!list.length) {
      els.container.innerHTML = '';
      els.emptyState && els.emptyState.removeAttribute('hidden');
      if (els.emptyCreateBtn) {
        els.emptyCreateBtn.onclick = () => openCreateForm();
      }
      return;
    }

    els.emptyState && els.emptyState.setAttribute('hidden', '');
    els.container.innerHTML = '';
    setView(state.view);

    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    list.forEach(s => {
      els.container.appendChild(buildSubjectCard(s));
    });
  }

  async function load() {
    if (!window.api || !window.api.getSubjects) return;
    state.loading = true; render();
    try {
      const [subjects, analytics] = await Promise.all([
        window.api.getSubjects(),
        window.api.getAnalytics().catch(() => null)
      ]);
      state.subjects = Array.isArray(subjects) ? subjects : (subjects?.data || []);
      state.analytics = analytics && analytics.data ? analytics.data : analytics; // api returns data object
    } catch (e) {
      state.subjects = [];
      state.analytics = null;
    } finally {
      state.loading = false; render();
    }
  }

  function openCreateForm() {
    state.editingId = null;
    if (!els.form || !els.formModal) return;
    if (els.formTitle) els.formTitle.textContent = 'Add Subject';
    if (els.formSubtitle) els.formSubtitle.textContent = 'Create and color-code a subject';
    els.formId.value = '';
    els.formName.value = '';
    els.formColor.value = '#3b82f6';
    openModal(els.formModal);
    setTimeout(() => { try { els.formName.focus(); } catch(_) {} }, 30);
  }

  function openEditForm(s) {
    state.editingId = s.id;
    if (!els.form || !els.formModal) return;
    if (els.formTitle) els.formTitle.textContent = 'Edit Subject';
    if (els.formSubtitle) els.formSubtitle.textContent = 'Update name or color';
    els.formId.value = s.id;
    els.formName.value = s.name || '';
    els.formColor.value = /^#([0-9a-f]{3}){1,2}$/i.test(s.color || '') ? s.color : '#3b82f6';
    openModal(els.formModal);
    setTimeout(() => { try { els.formName.focus(); } catch(_) {} }, 30);
  }

  function openDelete(s) {
    state.deleteId = s.id;
    if (els.deleteName) els.deleteName.textContent = s.name || 'this subject';
    openModal(els.deleteModal);
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    if (!els.formName) return;
    const name = (els.formName.value || '').trim();
    const color = (els.formColor.value || '').trim();
    if (!name) {
      try { els.formName.focus(); } catch (_) {}
      return;
    }
    try {
      if (state.editingId) {
        await window.api.updateSubject(state.editingId, { name, color });
      } else {
        await window.api.createSubject({ name, color });
      }
    } catch (err) {
      // Optionally show toast
    }
    closeModal(els.formModal);
    await load();
  }

  async function handleConfirmDelete() {
    if (!state.deleteId) return closeModal(els.deleteModal);
    try { await window.api.deleteSubject(state.deleteId); } catch (_) {}
    state.deleteId = null;
    closeModal(els.deleteModal);
    await load();
  }

  function attachEvents() {
    if (els.gridBtn) els.gridBtn.addEventListener('click', () => setView('grid'));
    if (els.listBtn) els.listBtn.addEventListener('click', () => setView('list'));
    if (els.addBtn) els.addBtn.addEventListener('click', () => openCreateForm());
    if (els.refreshBtn) els.refreshBtn.addEventListener('click', () => load());
    if (els.form) els.form.addEventListener('submit', handleFormSubmit);
    if (els.confirmDeleteBtn) els.confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
    if (els.overlay) {
      els.overlay.addEventListener('click', () => {
        [els.formModal, els.deleteModal].forEach(m => {
          if (m && !m.hasAttribute('hidden')) closeModal(m);
        });
      });
    }
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); openCreateForm();
      }
      if (e.key === 'Escape') {
        [els.formModal, els.deleteModal].forEach(m => { if (m && !m.hasAttribute('hidden')) closeModal(m); });
      }
    });
  }

  // Init when container present
  if (els.container) {
    attachEvents();
    setView(state.view);
    load();
  }
})();
