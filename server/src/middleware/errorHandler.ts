import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/httpError.js';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  console.error(err);
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.publicMessage });
    return;
  }
  res.status(500).json({ error: 'Đã có lỗi xảy ra, vui lòng thử lại sau' });
}
