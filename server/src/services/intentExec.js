const Task = require('../models/Task');
const Subject = require('../models/Subject');
const Event = require('../models/Event');

const INTENTS = Object.freeze([
  'create_task',
  'update_task',
  'complete_task',
  'create_subject',
  'none'
]);

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const STATUSES = ['pending', 'in-progress', 'completed', 'overdue', 'cancelled'];

function isISODate(val) {
  if (val == null) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

function normalizeJsonText(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  // Remove code fences if present
  const fenceMatch = trimmed.match(/```(?:json)?\n([\s\S]*?)\n```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  // If it looks like JSON, return as is
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
  // Try to extract first JSON object
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

function validateIntentResponse(obj) {
  const errors = [];
  if (typeof obj !== 'object' || obj == null) {
    return { valid: false, errors: ['Response is not an object'] };
  }
  if (!INTENTS.includes(obj.intent)) {
    errors.push(`intent must be one of: ${INTENTS.join(', ')}`);
  }
  if (typeof obj.payload !== 'object' || obj.payload == null) {
    errors.push('payload must be an object');
  }
  if (typeof obj.reply !== 'string' || obj.reply.trim().length === 0) {
    errors.push('reply must be a non-empty string');
  }
  if (errors.length) return { valid: false, errors };

  const payload = obj.payload || {};
  switch (obj.intent) {
    case 'create_task': {
      if (!payload.title || typeof payload.title !== 'string') errors.push('create_task.title is required string');
      if (payload.dueDate && !isISODate(payload.dueDate)) errors.push('create_task.dueDate must be ISO date string');
      if (payload.priority && !PRIORITIES.includes(payload.priority)) errors.push(`create_task.priority must be one of: ${PRIORITIES.join(', ')}`);
      break;
    }
    case 'update_task': {
      if (!payload.id || typeof payload.id !== 'string') errors.push('update_task.id is required string');
      if (payload.dueDate && !isISODate(payload.dueDate)) errors.push('update_task.dueDate must be ISO date string');
      if (payload.priority && !PRIORITIES.includes(payload.priority)) errors.push(`update_task.priority must be one of: ${PRIORITIES.join(', ')}`);
      if (payload.status && !STATUSES.includes(payload.status)) errors.push(`update_task.status must be one of: ${STATUSES.join(', ')}`);
      break;
    }
    case 'complete_task': {
      if (!payload.id || typeof payload.id !== 'string') errors.push('complete_task.id is required string');
      break;
    }
    case 'create_subject': {
      if (!payload.name || typeof payload.name !== 'string') errors.push('create_subject.name is required string');
      break;
    }
    case 'none':
      break;
  }

  return { valid: errors.length === 0, errors };
}

async function executeIntent(intent, payload) {
  switch (intent) {
    case 'create_task':
      return createTask(payload);
    case 'update_task':
      return updateTask(payload);
    case 'complete_task':
      return completeTask(payload);
    case 'create_subject':
      return createSubject(payload);
    case 'none':
    default:
      return { resources: await snapshotResources() };
  }
}

async function snapshotResources() {
  const tasks = await Task.find({}).lean();
  const subjects = await Subject.find({}).lean();
  const events = await Event.find({}).lean();
  return { tasks, subjects, events };
}

async function createTask(payload) {
  const taskData = {
    title: payload.title.trim(),
    description: payload.description || '',
    subject: payload.subject || null,
    dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
    priority: payload.priority || 'Medium',
    urgency: payload.urgency || null,
    difficulty: payload.difficulty || null,
    status: 'pending',
    estimatedDuration: typeof payload.estimatedDuration === 'number' ? payload.estimatedDuration : null,
    actualDuration: null,
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    notes: payload.notes || ''
  };

  const newTask = new Task(taskData);
  await newTask.save();
  
  return { resources: await snapshotResources(), result: { task: newTask } };
}

async function updateTask(payload) {
  const updates = { ...payload };
  delete updates.id;
  delete updates._id;
  
  if (updates.title) {
    updates.title = updates.title.trim();
  }
  if (updates.dueDate) {
    updates.dueDate = new Date(updates.dueDate);
  }

  const updatedTask = await Task.findByIdAndUpdate(
    payload.id,
    { $set: updates },
    { new: true, runValidators: true }
  );
  
  return { resources: await snapshotResources(), result: { task: updatedTask } };
}

async function completeTask(payload) {
  const updatedTask = await Task.findByIdAndUpdate(
    payload.id,
    { $set: { status: 'completed', completed: true } },
    { new: true }
  );
  
  return { resources: await snapshotResources(), result: { task: updatedTask } };
}

async function createSubject(payload) {
  const subjectData = {
    name: payload.name.trim(),
    color: payload.color || '#3b82f6',
    hoursSpent: 0
  };

  const newSubject = new Subject(subjectData);
  await newSubject.save();
  
  return { resources: await snapshotResources(), result: { subject: newSubject } };
}

module.exports = {
  INTENTS,
  validateIntentResponse,
  executeIntent,
  normalizeJsonText
};
