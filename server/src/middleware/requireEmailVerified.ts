import type { Request, Response, NextFunction } from 'express';

export function requireEmailVerified(req: Request, res: Response, next: NextFunction): void {
  const user = req.user!;
  const signedUpWithPassword = Boolean(user.password_hash);

  if (signedUpWithPassword && !user.email_verified) {
    res.status(403).json({ error: 'Vui lòng xác thực email trước khi thực hiện giao dịch này' });
    return;
  }

  next();
}
