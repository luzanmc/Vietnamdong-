import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { User } from '../types/index.js';

export interface SessionPayload {
  uid: string;
  role: User['role'];
}

export function signSession(user: Pick<User, 'id' | 'role'>): string {
  return jwt.sign({ uid: user.id, role: user.role }, env.jwtSecret, { expiresIn: '30d' });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, env.jwtSecret) as SessionPayload;
  } catch {
    return null;
  }
}
