const assert = require('assert');
const { isoFromYMD, ymdFromISO, parseYMD, todayYMD, isPastYMD } = require('./date');

function run() {
  // Basic conversions
  assert.strictEqual(isoFromYMD('2025-03-01'), '2025-03-01T00:00:00.000Z');
  assert.strictEqual(ymdFromISO('2025-03-01T00:00:00.000Z'), '2025-03-01');

  // Leap years
  assert.strictEqual(isoFromYMD('2024-02-29'), '2024-02-29T00:00:00.000Z');
  assert.strictEqual(ymdFromISO('2024-02-29T12:30:45.000Z'), '2024-02-29');

  // Invalid inputs
  assert.strictEqual(isoFromYMD('not-a-date'), '');
  assert.strictEqual(ymdFromISO('not-a-date'), '');
  assert.strictEqual(parseYMD('2024-13-01'), null);

  // Today comparisons (non-deterministic, but shape validation)
  const today = todayYMD();
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(today));
  // Yesterday should be past
  const [y, m, d] = today.split('-').map(n => parseInt(n, 10));
  const yest = new Date(y, m - 1, d - 1);
  const yestYMD = `${yest.getFullYear()}-${String(yest.getMonth()+1).padStart(2,'0')}-${String(yest.getDate()).padStart(2,'0')}`;
  assert.strictEqual(isPastYMD(yestYMD), true);

  console.log('All date serialization tests passed.');
}

if (require.main === module) {
  run();
}

module.exports = { run };
