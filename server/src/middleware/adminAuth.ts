import type { Request, Response, NextFunction, CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { env } from '../config/env.js';
import { getUserById } from '../repositories/userRepository.js';
import { getTotp } from '../repositories/totpRepository.js';
import { verifyTotpCode } from '../utils/totp.js';
import { createAdminAuditLog } from '../repositories/adminAuditRepository.js';
import { auditService } from '../services/auditService.js';
import {
  getAdminTotpAttempt,
  recordAdminTotpFailure,
  resetAdminTotpFailure,
} from '../repositories/adminTotpRepository.js';
import type { User } from '../types/index.js';

export const adminCookieOpts: CookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax',
  maxAge: 30 * 60 * 1000,
  path: '/',
};

export const adminAdvancedCookieOpts: CookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax',
  maxAge: 10 * 60 * 1000,
  path: '/',
};

export function signAdminToken(userId: string): string {
  return jwt.sign({ uid: userId, type: 'admin_session' }, env.jwtSecret, { expiresIn: '30m' });
}

export function signAdminAdvancedToken(userId: string): string {
  return jwt.sign({ uid: userId, type: 'admin_advanced_session' }, env.jwtSecret, { expiresIn: '10m' });
}

export function verifyAdminToken(token: string): { uid: string } | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { uid: string; type: string };
    if (payload.type !== 'admin_session') return null;
    return { uid: payload.uid };
  } catch {
    return null;
  }
}

export function verifyAdminAdvancedToken(token: string): { uid: string } | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { uid: string; type: string };
    if (payload.type !== 'admin_advanced_session') return null;
    return { uid: payload.uid };
  } catch {
    return null;
  }
}

export async function requireAdminSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.vnd_admin_session || (req.headers['x-admin-token'] as string | undefined);
  if (!token) {
    res.status(401).json({ error: 'Yêu cầu xác thực TOTP để truy cập trang quản trị', code: 'ADMIN_SESSION_REQUIRED' });
    return;
  }

  const payload = verifyAdminToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Phiên quản trị viên đã hết hạn hoặc không hợp lệ', code: 'ADMIN_SESSION_REQUIRED' });
    return;
  }

  try {
    const user = await getUserById(payload.uid);
    if (!user || user.deleted_at || user.role !== 'admin' || user.locked) {
      res.clearCookie('vnd_admin_session', adminCookieOpts);
      res.clearCookie('vnd_admin_advanced_session', adminAdvancedCookieOpts);
      res.status(403).json({ error: 'Không có quyền quản trị viên' });
      return;
    }

    if (user.banned_at) {
      const isExpired = user.ban_expires_at && new Date(user.ban_expires_at) <= new Date();
      if (!isExpired) {
        res.clearCookie('vnd_admin_session', adminCookieOpts);
        res.clearCookie('vnd_admin_advanced_session', adminAdvancedCookieOpts);
        res.status(403).json({ error: 'Tài khoản quản trị viên đã bị khóa' });
        return;
      }
    }

    req.user = user;
    req.adminUser = user;

    res.cookie('vnd_admin_session', signAdminToken(user.id), adminCookieOpts);
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireAdminAdvancedSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.vnd_admin_advanced_session || (req.headers['x-admin-advanced-token'] as string | undefined);
  if (!token) {
    res.status(403).json({ error: 'Phiên quản lý nâng cao đã hết hạn hoặc chưa xác thực TOTP (10 phút)', code: 'ADVANCED_SESSION_REQUIRED' });
    return;
  }

  const payload = verifyAdminAdvancedToken(token);
  if (!payload || payload.uid !== req.adminUser?.id) {
    res.status(403).json({ error: 'Phiên quản lý nâng cao không hợp lệ hoặc đã hết hạn', code: 'ADVANCED_SESSION_REQUIRED' });
    return;
  }

  next();
}

export async function checkAdminTotpRateLimit(adminId: string): Promise<{ locked: boolean; message?: string }> {
  const attempt = await getAdminTotpAttempt(adminId);
  if (attempt?.locked_until && new Date(attempt.locked_until) > new Date()) {
    const remainingMs = new Date(attempt.locked_until).getTime() - Date.now();
    const remainingMins = Math.max(1, Math.ceil(remainingMs / 60000));
    return {
      locked: true,
      message: `Bạn đã nhập sai mã TOTP 5 lần. Hệ thống tạm khóa 15 phút (còn lại ${remainingMins} phút).`,
    };
  }
  return { locked: false };
}

export async function recordAdminTotpFailureAndCheck(adminId: string): Promise<{ locked: boolean; message: string }> {
  const res = await recordAdminTotpFailure(adminId);
  if (res.locked) {
    return {
      locked: true,
      message: 'Bạn đã nhập sai mã xác minh 5 lần. Tài khoản quản trị bị tạm khóa thao tác 15 phút.',
    };
  }
  return {
    locked: false,
    message: `Mã xác thực TOTP không đúng. Còn lại ${5 - res.attempts} lần thử.`,
  };
}

export async function resetAdminTotpAttempts(adminId: string): Promise<void> {
  await resetAdminTotpFailure(adminId);
}

export async function verifyDangerousTotp(adminId: string, totpCode: string): Promise<boolean> {
  const cleanCode = String(totpCode || '').trim();
  if (!cleanCode) return false;
  const totp = await getTotp(adminId);
  if (!totp || totp.enabled !== 1) return false;
  return verifyTotpCode(totp.secret, cleanCode);
}

export async function logAdminAudit(
  adminId: string,
  action: string,
  target?: string | null,
  payload?: any,
  req?: Request
): Promise<void> {
  try {
    const chainRecord = await auditService.record(adminId, action, target ?? null, payload).catch((err) => {
      console.error('Lỗi ghi audit chain:', err);
      return null;
    });

    let payloadStr: string | null = null;
    if (payload !== undefined && payload !== null) {
      const sanitized = { ...payload };
      delete sanitized.password;
      delete sanitized.newPassword;
      delete sanitized.password_hash;
      delete sanitized.totpCode;
      delete sanitized.secret;
      delete sanitized.token;
      payloadStr = JSON.stringify(sanitized);
      if (payloadStr.length > 500) {
        payloadStr = payloadStr.slice(0, 497) + '...';
      }
    }
    const ip = req ? ((req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null) : null;
    await createAdminAuditLog(nanoid(), adminId, action, target ?? null, payloadStr, ip, chainRecord?.hash || null);
  } catch (err) {
    console.error('Lỗi ghi audit log:', err);
  }
}
