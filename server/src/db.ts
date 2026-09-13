import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | null = null;

function describeMongoUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return 'configured MongoDB URI';
  }
}

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
    console.log(`[Database] Successfully connected to MongoDB at ${describeMongoUri(uri)}`);
  } catch (externalErr: any) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Database] External MongoDB unavailable:', externalErr.message);
      throw externalErr;
    }

    console.warn(`[Database] External MongoDB unavailable (${externalErr.message}). Starting MongoMemoryServer fallback...`);
    try {
      mongod = await MongoMemoryServer.create();
      const inMemoryUri = mongod.getUri();
      await mongoose.connect(inMemoryUri);
      console.log(`[Database] Connected to in-memory MongoDB at ${describeMongoUri(inMemoryUri)}`);
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
