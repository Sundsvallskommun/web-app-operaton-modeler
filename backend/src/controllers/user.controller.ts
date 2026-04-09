import { NextFunction, Request, Response, Router } from 'express';
import { requireAuth } from '@middlewares/auth.middleware';
import { User } from '@interfaces/users.interface';

const router = Router();

router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ data: req.user as User });
});

router.post('/logout', (req: Request, res: Response, next: NextFunction) => {
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(destroyErr => {
      if (destroyErr) return next(destroyErr);
      res.clearCookie('connect.sid');
      res.status(204).send();
    });
  });
});

export default router;
