import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthPayload {
  userId: number;
  username?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = (req.headers['authorization'] || (req.headers as any)['Authorization']) as string | undefined;
    if (!authHeader) {
      res.status(401).json({ success: false, message: 'Authorization header missing' });
      return;
    }

    const parts = authHeader.split(' ');
    const token = parts.length === 2 ? parts[1] : parts[0];

    if (!token) {
      res.status(401).json({ success: false, message: 'Token missing' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'default-secret';
    const decoded = jwt.verify(token, secret) as AuthPayload;

    (req as any).user = decoded;
    next();
    return;
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
    return;
  }
};