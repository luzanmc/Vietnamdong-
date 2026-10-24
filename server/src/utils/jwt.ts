import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { User } from '../types/index.js';

export interface SessionPayload {
  uid: string;
  role: User['role'];
  sid?: string;
}

interface PendingTwoFactorPayload {
  uid: string;
  purpose: 'pending_2fa';
}

export function signSession(user: Pick<User, 'id' | 'role'>, sid?: string): string {
  const payload: SessionPayload = { uid: user.id, role: user.role };
  if (sid) {
    payload.sid = sid;
  }
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '30d' });
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

interface PendingOtpPayload {
  uid: string;
  purpose: 'country_verification' | 'passwordless_login';
  country?: string;
}

export function signPendingOtp(userId: string, purpose: 'country_verification' | 'passwordless_login', country?: string): string {
  return jwt.sign({ uid: userId, purpose, country }, env.jwtSecret, { expiresIn: '10m' });
}

export function verifyPendingOtp(token: string): { uid: string; purpose: string; country?: string } | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as PendingOtpPayload;
    if (!payload.purpose || (payload.purpose !== 'country_verification' && payload.purpose !== 'passwordless_login')) {
      return null;
    }
    return { uid: payload.uid, purpose: payload.purpose, country: payload.country };
  } catch {
    return null;
  }
}
