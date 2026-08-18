import mongoose from 'mongoose';
import dns from 'node:dns';
import { env } from './env.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

export async function connectDB() {
  try {
    await mongoose.connect(env.mongoUri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
}