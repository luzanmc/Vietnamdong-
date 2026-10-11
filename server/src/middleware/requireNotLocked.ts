import type { Request, Response, NextFunction } from 'express';

export function requireNotLocked(req: Request, res: Response, next: NextFunction): void {
  if (req.user!.locked) {
    res.status(403).json({ error: 'Tài khoản của bạn đang tạm khóa để admin xem xét. Vui lòng liên hệ hỗ trợ.' });
    return;
  }
  next();
}
