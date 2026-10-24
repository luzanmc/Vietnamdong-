import crypto from 'node:crypto';
import type { Request } from 'express';
import { pool } from '../db/database.js';
import { hashIp, maskIp, getClientCountry, getClientIp } from '../utils/ip.js';

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
  const deviceHash = crypto.createHash('sha256').update(`${userAgent}:${ipMasked}`).digest('hex');
  const sid = crypto.randomUUID();

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
