(function () {
  const DEFAULT_RETRIES = 2;
  const DEFAULT_RETRY_DELAY = 800;

  async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function fetchWithRetry(url, options = {}, hooks = {}) {
    const {
      retries = DEFAULT_RETRIES,
      retryDelay = DEFAULT_RETRY_DELAY,
      onError,
      onFinalError,
      onLoadingChange
    } = hooks || {};

    let attempt = 0;
    try { onLoadingChange && onLoadingChange(true); } catch (_) {}

    while (attempt <= retries) {
      try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          return await res.json();
        }
        return await res.text();
      } catch (err) {
        if (attempt < retries) {
          try { onError && onError(err, attempt); } catch (_) {}
          await delay(retryDelay * Math.pow(2, attempt));
          attempt += 1;
          continue;
        } else {
          try { onFinalError && onFinalError(err); } catch (_) {}
          throw err;
        }
      } finally {
        if (attempt === retries) {
          try { onLoadingChange && onLoadingChange(false); } catch (_) {}
        }
      }
    }
  }

  function toJSONBody(body) {
    return {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    };
  }

  const api = {
    state: { loading: false, lastError: null },

    setLoading(v) { this.state.loading = !!v; },
    setError(e) { this.state.lastError = e ? String(e) : null; },

    async getTasks() {
      this.setError(null); this.setLoading(true);
      try {
        const data = await fetchWithRetry('/api/tasks', { method: 'GET', headers: { 'Accept': 'application/json' } }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.tasks)) return data.tasks;
        return [];
      } finally {
        this.setLoading(false);
      }
    },

    async getEvents() {
      this.setError(null); this.setLoading(true);
      try {
        const data = await fetchWithRetry('/api/events', { method: 'GET', headers: { 'Accept': 'application/json' } }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.events)) return data.events;
        return [];
      } finally {
        this.setLoading(false);
      }
    },

    async createTask(task) {
      this.setError(null); this.setLoading(true);
      try {
        const data = await fetchWithRetry('/api/tasks', { method: 'POST', ...toJSONBody(task) }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        return data?.data || data?.task || task;
      } finally { this.setLoading(false); }
    },

    async updateTask(id, task) {
      this.setError(null); this.setLoading(true);
      try {
        const data = await fetchWithRetry(`/api/tasks/${encodeURIComponent(id)}`, { method: 'PUT', ...toJSONBody(task) }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        return data?.data || data?.task || task;
      } finally { this.setLoading(false); }
    },

    async deleteTask(id) {
      this.setError(null); this.setLoading(true);
      try {
        await fetchWithRetry(`/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        return true;
      } finally { this.setLoading(false); }
    },

    async getTimetable() {
      this.setError(null); this.setLoading(true);
      try {
        const data = await fetchWithRetry('/api/timetable', { method: 'GET', headers: { 'Accept': 'application/json' } }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        return data?.data || data;
      } finally { this.setLoading(false); }
    },

    async saveTimetable(timetable) {
      this.setError(null); this.setLoading(true);
      try {
        const data = await fetchWithRetry('/api/timetable', { method: 'PUT', ...toJSONBody(timetable) }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        return data?.data || data;
      } finally { this.setLoading(false); }
    },

    async getAnalytics() {
      this.setError(null); this.setLoading(true);
      try {
        const data = await fetchWithRetry('/api/analytics', { method: 'GET', headers: { 'Accept': 'application/json' } }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        return data?.data || data;
      } finally { this.setLoading(false); }
    }
  };

  window.api = api;
  window.fetchWithRetry = fetchWithRetry;
})();
