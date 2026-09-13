import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { connectDB } from './db';
import { User } from './models/User';
import authRoutes from './routes/auth';
import kitRoutes from './routes/kits';

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server or requests without origin
    if (!origin) return callback(null, true);
    // Allow configured CLIENT_URL, local dev, or any Vercel domain
    if (
      CLIENT_URL === '*' ||
      origin === CLIENT_URL ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'The AI Interview Prep Kit API',
    time: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/kits', kitRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Seed demo user on startup so demo credentials always work
async function seedDemoUser() {
  const DEMO_EMAIL = 'candidate@trao.ai';
  const DEMO_PASSWORD = 'Candidate123!';
  try {
    const exists = await User.findOne({ email: DEMO_EMAIL });
    if (!exists) {
      const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
      await User.create({ email: DEMO_EMAIL, passwordHash, name: 'Demo Candidate' });
      console.log(`[Seed] Demo user created: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
    } else {
      console.log(`[Seed] Demo user already exists: ${DEMO_EMAIL}`);
    }
  } catch (err: any) {
    console.warn('[Seed] Could not seed demo user:', err.message);
  }
}

// Start Server
async function start() {
  await connectDB();
  await seedDemoUser();
  const server = app.listen(PORT, () => {
    console.log(`[Server] The AI Interview Prep Kit API listening on port ${PORT}`);
    console.log(`[Server] Demo login: candidate@trao.ai / Candidate123!`);
  });
  server.setTimeout(300000); // 5 minutes timeout for long generation pipelines
  server.keepAliveTimeout = 65000;
}

if (process.env.NODE_ENV !== 'test') {
  start();
}

export default app;
