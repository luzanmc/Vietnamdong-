import crypto from 'node:crypto';
import type { Request } from 'express';
import { env } from '../config/env.js';

export function hashIp(ip: string): string {
  const normalized = (ip || '127.0.0.1').trim();
  return crypto.createHash('sha256').update(`${normalized}:${env.ipHashSalt}`).digest('hex');
}

export function maskIp(ip: string): string {
  let normalized = (ip || '').trim();
  if (normalized.startsWith('::ffff:')) {
    normalized = normalized.slice(7);
  }
  if (normalized.includes('.')) {
    const parts = normalized.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`;
    }
    return '*.*.*.*';
  }
  if (normalized.includes(':')) {
    const parts = normalized.split(':').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:*`;
    }
    return '*:*';
  }
  return '*.*.*.*';
}

export function getClientCountry(req: Request): string | null {
  const header = req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'];
  if (!header || typeof header !== 'string') {
    return null;
  }
  const clean = header.trim().toUpperCase();
  return clean ? clean.slice(0, 10) : null;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}
