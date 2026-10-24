import crypto from 'node:crypto';
import type { Request } from 'express';
import { nanoid } from 'nanoid';
import { env } from '../config/env.js';
import { pool } from '../db/database.js';
import { hashIp, maskIp, getClientCountry, getClientIp, getIpSubnet24, parseUserAgent } from '../utils/ip.js';
import { createNotification } from '../repositories/notificationRepository.js';
import { sendLoginAlertEmail } from './mailService.js';
import { getUserById } from '../repositories/userRepository.js';

interface SessionCacheItem {
  valid: boolean;
  cachedAt: number;
  lastSeenUpdated: number;
}

const sessionCache = new Map<string, SessionCacheItem>();
const CACHE_TTL_MS = 15_000;
const LAST_SEEN_UPDATE_INTERVAL_MS = 300_000;
const MAX_SESSIONS_PER_USER = 20;

export async function createSession(userId: string, req: Request, trusted = false): Promise<string> {
  const rawIp = getClientIp(req);
  const ipHash = hashIp(rawIp);
  const ipMasked = maskIp(rawIp);
  const rawUa = (req.headers['user-agent'] || 'Unknown').trim();
  const userAgent = rawUa.length > 255 ? rawUa.slice(0, 252) + '...' : rawUa;
  const country = getClientCountry(req);
  const normalizedUa = rawUa.toLowerCase().replace(/\s+/g, ' ');
  const subnet24 = getIpSubnet24(rawIp);
  const deviceHash = crypto.createHash('sha256').update(`${normalizedUa}:${subnet24}`).digest('hex');
  const sid = crypto.randomUUID();

  const countAllRes = await pool.query<{ count: string }>(
    'SELECT COUNT(*) as count FROM user_sessions WHERE user_id = $1',
    [userId]
  );
  const totalPriorSessions = Number(countAllRes.rows[0]?.count || 0);

  const existingDeviceRes = await pool.query(
    'SELECT 1 FROM user_sessions WHERE user_id = $1 AND device_hash = $2 LIMIT 1',
    [userId, deviceHash]
  );
  const isNewStrangeDevice = totalPriorSessions > 0 && existingDeviceRes.rows.length === 0;

  const countRes = await pool.query<{ count: string }>(
    'SELECT COUNT(*) as count FROM user_sessions WHERE user_id = $1 AND revoked_at IS NULL',
    [userId]
  );
  const activeCount = Number(countRes.rows[0]?.count || 0);

  if (activeCount >= MAX_SESSIONS_PER_USER) {
    const toRemove = activeCount - MAX_SESSIONS_PER_USER + 1;
    await pool.query(
      `DELETE FROM user_sessions
       WHERE id IN (
         SELECT id FROM user_sessions
         WHERE user_id = $1 AND revoked_at IS NULL
         ORDER BY created_at ASC
         LIMIT $2
       )`,
      [userId, toRemove]
    );
  }

  await pool.query(
    `INSERT INTO user_sessions (id, user_id, device_hash, user_agent, ip_hash, ip_masked, country, created_at, last_seen_at, revoked_at, trusted)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now(), NULL, $8)`,
    [sid, userId, deviceHash, userAgent, ipHash, ipMasked, country, trusted]
  );

  const now = Date.now();
  sessionCache.set(sid, {
    valid: true,
    cachedAt: now,
    lastSeenUpdated: now,
  });

  if (isNewStrangeDevice) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenId = nanoid();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    pool.query(
      `INSERT INTO account_security_tokens (id, user_id, token_hash, device_hash, session_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tokenId, userId, tokenHash, deviceHash, sid, expiresAt]
    ).catch((err) => {
      console.error('Lỗi lưu account_security_tokens:', err);
    });

    const parsedUa = parseUserAgent(rawUa);
    const locationStr = country || 'Vị trí không xác định';
    const timeStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const notifMsg = `Phát hiện đăng nhập từ thiết bị lạ: ${parsedUa.browser} trên ${parsedUa.os} (${locationStr}) lúc ${timeStr}.`;

    createNotification(nanoid(), userId, notifMsg, `/secure-account?token=${rawToken}&action=lock`).catch((err) => {
      console.error('Lỗi tạo notification thiết bị lạ:', err);
    });

    getUserById(userId).then((user) => {
      if (user?.email && user.email_verified === 1 && env.mail.host) {
        sendLoginAlertEmail(user.email, {
          device: `${parsedUa.device} (${parsedUa.os})`,
          browser: parsedUa.browser,
          location: locationStr,
          time: timeStr,
          secureUrl: `${env.clientUrl}/secure-account?token=${rawToken}&action=lock`,
          trustUrl: `${env.clientUrl}/secure-account?token=${rawToken}&action=trust`,
        }).catch((err) => {
          console.error('Lỗi gửi email cảnh báo thiết bị lạ:', err);
        });
      }
    }).catch(() => {});
  }

  return sid;
}

export async function recordLoginEvent(userId: string, success: boolean, req: Request): Promise<void> {
  try {
    const rawIp = getClientIp(req);
    const ipMasked = maskIp(rawIp);
    const rawUa = (req.headers['user-agent'] || 'Unknown').trim();
    const userAgent = rawUa.length > 255 ? rawUa.slice(0, 252) + '...' : rawUa;

    await pool.query(
      `INSERT INTO login_events (user_id, success, ip_masked, user_agent, created_at)
       VALUES ($1, $2, $3, $4, now())`,
      [userId, success, ipMasked, userAgent]
    );
  } catch (err) {
    console.error('Lỗi ghi login_events:', err);
  }
}

export async function isSessionValid(sid: string): Promise<boolean> {
  const now = Date.now();
  const cached = sessionCache.get(sid);
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached.valid;
  }

  const { rows } = await pool.query<{ id: string; revoked_at: string | null }>(
    'SELECT id, revoked_at FROM user_sessions WHERE id = $1',
    [sid]
  );

  if (rows.length === 0 || rows[0].revoked_at !== null) {
    sessionCache.set(sid, {
      valid: false,
      cachedAt: now,
      lastSeenUpdated: 0,
    });
    return false;
  }

  sessionCache.set(sid, {
    valid: true,
    cachedAt: now,
    lastSeenUpdated: cached ? cached.lastSeenUpdated : now,
  });
  return true;
}

export async function touchSessionLastSeen(sid: string): Promise<void> {
  const now = Date.now();
  const cached = sessionCache.get(sid);
  if (cached && now - cached.lastSeenUpdated < LAST_SEEN_UPDATE_INTERVAL_MS) {
    return;
  }

  if (cached) {
    cached.lastSeenUpdated = now;
  }

  try {
    await pool.query('UPDATE user_sessions SET last_seen_at = now() WHERE id = $1', [sid]);
  } catch (err) {
    console.error('Lỗi cập nhật last_seen_at:', err);
  }
}

export async function revokeSession(sid: string): Promise<void> {
  sessionCache.delete(sid);
  try {
    await pool.query('UPDATE user_sessions SET revoked_at = now() WHERE id = $1', [sid]);
  } catch (err) {
    console.error('Lỗi thu hồi session:', err);
  }
}

export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  sessionCache.clear();
  try {
    await pool.query('UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
  } catch (err) {
    console.error('Lỗi thu hồi mọi session:', err);
  }
}

export async function revokeAllOtherSessions(userId: string, currentSid: string): Promise<void> {
  sessionCache.clear();
  try {
    await pool.query(
      'UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1 AND id != $2 AND revoked_at IS NULL',
      [userId, currentSid]
    );
  } catch (err) {
    console.error('Lỗi thu hồi các session khác:', err);
  }
}

export async function getUserActiveSessions(userId: string, currentSid?: string) {
  const { rows } = await pool.query<{
    id: string;
    user_agent: string;
    ip_masked: string;
    country: string | null;
    created_at: string;
    last_seen_at: string;
    trusted: boolean;
  }>(
    `SELECT id, user_agent, ip_masked, country, created_at, last_seen_at, trusted
     FROM user_sessions
     WHERE user_id = $1 AND revoked_at IS NULL
     ORDER BY last_seen_at DESC`,
    [userId]
  );

  return rows.map((s) => {
    const parsed = parseUserAgent(s.user_agent || '');
    return {
      id: s.id,
      device: `${parsed.device} (${parsed.os})`,
      browser: parsed.browser,
      userAgent: s.user_agent,
      ipMasked: s.ip_masked,
      country: s.country,
      createdAt: s.created_at,
      lastSeenAt: s.last_seen_at,
      trusted: s.trusted,
      isCurrent: s.id === currentSid,
    };
  });
}
