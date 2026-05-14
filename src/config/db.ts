import mongoose from 'mongoose';
import { env } from './env';

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || env.MONGO_URI;
    await mongoose.connect(uri);
    isConnected = true;
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    isConnected = false;
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
  });
}

export function isDBConnected(): boolean {
  return isConnected;
}
