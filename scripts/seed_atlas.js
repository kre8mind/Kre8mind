import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, '../data/db.json');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("MONGODB_URI not found in .env");
  process.exit(1);
}

async function seed() {
  console.log("Connecting to MongoDB Atlas...");
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log("Connected successfully to MongoDB Atlas!");
    const db = client.db('kre8mind');
    
    // Read local db.json
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const localData = JSON.parse(raw);
    
    // 1. Projects
    if (Array.isArray(localData.projects) && localData.projects.length > 0) {
      const projCol = db.collection('projects');
      await projCol.deleteMany({});
      await projCol.insertMany(localData.projects);
      console.log(`Seeded ${localData.projects.length} projects into Atlas.`);
    }
    
    // 2. Testimonials
    if (Array.isArray(localData.testimonials) && localData.testimonials.length > 0) {
      const testiCol = db.collection('testimonials');
      await testiCol.deleteMany({});
      await testiCol.insertMany(localData.testimonials);
      console.log(`Seeded ${localData.testimonials.length} testimonials into Atlas.`);
    }
    
    // 3. Inquiries
    if (Array.isArray(localData.inquiries) && localData.inquiries.length > 0) {
      const inqCol = db.collection('inquiries');
      await inqCol.deleteMany({});
      await inqCol.insertMany(localData.inquiries);
      console.log(`Seeded ${localData.inquiries.length} inquiries into Atlas.`);
    }
    
    // 4. Journal
    if (Array.isArray(localData.journal) && localData.journal.length > 0) {
      const journalCol = db.collection('journal');
      await journalCol.deleteMany({});
      await journalCol.insertMany(localData.journal);
      console.log(`Seeded ${localData.journal.length} journal articles into Atlas.`);
    }
    
    // 5. Settings
    const settingsCol = db.collection('settings');
    await settingsCol.deleteMany({});
    const settingsData = localData.settings || {
      adminPassword: "kre8mind2026",
      contactEmail: "hello@kre8mind.com",
      notificationsEnabled: true
    };
    await settingsCol.insertOne({ _id: 'studio_settings', ...settingsData });
    console.log("Seeded studio settings into Atlas.");

    // 6. Analytics
    if (Array.isArray(localData.analytics) && localData.analytics.length > 0) {
      const analyticsCol = db.collection('analytics');
      await analyticsCol.deleteMany({});
      // seed recent 100 to keep it light
      const toSeed = localData.analytics.slice(0, 100);
      await analyticsCol.insertMany(toSeed);
      console.log(`Seeded ${toSeed.length} recent analytics records into Atlas.`);
    }
    
    console.log("=== ATLAS SEEDING COMPLETE ===");
  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    await client.close();
  }
}

seed();
