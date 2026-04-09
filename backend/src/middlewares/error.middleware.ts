import { NextFunction, Request, Response } from 'express';
import { HttpException } from '@exceptions/HttpException';
import { logger } from '@utils/logger';

export function errorMiddleware(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpException) {
    logger.warn(`[${err.status}] ${err.message}${err.detail ? ` — ${err.detail}` : ''}`);
    res.status(err.status).json({ status: err.status, title: err.message, detail: err.detail });
    return;
  }
  logger.error('Unhandled error', err);
  res.status(500).json({ status: 500, title: 'Internal Server Error', detail: err.message });
}
