(function () {
  function pad(n) { return String(n).padStart(2, '0'); }
  function toYMD(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  function parseYMD(ymd) {
    if (!ymd || typeof ymd !== 'string') return null;
    const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    const dt = new Date(y, mo, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
    return { y, m: mo + 1, d };
  }
  function isoFromYMD(ymd) {
    const parts = parseYMD(ymd);
    if (!parts) return '';
    const { y, m, d } = parts;
    const iso = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).toISOString();
    return iso;
  }

  function startOfMonth(y, m) { return new Date(y, m, 1); }
  function endOfMonth(y, m) { return new Date(y, m + 1, 0); }

  function isBeforeYMD(a, b) {
    const pa = parseYMD(a); const pb = parseYMD(b);
    if (!pa || !pb) return false;
    if (pa.y !== pb.y) return pa.y < pb.y;
    if (pa.m !== pb.m) return pa.m < pb.m;
    return pa.d < pb.d;
  }

  class DatePicker {
    constructor(input, opts = {}) {
      this.input = input;
      this.opts = opts || {};
      this.min = opts.min || null; // YYYY-MM-DD
      this.onSelect = typeof opts.onSelect === 'function' ? opts.onSelect : null;
      this.current = (() => {
        const ymd = (input && input.value) ? input.value : null;
        const p = parseYMD(ymd) || parseYMD(this.min) || parseYMD(toYMD(new Date()));
        return new Date(p.y, p.m - 1, p.d);
      })();
      this.selected = parseYMD(this.input.value) || null;
      this.opened = false;
      this._bind();
    }

    _bind() {
      if (!this.input) return;
      this.onInputFocus = () => this.open();
      this.onInputClick = (e) => { e.preventDefault(); this.open(); };
      this.onInputKeydown = (e) => {
        if (!this.opened && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault(); this.open(); return;
        }
        if (this.opened) {
          if (['Escape', 'Esc'].includes(e.key)) { e.preventDefault(); this.close(); return; }
          if (e.key === 'Enter') { e.preventDefault(); if (this.hoverDate) this._selectYMD(this.hoverDate); else if (this.selected) this._selectYMD(`${this.selected.y.toString().padStart(4,'0')}-${pad(this.selected.m)}-${pad(this.selected.d)}`); this.close(); return; }
          if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(e.key)) {
            e.preventDefault(); this.handleNavKey(e.key, e.shiftKey || e.metaKey || e.ctrlKey); return;
          }
        }
      };
      this.input.addEventListener('focus', this.onInputFocus);
      this.input.addEventListener('click', this.onInputClick);
      this.input.addEventListener('keydown', this.onInputKeydown);
    }

    destroy() {
      if (this.input) {
        this.input.removeEventListener('focus', this.onInputFocus);
        this.input.removeEventListener('click', this.onInputClick);
        this.input.removeEventListener('keydown', this.onInputKeydown);
      }
      this._removePopover();
    }

    open() {
      if (this.opened) return;
      this.opened = true;
      this._renderPopover();
      this._positionPopover();
      document.addEventListener('click', this._docClick = (e) => {
        if (!this.pop || this.pop.contains(e.target) || e.target === this.input) return;
        this.close();
      }, { capture: true });
      document.addEventListener('keydown', this._docKey = (e) => {
        if (e.key === 'Escape' || e.key === 'Esc') { this.close(); }
      });
    }

    close() {
      if (!this.opened) return;
      this.opened = false;
      this._removePopover();
      if (this._docClick) { document.removeEventListener('click', this._docClick, { capture: true }); this._docClick = null; }
      if (this._docKey) { document.removeEventListener('keydown', this._docKey); this._docKey = null; }
    }

    _removePopover() {
      if (this.pop && this.pop.parentNode) this.pop.parentNode.removeChild(this.pop);
      this.pop = null; this.grid = null; this.headerLabel = null; this.hoverDate = null;
    }

    _positionPopover() {
      if (!this.pop || !this.input) return;
      const rect = this.input.getBoundingClientRect();
      const top = rect.bottom + window.scrollY + 6;
      const left = rect.left + window.scrollX;
      this.pop.style.top = `${top}px`;
      this.pop.style.left = `${left}px`;
    }

    handleNavKey(key, large = false) {
      const cur = this.selected || parseYMD(this.input.value) || parseYMD(toYMD(this.current)) || parseYMD(toYMD(new Date()));
      if (!cur) return;
      let dt = new Date(cur.y, cur.m - 1, cur.d);
      const delta = large ? 7 : 1;
      if (key === 'ArrowLeft') dt.setDate(dt.getDate() - 1);
      if (key === 'ArrowRight') dt.setDate(dt.getDate() + 1);
      if (key === 'ArrowUp') dt.setDate(dt.getDate() - delta);
      if (key === 'ArrowDown') dt.setDate(dt.getDate() + delta);
      if (key === 'PageUp') dt.setMonth(dt.getMonth() - 1);
      if (key === 'PageDown') dt.setMonth(dt.getMonth() + 1);
      if (key === 'Home') dt = startOfMonth(dt.getFullYear(), dt.getMonth());
      if (key === 'End') dt = endOfMonth(dt.getFullYear(), dt.getMonth());
      const ymd = toYMD(dt);
      if (this.min && isBeforeYMD(ymd, this.min)) return;
      this._highlightHover(ymd);
    }

    _renderPopover() {
      const pop = document.createElement('div');
      pop.className = 'date-picker-popover';
      pop.setAttribute('role', 'dialog');
      pop.setAttribute('aria-modal', 'false');
      pop.innerHTML = `
        <div class="date-picker__header">
          <button class="date-picker__nav" data-nav="prev" aria-label="Previous month">‹</button>
          <div class="date-picker__label" aria-live="polite"></div>
          <button class="date-picker__nav" data-nav="next" aria-label="Next month">›</button>
        </div>
        <div class="date-picker__weekdays">
          <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
        </div>
        <div class="date-picker__grid" role="grid"></div>
      `;
      document.body.appendChild(pop);
      this.pop = pop;
      this.grid = pop.querySelector('.date-picker__grid');
      this.headerLabel = pop.querySelector('.date-picker__label');

      this.pop.addEventListener('click', (e) => {
        const nav = e.target.closest('[data-nav]');
        if (nav) {
          const dir = nav.getAttribute('data-nav');
          const cur = this.current;
          if (dir === 'prev') { cur.setMonth(cur.getMonth() - 1); }
          if (dir === 'next') { cur.setMonth(cur.getMonth() + 1); }
          this._renderCalendar();
          return;
        }
        const day = e.target.closest('.date-picker__day');
        if (day && !day.classList.contains('is-disabled')) {
          const ymd = day.getAttribute('data-date');
          this._selectYMD(ymd);
          this.close();
        }
      });

      this._renderCalendar();
    }

    _renderCalendar() {
      const cur = this.current;
      const year = cur.getFullYear();
      const month = cur.getMonth();
      const first = new Date(year, month, 1);
      const last = new Date(year, month + 1, 0);
      const startDay = first.getDay(); // 0 Sun
      const daysInMonth = last.getDate();

      const monthName = first.toLocaleString('default', { month: 'long' });
      this.headerLabel.textContent = `${monthName} ${year}`;

      const frag = document.createDocumentFragment();
      // leading blanks
      for (let i = 0; i < startDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'date-picker__day is-empty';
        empty.setAttribute('aria-hidden', 'true');
        frag.appendChild(empty);
      }

      const selectedYMD = this.input.value || '';
      const todayYMD = toYMD(new Date());
      const minYMD = this.min || null;

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const ymd = toYMD(date);
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'date-picker__day';
        el.textContent = String(d);
        el.setAttribute('data-date', ymd);
        el.setAttribute('role', 'gridcell');
        el.setAttribute('aria-label', date.toDateString());
        const isDisabled = minYMD && isBeforeYMD(ymd, minYMD);
        if (isDisabled) el.classList.add('is-disabled');
        if (ymd === selectedYMD) { el.classList.add('is-selected'); this.hoverDate = ymd; }
        if (ymd === todayYMD) el.classList.add('is-today');
        el.addEventListener('mouseenter', () => this._highlightHover(ymd));
        frag.appendChild(el);
      }
      this.grid.innerHTML = '';
      this.grid.appendChild(frag);
    }

    _highlightHover(ymd) {
      if (!this.grid) return;
      const cells = this.grid.querySelectorAll('.date-picker__day');
      cells.forEach(c => c.classList.remove('is-hover')); 
      const el = this.grid.querySelector(`.date-picker__day[data-date="${ymd}"]`);
      if (el && !el.classList.contains('is-disabled')) {
        el.classList.add('is-hover');
        this.hoverDate = ymd;
      }
    }

    _selectYMD(ymd) {
      // Update input value + dataset iso
      if (this.min && isBeforeYMD(ymd, this.min)) return;
      if (this.input) {
        this.input.value = ymd;
        this.input.dataset.iso = isoFromYMD(ymd);
        this.input.dispatchEvent(new Event('input', { bubbles: true }));
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      this.selected = parseYMD(ymd);
      if (typeof this.onSelect === 'function') this.onSelect(ymd);
    }
  }

  window.DatePicker = DatePicker;
  window.DatePickerUtils = { toYMD, parseYMD, isoFromYMD };
})();
