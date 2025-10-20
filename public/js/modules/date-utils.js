(function(){
  function isYYYYMMDD(str){
    return typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str);
  }

  function parse(input){
    if (input == null) return null;
    if (input instanceof Date) return new Date(input.getTime());
    if (typeof input === 'number') return new Date(input);
    if (typeof input === 'string'){
      if (isYYYYMMDD(input)){
        const [y,m,d] = input.split('-').map(n=>parseInt(n,10));
        return new Date(y, m-1, d);
      }
      // Fallback to native parser for ISO and others
      const d = new Date(input);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }

  function toLocalDateKey(date){
    const d = (date instanceof Date) ? date : parse(date);
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  }

  function isSameLocalDay(a,b){
    const ka = toLocalDateKey(a);
    const kb = toLocalDateKey(b);
    return ka !== '' && kb !== '' && ka === kb;
  }

  function startOfLocalDay(date){
    const d = parse(date) || new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0);
  }
  function endOfLocalDay(date){
    const d = parse(date) || new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23,59,59,999);
  }

  function eventOccursOnLocalDay(start, end, day){
    const s = parse(start);
    const e = end ? parse(end) : s;
    if (!s) return false;
    const rangeStart = startOfLocalDay(day);
    const rangeEnd = endOfLocalDay(day);
    const sMs = s.getTime();
    const eMs = (e ? e.getTime() : sMs);
    return sMs <= rangeEnd.getTime() && eMs >= rangeStart.getTime();
  }

  function filterTasksForDay(tasks, day){
    const key = toLocalDateKey(day);
    return (tasks||[]).filter(t => {
      if (!t || !t.dueDate) return false;
      return toLocalDateKey(t.dueDate) === key;
    });
  }

  function filterEventsForDay(events, day){
    return (events||[]).filter(ev => {
      if (!ev) return false;
      if (ev.start || ev.end) return eventOccursOnLocalDay(ev.start||ev.date, ev.end, day);
      if (ev.date) return isSameLocalDay(ev.date, day);
      return false;
    });
  }

  function mapEventsToTasks(tasks, events){
    const associations = new Map();
    const taskByKey = new Map();
    (tasks||[]).forEach(t => {
      const key = `${(t.subject||'').toLowerCase()}__${toLocalDateKey(t.dueDate)}`;
      if (!taskByKey.has(key)) taskByKey.set(key, []);
      taskByKey.get(key).push(t);
    });
    (events||[]).forEach(ev => {
      const subject = (ev.subject||'').toLowerCase();
      const ek = `${subject}__${toLocalDateKey(ev.date||ev.start)}`;
      const candidates = taskByKey.get(ek) || [];
      if (candidates.length){
        // simple heuristic: first candidate
        associations.set(ev.id || ev.title || Math.random().toString(36).slice(2), candidates[0].id);
      } else {
        // fallback: title similarity naive
        const eTitle = (ev.title||'').toLowerCase();
        const match = (tasks||[]).find(t => toLocalDateKey(t.dueDate) === toLocalDateKey(ev.date||ev.start) && (t.title||'').toLowerCase().includes(eTitle));
        if (match){
          associations.set(ev.id || ev.title || Math.random().toString(36).slice(2), match.id);
        }
      }
    });
    return associations;
  }

  const DateUtils = { parse, toLocalDateKey, isSameLocalDay, startOfLocalDay, endOfLocalDay, eventOccursOnLocalDay, filterTasksForDay, filterEventsForDay, mapEventsToTasks };
  if (typeof window !== 'undefined') window.DateUtils = DateUtils;
  if (typeof module !== 'undefined' && module.exports) module.exports = DateUtils;
})();
