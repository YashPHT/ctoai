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
  const tasks = await Task.find().lean();
  const subjects = await Subject.find().lean();
  const events = await Event.find().lean();
  
  // Format responses with 'id' field for backward compatibility
  return {
    tasks: tasks.map(t => ({ ...t, id: t._id.toString(), _id: undefined, __v: undefined })),
    subjects: subjects.map(s => ({ ...s, id: s._id.toString(), _id: undefined, __v: undefined })),
    events: events.map(e => ({ ...e, id: e._id.toString(), _id: undefined, __v: undefined }))
  };
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

  const task = new Task(taskData);
  await task.save();
  
  const formattedTask = {
    ...task.toObject(),
    id: task._id.toString(),
    _id: undefined,
    __v: undefined
  };

  return { resources: await snapshotResources(), result: { task: formattedTask } };
}

async function updateTask(payload) {
  const updateData = {};
  if (payload.title) updateData.title = payload.title.trim();
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.subject !== undefined) updateData.subject = payload.subject;
  if (payload.dueDate !== undefined) updateData.dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
  if (payload.priority) updateData.priority = payload.priority;
  if (payload.urgency !== undefined) updateData.urgency = payload.urgency;
  if (payload.difficulty !== undefined) updateData.difficulty = payload.difficulty;
  if (payload.status) updateData.status = payload.status;
  if (payload.estimatedDuration !== undefined) updateData.estimatedDuration = payload.estimatedDuration;
  if (payload.actualDuration !== undefined) updateData.actualDuration = payload.actualDuration;
  if (payload.tags !== undefined) updateData.tags = payload.tags;
  if (payload.notes !== undefined) updateData.notes = payload.notes;

  const task = await Task.findByIdAndUpdate(
    payload.id,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!task) {
    return { resources: await snapshotResources(), result: { task: null } };
  }

  const formattedTask = {
    ...task.toObject(),
    id: task._id.toString(),
    _id: undefined,
    __v: undefined
  };

  return { resources: await snapshotResources(), result: { task: formattedTask } };
}

async function completeTask(payload) {
  const task = await Task.findByIdAndUpdate(
    payload.id,
    { $set: { status: 'completed', completedAt: new Date() } },
    { new: true }
  );

  if (!task) {
    return { resources: await snapshotResources(), result: { task: null } };
  }

  const formattedTask = {
    ...task.toObject(),
    id: task._id.toString(),
    _id: undefined,
    __v: undefined
  };

  return { resources: await snapshotResources(), result: { task: formattedTask } };
}

async function createSubject(payload) {
  const subjectData = {
    name: payload.name.trim(),
    color: payload.color || undefined
  };

  const subject = new Subject(subjectData);
  await subject.save();
  
  const formattedSubject = {
    ...subject.toObject(),
    id: subject._id.toString(),
    _id: undefined,
    __v: undefined
  };

  return { resources: await snapshotResources(), result: { subject: formattedSubject } };
}

module.exports = {
  INTENTS,
  validateIntentResponse,
  executeIntent,
  normalizeJsonText
};
