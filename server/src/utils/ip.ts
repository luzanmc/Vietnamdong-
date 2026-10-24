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

export function getIpSubnet24(ip: string): string {
  let normalized = (ip || '').trim();
  if (normalized.startsWith('::ffff:')) {
    normalized = normalized.slice(7);
  }
  if (normalized.includes('.')) {
    const parts = normalized.split('.');
    if (parts.length >= 3) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
  }
  if (normalized.includes(':')) {
    const parts = normalized.split(':').filter(Boolean);
    if (parts.length >= 3) {
      return `${parts.slice(0, 3).join(':')}::/48`;
    }
  }
  return normalized || '127.0.0.0/24';
}

export function parseUserAgent(ua: string): { browser: string; os: string; device: string } {
  let browser = 'Trình duyệt khác';
  let os = 'Hệ điều hành khác';
  let device = 'Máy tính';

  if (/windows phone/i.test(ua)) {
    os = 'Windows Phone';
    device = 'Điện thoại';
  } else if (/android/i.test(ua)) {
    os = 'Android';
    device = 'Điện thoại';
  } else if (/ipad/i.test(ua)) {
    os = 'iPadOS';
    device = 'Máy tính bảng';
  } else if (/iphone|ipod/i.test(ua)) {
    os = 'iOS';
    device = 'iPhone';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
    device = 'Mac';
  } else if (/windows/i.test(ua)) {
    os = 'Windows';
    device = 'Máy tính';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
    device = 'Máy tính';
  }

  if (/edg/i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/opr|opera/i.test(ua)) {
    browser = 'Opera';
  } else if (/chrome|crios/i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/safari/i.test(ua)) {
    browser = 'Apple Safari';
  }

  return { browser, os, device };
}
