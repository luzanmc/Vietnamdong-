import { pool, type Queryable } from '../db/database.js';
import type { User } from '../types/index.js';

export async function generateUniqueCardId(client: Queryable = pool): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const raw = Math.floor(10000000 + Math.random() * 90000000).toString();
    const formatted = `${raw.slice(0, 4)} ${raw.slice(4)}`;
    try {
      const { rows } = await client.query('SELECT 1 FROM users WHERE card_id = $1', [formatted]);
      if (rows.length === 0) return formatted;
    } catch {
      return formatted;
    }
  }
  const ts = (Date.now() % 100000000).toString().padStart(8, '0');
  return `${ts.slice(0, 4)} ${ts.slice(4)}`;
}

export async function ensureUserCardId(user: User, client: Queryable = pool): Promise<User> {
  if (!user.card_id) {
    try {
      const cardId = await generateUniqueCardId(client);
      await client.query('UPDATE users SET card_id = $1 WHERE id = $2', [cardId, user.id]);
      user.card_id = cardId;
    } catch {
      // Column may not exist yet or other non-fatal error
    }
  }
  return user;
}

export async function updateCardConfig(
  userId: string,
  cardBg: string | null,
  cardShowWm: boolean,
  client: Queryable = pool
): Promise<void> {
  try {
    await client.query(
      'UPDATE users SET card_bg = $1, card_show_wm = $2 WHERE id = $3',
      [cardBg, cardShowWm ? 1 : 0, userId]
    );
  } catch (err: any) {
    // If column doesn't exist yet, alter table and retry once
    try {
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS card_bg TEXT');
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS card_show_wm INTEGER DEFAULT 1');
      await client.query(
        'UPDATE users SET card_bg = $1, card_show_wm = $2 WHERE id = $3',
        [cardBg, cardShowWm ? 1 : 0, userId]
      );
    } catch {
      throw err;
    }
  }
}

export async function getUserById(id: string, client: Queryable = pool): Promise<User | undefined> {
  const { rows } = await client.query<User>('SELECT * FROM users WHERE id = $1', [id]);
  if (!rows[0]) return undefined;
  return await ensureUserCardId(rows[0], client);
}

export async function getUserByDiscordId(discordId: string, client: Queryable = pool): Promise<User | undefined> {
  const { rows } = await client.query<User>('SELECT * FROM users WHERE discord_id = $1', [discordId]);
  if (!rows[0]) return undefined;
  return await ensureUserCardId(rows[0], client);
}

export async function getUserByGoogleSub(sub: string, client: Queryable = pool): Promise<User | undefined> {
  const { rows } = await client.query<User>('SELECT * FROM users WHERE google_sub = $1', [sub]);
  if (!rows[0]) return undefined;
  return await ensureUserCardId(rows[0], client);
}

export async function getUserByUsername(username: string, client: Queryable = pool): Promise<User | undefined> {
  const { rows } = await client.query<User>('SELECT * FROM users WHERE username = $1', [username]);
  if (!rows[0]) return undefined;
  return await ensureUserCardId(rows[0], client);
}

export async function getUserByEmail(email: string, client: Queryable = pool): Promise<User | undefined> {
  const { rows } = await client.query<User>('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  if (!rows[0]) return undefined;
  return await ensureUserCardId(rows[0], client);
}

export async function createUserWithPassword(
  id: string,
  email: string,
  username: string,
  passwordHash: string,
  registeredIp: string | null,
  client: Queryable = pool
): Promise<void> {
  const cardId = await generateUniqueCardId(client);
  await client.query(
    `INSERT INTO users (id, email, username, password_hash, email_verified, registered_ip, card_id, terms_accepted_at) VALUES ($1, $2, $3, $4, 0, $5, $6, now())`,
    [id, email.toLowerCase(), username, passwordHash, registeredIp, cardId]
  );
}

export async function countUsersFromIpToday(ip: string, client: Queryable = pool): Promise<number> {
  const { rows } = await client.query(
    `SELECT COUNT(*) AS c FROM users WHERE registered_ip = $1 AND created_at >= now() - interval '24 hours'`,
    [ip]
  );
  return Number(rows[0].c);
}

export async function setUserPasswordHash(userId: string, passwordHash: string, client: Queryable = pool): Promise<void> {
  await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
}

export async function markEmailVerified(userId: string, client: Queryable = pool): Promise<void> {
  await client.query('UPDATE users SET email_verified = 1 WHERE id = $1', [userId]);
}

export async function createUserFromDiscord(
  id: string,
  discordId: string,
  username: string,
  avatarUrl: string | null,
  client: Queryable = pool
): Promise<void> {
  const cardId = await generateUniqueCardId(client);
  await client.query('INSERT INTO users (id, discord_id, username, avatar_url, card_id) VALUES ($1, $2, $3, $4, $5)', [
    id,
    discordId,
    username,
    avatarUrl,
    cardId,
  ]);
}

export async function updateUserFromDiscord(
  id: string,
  username: string,
  avatarUrl: string | null,
  client: Queryable = pool
): Promise<void> {
  await client.query('UPDATE users SET username = $1, avatar_url = $2 WHERE id = $3', [username, avatarUrl, id]);
}

export async function updateUserAvatar(
  userId: string,
  avatarUrl: string | null,
  client: Queryable = pool
): Promise<void> {
  await client.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, userId]);
}

