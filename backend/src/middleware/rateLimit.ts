import { Request, Response, NextFunction } from 'express';

const ipAttempts = new Map<string, { count: number; resetTime: number }>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 20; // 20 attempts per 15 minutes per IP

export function loginRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();

  const record = ipAttempts.get(ip);

  if (!record || now > record.resetTime) {
    ipAttempts.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    next();
    return;
  }

  if (record.count >= MAX_ATTEMPTS) {
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
    });
    return;
  }

  record.count++;
  next();
}
