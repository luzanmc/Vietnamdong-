import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/httpError.js';
import { redactSensitive } from '../utils/redact.js';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error(redactSensitive(err));
  if (err instanceof HttpError || (typeof err?.status === 'number' && (err?.publicMessage || err?.message))) {
    const status = err.status || 500;
    const msg = err.publicMessage || err.message;
    res.status(status).json({ error: msg });
    return;
  }
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({
    error: isDev && err?.message ? `Đã có lỗi xảy ra: ${err.message}` : 'Đã có lỗi xảy ra, vui lòng thử lại sau',
  });
}
