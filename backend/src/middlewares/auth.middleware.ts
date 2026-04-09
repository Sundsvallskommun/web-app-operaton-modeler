import { NextFunction, Request, Response } from 'express';

/**
 * Refuses unauthenticated API calls with a 401. The SPA's LoginGuard catches
 * the 401 and redirects the browser to /login.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated && req.isAuthenticated()) {
    next();
    return;
  }
  res.status(401).json({ status: 401, title: 'Unauthorized' });
}
