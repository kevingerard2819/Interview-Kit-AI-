import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.headers.cookie) {
    // Check if token in cookie
    const cookies = req.headers.cookie.split(';');
    for (const cookie of cookies) {
      const [k, v] = cookie.trim().split('=');
      if (k === 'token') {
        token = decodeURIComponent(v);
        break;
      }
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'trao-assessment-secure-jwt-secret-key-32chars';
    const decoded = jwt.verify(token, secret) as { userId: string; email: string };
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}
