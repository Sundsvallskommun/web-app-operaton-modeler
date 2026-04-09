import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { requireAuth } from '@middlewares/auth.middleware';
import { operatonService } from '@services/operaton.service';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All operaton proxy routes are session-protected.
router.use(requireAuth);

router.get('/topics/templates', forward(() => operatonService.get('/topics/templates')));

router.get('/process-definitions', forward(() => operatonService.get('/process-definitions')));

router.get('/process-definitions/:id/xml', (req, res, next) =>
  forward(() => operatonService.get(`/process-definitions/${encodeURIComponent(req.params.id)}/xml`, { responseType: 'text', headers: { Accept: 'application/xml' } }), 'application/xml')(req, res, next),
);

router.get('/decision-definitions', forward(() => operatonService.get('/decision-definitions')));

router.get('/decision-definitions/:id/xml', (req, res, next) =>
  forward(() => operatonService.get(`/decision-definitions/${encodeURIComponent(req.params.id)}/xml`, { responseType: 'text', headers: { Accept: 'application/xml' } }), 'application/xml')(req, res, next),
);

router.delete('/deployments/:id', (req, res, next) => {
  const cascade = req.query.cascade === 'true';
  return forward(() => operatonService.delete(`/deployments/${encodeURIComponent(req.params.id)}?cascade=${cascade}`))(req, res, next);
});

router.post('/deployments', upload.single('file'), (req, res, next) => {
  if (!req.file) {
    res.status(400).json({ status: 400, title: 'Missing file', detail: 'Expected multipart field "file"' });
    return;
  }
  const name = (req.body?.name as string) || req.file.originalname;
  return forward(() =>
    operatonService.postMultipart('/deployments', {
      buffer: req.file!.buffer,
      filename: req.file!.originalname,
      contentType: req.file!.mimetype || 'application/xml',
    }, { name }),
  )(req, res, next);
});

/**
 * Wraps an async operaton call so the result lands on the response and any
 * thrown HttpException flows into the global error middleware. `contentType`
 * lets text/xml endpoints stream through unmolested (otherwise we default
 * to JSON).
 */
function forward<T>(call: () => Promise<{ data: T; status: number }>, contentType?: string) {
  return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const upstream = await call();
      res.status(upstream.status);
      if (contentType) {
        res.type(contentType).send(upstream.data);
      } else {
        res.json(upstream.data);
      }
    } catch (err) {
      next(err);
    }
  };
}

export default router;
