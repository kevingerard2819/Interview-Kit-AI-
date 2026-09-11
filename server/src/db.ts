import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | null = null;

/**
 * Connects to MongoDB with automatic fallback to in-memory instance
 * if external MongoDB is unavailable.
 */
export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/interview_prep_kit';

  try {
    // Attempt connecting to the configured URI with a short timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000
    });
    console.log(`[Database] Successfully connected to MongoDB at ${uri}`);
  } catch (externalErr: any) {
    console.warn(`[Database] External MongoDB unavailable (${externalErr.message}). Starting MongoMemoryServer fallback...`);
    try {
      mongod = await MongoMemoryServer.create();
      const inMemoryUri = mongod.getUri();
      await mongoose.connect(inMemoryUri);
      console.log(`[Database] Connected to in-memory MongoDB at ${inMemoryUri}`);
    } catch (memErr: any) {
      console.error('[Database] Failed to launch in-memory MongoDB:', memErr.message);
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
}
