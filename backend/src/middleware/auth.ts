import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role: string;
    name?: string;
  };
}

// Middleware to verify the Firebase Auth ID Token sent in the Authorization header
export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'No authorization token provided.' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    // Verify the Firebase ID Token
    const decodedToken = await auth.verifyIdToken(token);
    
    // Dynamically assign 'admin' role if the email matches campusmarketadmin@gmail.com
    const isAdminEmail = decodedToken.email === 'campusmarketadmin@gmail.com';
    const role = isAdminEmail ? 'admin' : (decodedToken.role as string || 'user');

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: role,
      name: decodedToken.name || (decodedToken.email ? decodedToken.email.split('@')[0] : 'User')
    };
    
    next();
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired authentication token.' });
  }
};

// Middleware to optionally verify the Firebase Auth ID Token (for public routes that adjust responses based on user context)
export const optionalVerifyToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(token);
    const isAdminEmail = decodedToken.email === 'campusmarketadmin@gmail.com';
    const role = isAdminEmail ? 'admin' : (decodedToken.role as string || 'user');

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: role,
      name: decodedToken.name || (decodedToken.email ? decodedToken.email.split('@')[0] : 'User')
    };
  } catch (error) {
    console.warn('Optional Firebase token verification failed:', error);
  }
  next();
};

// Middleware to enforce admin-only routes
export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {

  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ error: 'Forbidden', message: 'Administrator access required.' });
  }
};
