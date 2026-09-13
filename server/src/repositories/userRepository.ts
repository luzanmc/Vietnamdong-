import { pool, type Queryable } from '../db/database.js';
import type { User } from '../types/index.js';

export async function getUserById(id: string, client: Queryable = pool): Promise<User | undefined> {
  const { rows } = await client.query<User>('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0];
}

export async function getUserByDiscordId(discordId: string, client: Queryable = pool): Promise<User | undefined> {
  const { rows } = await client.query<User>('SELECT * FROM users WHERE discord_id = $1', [discordId]);
  return rows[0];
}

export async function getUserByGoogleSub(sub: string, client: Queryable = pool): Promise<User | undefined> {
  const { rows } = await client.query<User>('SELECT * FROM users WHERE google_sub = $1', [sub]);
  return rows[0];
}

export async function getUserByUsername(username: string, client: Queryable = pool): Promise<User | undefined> {
  const { rows } = await client.query<User>('SELECT * FROM users WHERE username = $1', [username]);
  return rows[0];
}

export async function getUserByEmail(email: string, client: Queryable = pool): Promise<User | undefined> {
  const { rows } = await client.query<User>('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  return rows[0];
}

export async function createUserWithPassword(
  id: string,
  email: string,
  username: string,
  passwordHash: string,
  client: Queryable = pool
): Promise<void> {
  await client.query(
    `INSERT INTO users (id, email, username, password_hash, email_verified) VALUES ($1, $2, $3, $4, 0)`,
    [id, email.toLowerCase(), username, passwordHash]
  );
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
  await client.query('INSERT INTO users (id, discord_id, username, avatar_url) VALUES ($1, $2, $3, $4)', [
    id,
    discordId,
    username,
    avatarUrl,
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

export async function createUserFromGoogle(
  id: string,
  googleSub: string,
  username: string,
  avatarUrl: string | null,
  client: Queryable = pool
): Promise<void> {
  await client.query('INSERT INTO users (id, google_sub, username, avatar_url) VALUES ($1, $2, $3, $4)', [
    id,
    googleSub,
    username,
    avatarUrl,
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
  limit = 50,
  client: Queryable = pool
): Promise<Pick<User, 'id' | 'username' | 'balance_nova' | 'role' | 'created_at'>[]> {
  const { rows } = await client.query(
    `SELECT id, username, balance_nova, role, created_at FROM users
     WHERE username ILIKE $1 ORDER BY created_at DESC LIMIT $2`,
    [`%${query}%`, limit]
  );
  return rows;
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
