import type { Request, Response, NextFunction } from 'express';
import { verifySession } from '../utils/jwt.js';
import { getUserById } from '../repositories/userRepository.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const cookieToken = req.cookies?.vnd_session;
  const payload = cookieToken && verifySession(cookieToken);
  if (!payload) {
    res.status(401).json({ error: 'Chưa đăng nhập' });
    return;
  }

  try {
    const user = await getUserById(payload.uid);
    if (!user) {
      res.status(401).json({ error: 'Tài khoản không tồn tại' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Không có quyền truy cập' });
    return;
  }
  next();
}
