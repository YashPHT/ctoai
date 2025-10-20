function pad(n) { return String(n).padStart(2, '0'); }

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
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).toISOString();
}

function ymdFromISO(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  // Use UTC to avoid TZ shifts
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${y}-${pad(m)}-${pad(day)}`;
}

function todayYMD() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function isPastYMD(ymd) {
  const t = todayYMD();
  if (!ymd) return false;
  if (ymd < t) return true;
  return false;
}

module.exports = { parseYMD, isoFromYMD, ymdFromISO, todayYMD, isPastYMD };
