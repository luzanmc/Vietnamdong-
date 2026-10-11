import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { User } from '../types/index.js';

export interface SessionPayload {
  uid: string;
  role: User['role'];
}

interface PendingTwoFactorPayload {
  uid: string;
  purpose: 'pending_2fa';
}

export function signSession(user: Pick<User, 'id' | 'role'>): string {
  return jwt.sign({ uid: user.id, role: user.role }, env.jwtSecret, { expiresIn: '30d' });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as SessionPayload & { purpose?: string };
    if (payload.purpose) return null;
    return payload;
  } catch {
    return null;
  }
}

export function signPendingTwoFactor(userId: string): string {
  return jwt.sign({ uid: userId, purpose: 'pending_2fa' }, env.jwtSecret, { expiresIn: '5m' });
}

export function verifyPendingTwoFactor(token: string): { uid: string } | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as PendingTwoFactorPayload;
    if (payload.purpose !== 'pending_2fa') return null;
    return { uid: payload.uid };
  } catch {
    return null;
  }
}
