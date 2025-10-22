require('dotenv').config();
const database = require('../config/database');
const { User, Task, Subject, Event, Timetable, Assessment } = require('../models');

const seedData = {
  users: [
    {
      username: 'demo',
      email: 'demo@example.com',
      firstName: 'Demo',
      lastName: 'User',
      role: 'student',
      profile: {
        grade: '12th',
        school: 'Demo High School'
      },
      preferences: {
        theme: 'auto',
        notifications: {
          email: true,
          push: true,
          reminders: true
        },
        studyHours: {
          dailyGoal: 4,
          preferredTimes: ['morning', 'evening']
        }
      }
    }
  ],
  
  subjects: [
    { name: 'Mathematics', color: '#2563eb', hoursSpent: 15 },
    { name: 'Biology', color: '#22c55e', hoursSpent: 12 },
    { name: 'Chemistry', color: '#0ea5e9', hoursSpent: 10 },
    { name: 'Physics', color: '#16a34a', hoursSpent: 8 },
    { name: 'English', color: '#64748b', hoursSpent: 6 },
    { name: 'History', color: '#f59e0b', hoursSpent: 5 }
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
      status: 'pending',
      estimatedDuration: 120,
      tags: ['homework', 'algebra']
    },
    {
      title: 'Read Biology Chapter',
      description: 'Read and take notes on Chapter 3: Cell Biology',
      subject: 'Biology',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      priority: 'Medium',
      urgency: 'medium',
      difficulty: 'easy',
      status: 'pending',
      estimatedDuration: 90,
      tags: ['reading', 'notes']
    },
    {
      title: 'Chemistry Lab Report',
      description: 'Write lab report for experiment on acids and bases',
      subject: 'Chemistry',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      priority: 'High',
      urgency: 'high',
      difficulty: 'moderate',
      status: 'in-progress',
      estimatedDuration: 180,
      actualDuration: 60,
      tags: ['lab', 'report']
    },
    {
      title: 'History Essay Draft',
      description: 'First draft of essay on Industrial Revolution',
      subject: 'History',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      priority: 'Medium',
      urgency: 'low',
      difficulty: 'hard',
      status: 'pending',
      estimatedDuration: 240,
      tags: ['essay', 'draft']
    }
  ],
  
  events: [
    {
      title: 'Math Midterm',
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      subject: 'Mathematics',
      type: 'exam',
      location: 'Room 101',
      duration: 120
    },
    {
      title: 'Chemistry Quiz',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      subject: 'Chemistry',
      type: 'quiz',
      location: 'Lab B',
      duration: 45
    },
    {
      title: 'Biology Project Presentation',
      date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      subject: 'Biology',
      type: 'presentation',
      location: 'Auditorium',
      duration: 30
    }
  ],
  
  assessments: [
    {
      title: 'Math Midterm',
      subject: 'Mathematics',
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
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
      status: 'upcoming',
      weight: 0.1,
      scoreHistory: [65, 70, 74, 76, 80],
      resources: [
        { label: 'Chapter 4 Notes', url: 'https://example.com/chem-notes' }
      ]
    }
  ],
  
  timetable: {
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
        { id: 'fri-1', start: '10:00', end: '11:30', subject: 'Mathematics', location: 'Room 101', notes: 'Review session', color: '#2563eb' }
      ],
      saturday: [],
      sunday: []
    }
  }
};

async function clearDatabase() {
  console.log('[Seed] Clearing existing data...');
  await User.deleteMany({});
  await Task.deleteMany({});
  await Subject.deleteMany({});
  await Event.deleteMany({});
  await Timetable.deleteMany({});
  await Assessment.deleteMany({});
  console.log('[Seed] Database cleared');
}

async function seedDatabase() {
  try {
    // Connect to MongoDB
    database.setupEventHandlers();
    await database.connect();
    console.log('[Seed] Connected to MongoDB');

    // Clear existing data
    await clearDatabase();

    // Seed Users
    console.log('[Seed] Seeding users...');
    const users = await User.insertMany(seedData.users);
    console.log(`[Seed] Created ${users.length} users`);

    // Seed Subjects
    console.log('[Seed] Seeding subjects...');
    const subjects = await Subject.insertMany(seedData.subjects);
    console.log(`[Seed] Created ${subjects.length} subjects`);

    // Seed Tasks
    console.log('[Seed] Seeding tasks...');
    const tasks = await Task.insertMany(seedData.tasks);
    console.log(`[Seed] Created ${tasks.length} tasks`);

    // Seed Events
    console.log('[Seed] Seeding events...');
    const events = await Event.insertMany(seedData.events);
    console.log(`[Seed] Created ${events.length} events`);

    // Seed Assessments
    console.log('[Seed] Seeding assessments...');
    const assessments = await Assessment.insertMany(seedData.assessments);
    console.log(`[Seed] Created ${assessments.length} assessments`);

    // Seed Timetable
    console.log('[Seed] Seeding timetable...');
    const timetable = new Timetable(seedData.timetable);
    await timetable.save();
    console.log('[Seed] Created timetable');

    console.log('\n✅ Database seeded successfully!');
    console.log('\nSummary:');
    console.log(`- Users: ${users.length}`);
    console.log(`- Subjects: ${subjects.length}`);
    console.log(`- Tasks: ${tasks.length}`);
    console.log(`- Events: ${events.length}`);
    console.log(`- Assessments: ${assessments.length}`);
    console.log(`- Timetable: 1`);

    await database.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
    await database.disconnect();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, clearDatabase };
