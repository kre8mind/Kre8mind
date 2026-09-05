import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;

// Global cache across serverless function invocations
let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  if (!uri) {
    throw new Error("MONGODB_URI is not set in environment variables.");
  }

  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
  });

  await client.connect();
  const db = client.db('kre8mind');
  
  cachedClient = client;
  cachedDb = db;
  
  return { client, db };
}

export async function getCollection(name) {
  const { db } = await connectToDatabase();
  return db.collection(name);
}

// Studio Settings Helpers
export async function getStudioSettings() {
  try {
    const col = await getCollection('settings');
    const doc = await col.findOne({ _id: 'studio_settings' });
    if (doc) return doc;
    return {
      adminPassword: process.env.ADMIN_PASSWORD || 'kre8mind2026',
      contactEmail: 'hello@kre8mind.com',
      notificationsEnabled: true
    };
  } catch (err) {
    console.error('Error fetching settings:', err);
    return {
      adminPassword: process.env.ADMIN_PASSWORD || 'kre8mind2026',
      contactEmail: 'hello@kre8mind.com',
      notificationsEnabled: true
    };
  }
}

export async function updateStudioSettings(updates) {
  const col = await getCollection('settings');
  await col.updateOne(
    { _id: 'studio_settings' },
    { $set: updates },
    { upsert: true }
  );
  return await getStudioSettings();
}
