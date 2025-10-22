require('dotenv').config();
const mongoose = require('mongoose');
const { Task, Subject, Event, Timetable, Assessment, User, ChatHistory } = require('../models');

const seedData = {
  subjects: [
    { name: 'Mathematics', color: '#2563eb', hoursPerWeek: 5, isActive: true },
    { name: 'Biology', color: '#22c55e', hoursPerWeek: 4, isActive: true },
    { name: 'Chemistry', color: '#0ea5e9', hoursPerWeek: 4, isActive: true },
    { name: 'Physics', color: '#16a34a', hoursPerWeek: 3, isActive: true },
    { name: 'English', color: '#64748b', hoursPerWeek: 3, isActive: true },
    { name: 'History', color: '#f59e0b', hoursPerWeek: 2, isActive: true }
  ],

  tasks: [
    {
      title: 'Complete Math Assignment',
      description: 'Solve problems 1-20 from Chapter 5',
      subject: 'Mathematics',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      priority: 'High',
      urgency: 'high',
      difficulty: 'moderate',
      preparation: 'moderate',
      status: 'pending',
      estimatedDuration: 120
    },
    {
      title: 'Read Biology Chapter',
      description: 'Read and take notes on Chapter 3',
      subject: 'Biology',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      priority: 'Medium',
      urgency: 'medium',
      difficulty: 'easy',
      preparation: 'minimal',
      status: 'pending',
      estimatedDuration: 90
    },
    {
      title: 'Chemistry Lab Report',
      description: 'Write lab report for experiment on chemical reactions',
      subject: 'Chemistry',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      priority: 'High',
      urgency: 'high',
      difficulty: 'challenging',
      preparation: 'extensive',
      status: 'in-progress',
      estimatedDuration: 180
    },
    {
      title: 'Physics Problem Set',
      description: 'Complete problem set on mechanics',
      subject: 'Physics',
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      priority: 'Medium',
      urgency: 'medium',
      difficulty: 'moderate',
      preparation: 'moderate',
      status: 'pending',
      estimatedDuration: 120
    },
    {
      title: 'English Essay',
      description: 'Write 1000-word essay on Shakespeare',
      subject: 'English',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      priority: 'Medium',
      urgency: 'low',
      difficulty: 'challenging',
      preparation: 'extensive',
      status: 'pending',
      estimatedDuration: 240
    }
  ],

  events: [
    {
      title: 'Math Midterm',
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      subject: 'Mathematics',
      type: 'exam',
      startTime: '09:00',
      endTime: '11:00',
      location: 'Room 101',
      status: 'scheduled'
    },
    {
      title: 'Chemistry Quiz',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      subject: 'Chemistry',
      type: 'quiz',
      startTime: '14:00',
      endTime: '15:00',
      location: 'Lab B',
      status: 'scheduled'
    },
    {
      title: 'Biology Lab Session',
      date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      subject: 'Biology',
      type: 'lab',
      startTime: '10:00',
      endTime: '12:00',
      location: 'Biology Lab',
      status: 'scheduled'
    }
  ],

  assessments: [
    {
      title: 'Math Midterm',
      subject: 'Mathematics',
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      type: 'midterm',
      status: 'upcoming',
      weight: 0.3,
      scoreHistory: [72, 78, 81, 85, 88],
      resources: [
        { label: 'Study Guide', url: 'https://example.com/math-midterm-guide' },
        { label: 'Practice Problems', url: 'https://example.com/math-practice' }
      ]
    },
    {
      title: 'Chemistry Quiz',
      subject: 'Chemistry',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      type: 'quiz',
      status: 'upcoming',
      weight: 0.1,
      scoreHistory: [65, 70, 74, 76, 80],
      resources: [
        { label: 'Chapter 4 Notes', url: 'https://example.com/chem-notes' }
      ]
    },
    {
      title: 'History Essay',
      subject: 'History',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      type: 'assignment',
      status: 'completed',
      weight: 0.2,
      totalPoints: 100,
      earnedPoints: 85,
      scoreHistory: [78, 80, 84, 90],
      resources: []
    }
  ]
};

async function seed() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/assessli');
    console.log('✓ Connected to MongoDB');

    // Clear existing data
    console.log('\nClearing existing data...');
    await Promise.all([
      Task.deleteMany({}),
      Subject.deleteMany({}),
      Event.deleteMany({}),
      Assessment.deleteMany({}),
      Timetable.deleteMany({}),
      ChatHistory.deleteMany({})
    ]);
    console.log('✓ Existing data cleared');

    // Seed subjects
    console.log('\nSeeding subjects...');
    const subjects = await Subject.insertMany(seedData.subjects);
    console.log(`✓ ${subjects.length} subjects created`);

    // Seed tasks
    console.log('\nSeeding tasks...');
    const tasks = await Task.insertMany(seedData.tasks);
    console.log(`✓ ${tasks.length} tasks created`);

    // Seed events
    console.log('\nSeeding events...');
    const events = await Event.insertMany(seedData.events);
    console.log(`✓ ${events.length} events created`);

    // Seed assessments
    console.log('\nSeeding assessments...');
    const assessments = await Assessment.insertMany(seedData.assessments);
    console.log(`✓ ${assessments.length} assessments created`);

    // Create a default timetable
    console.log('\nCreating default timetable...');
    const timetable = new Timetable({
      userId: 'default',
      version: 1,
      weekStart: new Date(),
      days: {
        monday: [
          { id: 'mon-1', start: '09:00', end: '10:00', subject: 'Mathematics', location: 'Room 101', notes: '', color: '#2563eb' },
          { id: 'mon-2', start: '10:30', end: '11:30', subject: 'Chemistry', location: 'Lab B', notes: '', color: '#0ea5e9' }
        ],
        tuesday: [
          { id: 'tue-1', start: '09:00', end: '10:00', subject: 'Physics', location: 'Lab A', notes: '', color: '#16a34a' },
          { id: 'tue-2', start: '13:30', end: '14:30', subject: 'History', location: 'Room 204', notes: '', color: '#f59e0b' }
        ],
        wednesday: [
          { id: 'wed-1', start: '11:00', end: '12:00', subject: 'English', location: 'Room 110', notes: '', color: '#64748b' }
        ],
        thursday: [
          { id: 'thu-1', start: '14:00', end: '15:30', subject: 'Biology', location: 'Room 303', notes: '', color: '#22c55e' }
        ],
        friday: [
          { id: 'fri-1', start: '10:00', end: '11:30', subject: 'Mathematics', location: 'Room 101', notes: '', color: '#2563eb' }
        ],
        saturday: [],
        sunday: []
      }
    });
    await timetable.save();
    console.log('✓ Default timetable created');

    console.log('\n' + '='.repeat(50));
    console.log('✓ Database seeded successfully!');
    console.log('='.repeat(50));
    console.log('\nSummary:');
    console.log(`  - ${subjects.length} subjects`);
    console.log(`  - ${tasks.length} tasks`);
    console.log(`  - ${events.length} events`);
    console.log(`  - ${assessments.length} assessments`);
    console.log(`  - 1 timetable`);
    console.log('='.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seed();
