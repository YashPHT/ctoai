const assert = require('assert');
const path = require('path');
const DU = require(path.join(__dirname, '../../public/js/modules/date-utils.js'));

function test(name, fn){
  try { fn(); console.log(`✔ ${name}`); }
  catch(e){ console.error(`✖ ${name}\n  ${e && e.message ? e.message : e}`); process.exitCode = 1; }
}

// Tests

// Parsing and keys
test('toLocalDateKey handles YYYY-MM-DD as local date', () => {
  const d = DU.parse('2025-10-22');
  assert.ok(d instanceof Date && !isNaN(d.getTime()));
  const key = DU.toLocalDateKey(d);
  assert.strictEqual(key, '2025-10-22');
});

test('isSameLocalDay matches same day across time components', () => {
  assert.ok(DU.isSameLocalDay('2025-10-22T05:00:00Z', new Date(Date.UTC(2025,9,22,12,0,0))));
});

// Filtering tasks
const tasks = [
  { id: 't1', title: 'A', dueDate: '2025-10-22' },
  { id: 't2', title: 'B', dueDate: '2025-10-21T00:00:00.000Z' }
];

test('filterTasksForDay returns tasks on the selected day', () => {
  const day = new Date(Date.UTC(2025, 9, 22));
  const list = DU.filterTasksForDay(tasks, day);
  const ids = list.map(t => t.id).sort();
  assert.deepStrictEqual(ids, ['t1']);
});

// Filtering events
const events = [
  { id: 'e1', title: 'Span Event', start: '2025-10-21T23:30:00Z', end: '2025-10-22T01:00:00Z', subject: 'Math' },
  { id: 'e2', title: 'Whole Day', date: '2025-10-22T00:00:00Z', subject: 'Chem' }
];

test('filterEventsForDay returns events intersecting the day', () => {
  const day = new Date(Date.UTC(2025, 9, 22));
  const list = DU.filterEventsForDay(events, day);
  const ids = list.map(e => e.id).sort();
  assert.deepStrictEqual(ids, ['e1','e2']);
});

// Mapping events to tasks by subject and date
const tasks2 = [
  { id: 'ta', title: 'Math Homework', subject: 'Math', dueDate: '2025-10-22' },
  { id: 'tb', title: 'Chem Read', subject: 'Chem', dueDate: '2025-10-21' }
];
const events2 = [
  { id: 'ea', title: 'Math Midterm', subject: 'Math', date: '2025-10-22T09:00:00Z' },
  { id: 'eb', title: 'Other', subject: 'History', date: '2025-10-23T00:00:00Z' }
];

test('mapEventsToTasks associates event with task by subject and date', () => {
  const map = DU.mapEventsToTasks(tasks2, events2);
  // Should map the math event to the math task
  const taskId = map.get('ea');
  assert.strictEqual(taskId, 'ta');
});

if (process.exitCode) {
  process.on('exit', (code) => {
    if (code !== 0) console.error('Some tests failed.');
  });
} else {
  console.log('All date-utils tests passed.');
}
