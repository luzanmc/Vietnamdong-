import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

const clientOrigin = new URL(env.clientUrl).origin;

const standardAllowed = new Set([
  clientOrigin,
  'https://vietnamdong.vercel.app',
  'https://vietnamdong-zetrastudio.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function isAllowedOrigin(originStr: string): boolean {
  if (standardAllowed.has(originStr)) return true;
  try {
    const u = new URL(originStr);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
    if (u.hostname.endsWith('.vercel.app')) return true;
  } catch {
    return false;
  }
  return false;
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase())) {
    return next();
  }

  const path = req.originalUrl.split('?')[0];
  if (path === '/api/card2k' || path.startsWith('/api/card2k/')) {
    return next();
  }

  const reqWith = req.headers['x-requested-with'];
  if (!reqWith || typeof reqWith !== 'string' || reqWith.toLowerCase() !== 'vnd') {
    res.status(403).json({ error: 'Yêu cầu bị từ chối: thiếu hoặc sai tiêu đề xác thực CSRF (X-Requested-With)' });
    return;
  }

  const originHeader = req.headers['origin'];
  const refererHeader = req.headers['referer'];

  let requestOrigin: string | null = null;
  if (typeof originHeader === 'string' && originHeader.trim()) {
    requestOrigin = originHeader.trim();
  } else if (typeof refererHeader === 'string' && refererHeader.trim()) {
    try {
      requestOrigin = new URL(refererHeader.trim()).origin;
    } catch {
      requestOrigin = null;
    }
  }

  if (!requestOrigin) {
    res.status(403).json({ error: 'Yêu cầu bị từ chối: thiếu thông tin nguồn gốc yêu cầu (Origin/Referer)' });
    return;
  }

  if (!isAllowedOrigin(requestOrigin)) {
    res.status(403).json({ error: 'Yêu cầu bị từ chối: nguồn gốc yêu cầu (Origin/Referer) không hợp lệ' });
    return;
  }

  next();
}
