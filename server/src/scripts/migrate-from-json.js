require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Task = require('../models/Task');
const Subject = require('../models/Subject');
const Event = require('../models/Event');
const Assessment = require('../models/Assessment');
const Timetable = require('../models/Timetable');

async function migrate() {
  try {
    console.log('[Migration] Starting migration from JSON to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/assessli');
    console.log('[Migration] Connected to MongoDB');

    const defaultUserData = {
      username: 'admin',
      email: 'admin@assessli.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    };

    let defaultUser = await User.findOne({ email: defaultUserData.email });
    
    if (!defaultUser) {
      console.log('[Migration] Creating default user...');
      defaultUser = await User.create(defaultUserData);
      console.log(`[Migration] Default user created: ${defaultUser.email}`);
    } else {
      console.log(`[Migration] Default user already exists: ${defaultUser.email}`);
    }

    const dataDir = path.join(__dirname, '../../data');
    
    if (!fs.existsSync(dataDir)) {
      console.log('[Migration] No data directory found. Skipping migration.');
      return;
    }

    const tasksFile = path.join(dataDir, 'tasks.json');
    if (fs.existsSync(tasksFile)) {
      const tasksData = JSON.parse(fs.readFileSync(tasksFile, 'utf-8'));
      if (Array.isArray(tasksData) && tasksData.length > 0) {
        console.log(`[Migration] Migrating ${tasksData.length} tasks...`);
        for (const task of tasksData) {
          await Task.findOneAndUpdate(
            { _id: task._id },
            { ...task, userId: defaultUser._id },
            { upsert: true, new: true }
          );
        }
        console.log('[Migration] Tasks migrated successfully');
      }
    }

    const subjectsFile = path.join(dataDir, 'subjects.json');
    if (fs.existsSync(subjectsFile)) {
      const subjectsData = JSON.parse(fs.readFileSync(subjectsFile, 'utf-8'));
      if (Array.isArray(subjectsData) && subjectsData.length > 0) {
        console.log(`[Migration] Migrating ${subjectsData.length} subjects...`);
        for (const subject of subjectsData) {
          await Subject.findOneAndUpdate(
            { _id: subject._id },
            { ...subject, userId: defaultUser._id },
            { upsert: true, new: true }
          );
        }
        console.log('[Migration] Subjects migrated successfully');
      }
    }

    const eventsFile = path.join(dataDir, 'events.json');
    if (fs.existsSync(eventsFile)) {
      const eventsData = JSON.parse(fs.readFileSync(eventsFile, 'utf-8'));
      if (Array.isArray(eventsData) && eventsData.length > 0) {
        console.log(`[Migration] Migrating ${eventsData.length} events...`);
        for (const event of eventsData) {
          await Event.findOneAndUpdate(
            { _id: event._id },
            { ...event, userId: defaultUser._id },
            { upsert: true, new: true }
          );
        }
        console.log('[Migration] Events migrated successfully');
      }
    }

    const assessmentsFile = path.join(dataDir, 'assessments.json');
    if (fs.existsSync(assessmentsFile)) {
      const assessmentsData = JSON.parse(fs.readFileSync(assessmentsFile, 'utf-8'));
      if (Array.isArray(assessmentsData) && assessmentsData.length > 0) {
        console.log(`[Migration] Migrating ${assessmentsData.length} assessments...`);
        for (const assessment of assessmentsData) {
          await Assessment.findOneAndUpdate(
            { _id: assessment._id },
            { ...assessment, userId: defaultUser._id },
            { upsert: true, new: true }
          );
        }
        console.log('[Migration] Assessments migrated successfully');
      }
    }

    const timetableFile = path.join(dataDir, 'timetable.json');
    if (fs.existsSync(timetableFile)) {
      const timetableData = JSON.parse(fs.readFileSync(timetableFile, 'utf-8'));
      if (timetableData) {
        console.log('[Migration] Migrating timetable...');
        await Timetable.findOneAndUpdate(
          { userId: defaultUser._id },
          { ...timetableData, userId: defaultUser._id },
          { upsert: true, new: true }
        );
        console.log('[Migration] Timetable migrated successfully');
      }
    }

    console.log('[Migration] Migration completed successfully!');
    console.log(`[Migration] Default user credentials:`);
    console.log(`  Email: ${defaultUserData.email}`);
    console.log(`  Password: ${defaultUserData.password}`);
    
  } catch (error) {
    console.error('[Migration] Error during migration:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('[Migration] Disconnected from MongoDB');
  }
}

migrate();
