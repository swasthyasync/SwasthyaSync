// packages/api/src/middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phone?: string | null;
        email?: string | null;
        role: string;
        [key: string]: any;
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('[authMiddleware] Processing request...');
    console.log('[authMiddleware] Headers:', req.headers);
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or malformed' });
    }

    const token = authHeader.substring(7);
    if (!token) {
      return res.status(401).json({ error: 'Bearer token required' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('❌ JWT_SECRET missing in environment');
      return res.status(500).json({ error: 'Server misconfigured: JWT_SECRET missing' });
    }

    const decoded = jwt.verify(token, secret);
    const payload = typeof decoded === 'object' ? decoded : { id: decoded };

    if (!payload.id && !payload.userId && !payload.sub) {
      return res.status(401).json({ error: 'Invalid token payload: missing user id' });
    }

    req.user = {
      id: (payload.id || payload.userId || payload.sub) as string,
      phone: payload.phone ?? null,
      email: payload.email ?? null,
      role: payload.role ?? 'patient',
    };

    return next();
  } catch (err: any) {
    console.error('❌ Auth error:', err?.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Role-based middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role) {
      return res.status(401).json({ error: 'User role missing. Please login again.' });
    }
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: `Access denied. Required role: ${allowedRoles.join(', ')}` });
    }
    next();
  };
};

export const requireAdmin = requireRole(['admin']);
export const requirePractitioner = requireRole(['practitioner', 'admin']);

export default authMiddleware;