export async function createUserFromGoogle(
  id: string,
  googleSub: string,
  username: string,
  avatarUrl: string | null,
  client: Queryable = pool
): Promise<void> {
  const cardId = await generateUniqueCardId(client);
  await client.query('INSERT INTO users (id, google_sub, username, avatar_url, card_id) VALUES ($1, $2, $3, $4, $5)', [
    id,
    googleSub,
    username,
    avatarUrl,
    cardId,
  ]);
}

export async function setReferredBy(userId: string, referrerId: string, client: Queryable = pool): Promise<void> {
  await client.query('UPDATE users SET referred_by = $1 WHERE id = $2', [referrerId, userId]);
}

export async function setCreatorCode(userId: string, creatorCodeId: string, client: Queryable = pool): Promise<void> {
  await client.query('UPDATE users SET creator_code_id = $1 WHERE id = $2', [creatorCodeId, userId]);
}

export async function searchUsers(
  query: string,
  limit = 20,
  offset = 0,
  client: Queryable = pool
): Promise<{
  rows: (Pick<User, 'id' | 'username' | 'email' | 'avatar_url' | 'balance_nova' | 'role' | 'created_at' | 'locked' | 'xp' | 'avatar_frame' | 'card_bg' | 'card_id' | 'banned_at' | 'ban_reason' | 'ban_expires_at'>)[];
  total: number;
}> {
  const searchTerm = `%${query.trim()}%`;
  const countRes = await client.query(
    `SELECT COUNT(*) AS total FROM users
     WHERE deleted_at IS NULL AND (username ILIKE $1 OR email ILIKE $1 OR id ILIKE $1)`,
    [searchTerm]
  );
  const total = Number(countRes.rows[0]?.total || 0);

  const { rows } = await client.query(
    `SELECT id, username, email, avatar_url, balance_nova, role, created_at, locked,
            COALESCE(xp, 0)::int AS xp, avatar_frame, card_bg, card_id, banned_at, ban_reason, ban_expires_at
     FROM users
     WHERE deleted_at IS NULL AND (username ILIKE $1 OR email ILIKE $1 OR id ILIKE $1)
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [searchTerm, limit, offset]
  );
  return { rows, total };
}

export async function addXpToUser(
  userId: string,
  xpDelta: number,
  client: Queryable = pool
): Promise<{ previousXp: number; newXp: number }> {
  const { rows } = await client.query<{ xp: number }>(
    `SELECT COALESCE(xp, 0)::int AS xp FROM users WHERE id = $1 FOR UPDATE`,
    [userId]
  );
  const previousXp = Number(rows[0]?.xp || 0);
  const newXp = Math.max(0, previousXp + xpDelta);
  await client.query(`UPDATE users SET xp = $1 WHERE id = $2`, [newXp, userId]);
  return { previousXp, newXp };
}

export async function setUserXp(
  userId: string,
  xp: number,
  client: Queryable = pool
): Promise<{ previousXp: number; newXp: number }> {
  const { rows } = await client.query<{ xp: number }>(
    `SELECT COALESCE(xp, 0)::int AS xp FROM users WHERE id = $1 FOR UPDATE`,
    [userId]
  );
  const previousXp = Number(rows[0]?.xp || 0);
  const newXp = Math.max(0, Math.floor(xp));
  await client.query(`UPDATE users SET xp = $1 WHERE id = $2`, [newXp, userId]);
  return { previousXp, newXp };
}

export async function adjustUserBalanceRaw(userId: string, delta: number, client: Queryable = pool): Promise<void> {
  await client.query('UPDATE users SET balance_nova = balance_nova + $1 WHERE id = $2', [delta, userId]);
}

export async function updateStreak(
  userId: string,
  streakDays: number,
  streakLastDate: string,
  client: Queryable = pool
): Promise<void> {
  await client.query('UPDATE users SET streak_days = $1, streak_last_date = $2 WHERE id = $3', [
    streakDays,
    streakLastDate,
    userId,
  ]);
}

export async function countReferredUsers(
  referrerId: string,
  client: Queryable = pool
): Promise<Pick<User, 'username' | 'created_at'>[]> {
  const { rows } = await client.query(
    'SELECT username, created_at FROM users WHERE referred_by = $1 ORDER BY created_at DESC',
    [referrerId]
  );
  return rows;
}

export async function sumReferralBonusEarned(userId: string, client: Queryable = pool): Promise<number> {
  const { rows } = await client.query(
    `SELECT COALESCE(SUM(amount), 0)::int AS total FROM coin_ledger WHERE user_id = $1 AND reason = 'referral_bonus'`,
    [userId]
  );
  return Number(rows[0].total);
}

export async function countAllUsers(client: Queryable = pool): Promise<number> {
  const { rows } = await client.query('SELECT COUNT(*) AS c FROM users');
  return Number(rows[0].c);
}

export async function lockUser(userId: string, client: Queryable = pool): Promise<void> {
  await client.query('UPDATE users SET locked = 1 WHERE id = $1', [userId]);
}

export async function unlockUser(userId: string, client: Queryable = pool): Promise<void> {
  await client.query('UPDATE users SET locked = 0 WHERE id = $1', [userId]);
}

export async function updateUserAvatarFrame(
  userId: string,
  frame: string | null,
  client: Queryable = pool
): Promise<void> {
  await client.query('UPDATE users SET avatar_frame = $1 WHERE id = $2', [frame, userId]);
}

export async function updateUsername(
  userId: string,
  newUsername: string,
  client: Queryable = pool
): Promise<void> {
  await client.query('UPDATE users SET username = $1 WHERE id = $2', [newUsername, userId]);
}

export async function banUser(
  userId: string,
  reason: string | null,
  expiresAt: Date | null,
  client: Queryable = pool
): Promise<void> {
  await client.query(
    `UPDATE users
     SET banned_at = now(),
         ban_reason = $1,
         ban_expires_at = $2,
         locked = 1,
         token_version = token_version + 1
     WHERE id = $3`,
    [reason, expiresAt, userId]
  );
}

export async function unbanUser(userId: string, client: Queryable = pool): Promise<void> {
  await client.query(
    `UPDATE users
     SET banned_at = NULL,
         ban_reason = NULL,
         ban_expires_at = NULL,
         locked = 0
     WHERE id = $1`,
    [userId]
  );
}

export async function softDeleteUser(userId: string, client: Queryable = pool): Promise<void> {
  await client.query(
    `UPDATE users
     SET deleted_at = now(),
         locked = 1,
         token_version = token_version + 1
     WHERE id = $1`,
    [userId]
  );
}

export async function hardDeleteUser(userId: string, client: Queryable = pool): Promise<void> {
  await client.query('UPDATE users SET referred_by = NULL WHERE referred_by = $1', [userId]);
  await client.query('UPDATE vietsub_licenses SET sold_to_user_id = NULL WHERE sold_to_user_id = $1', [userId]);
  await client.query('DELETE FROM admin_totp_attempts WHERE admin_id = $1', [userId]);
  await client.query('DELETE FROM admin_audit_log WHERE admin_id = $1', [userId]);
  await client.query('DELETE FROM giftcode_redemptions WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM quest_progress WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM spin_claims WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM support_messages WHERE ticket_id IN (SELECT id FROM support_tickets WHERE user_id = $1)', [userId]);
  await client.query('DELETE FROM support_tickets WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM security_flags WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM vietsub_orders WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM user_achievements WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM daily_claims WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM email_verifications WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM password_resets WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM redeem_orders WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM transfers WHERE from_user_id = $1 OR to_user_id = $1', [userId]);
  await client.query('DELETE FROM withdrawals WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM coin_ledger WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM task_attempts WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM creator_codes WHERE owner_user_id = $1', [userId]);
  await client.query('DELETE FROM totp_secrets WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM users WHERE id = $1', [userId]);
}

export async function countActiveAdmins(client: Queryable = pool): Promise<number> {
  const { rows } = await client.query('SELECT COUNT(*) AS c FROM users WHERE role = $1 AND deleted_at IS NULL', ['admin']);
  return Number(rows[0]?.c || 0);
}

export async function updateUserRole(
  userId: string,
  role: 'user' | 'admin',
  client: Queryable = pool
): Promise<void> {
  await client.query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
}

export async function listAdmins(
  client: Queryable = pool
): Promise<Pick<User, 'id' | 'username' | 'email' | 'avatar_url' | 'created_at' | 'role'>[]> {
  const { rows } = await client.query<Pick<User, 'id' | 'username' | 'email' | 'avatar_url' | 'created_at' | 'role'>>(
    'SELECT id, username, email, avatar_url, created_at, role FROM users WHERE role = $1 AND deleted_at IS NULL ORDER BY created_at ASC',
    ['admin']
  );
  return rows;
}
