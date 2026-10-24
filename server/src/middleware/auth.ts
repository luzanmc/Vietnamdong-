import type { Request, Response, NextFunction } from 'express';
import { verifySession } from '../utils/jwt.js';
import { getUserById } from '../repositories/userRepository.js';
import { isSessionValid, touchSessionLastSeen } from '../services/sessionService.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const cookieToken = req.cookies?.vnd_session;
  const payload = cookieToken && verifySession(cookieToken);
  if (!payload) {
    res.status(401).json({ error: 'Chưa đăng nhập' });
    return;
  }

  try {
    if (payload.sid) {
      const valid = await isSessionValid(payload.sid);
      if (!valid) {
        res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn hoặc bị thu hồi' });
        return;
      }
      void touchSessionLastSeen(payload.sid);
    }

    const user = await getUserById(payload.uid);
    if (!user || user.deleted_at) {
      res.status(401).json({ error: 'Tài khoản không tồn tại' });
      return;
    }
    if (user.banned_at) {
      const isExpired = user.ban_expires_at && new Date(user.ban_expires_at) <= new Date();
      if (!isExpired) {
        const reasonStr = user.ban_reason ? ` Lý do: ${user.ban_reason}.` : '';
        res.status(403).json({ error: `Tài khoản đã bị khóa.${reasonStr}` });
        return;
      }
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
