import { pool, type Queryable } from '../db/database.js';

export interface Announcement {
  id: string;
  message: string;
  active: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export async function getActiveAnnouncement(client: Queryable = pool): Promise<Announcement | undefined> {
  const { rows } = await client.query(
    `SELECT * FROM announcements
     WHERE active = 1
       AND (starts_at IS NULL OR starts_at <= now())
       AND (ends_at IS NULL OR ends_at > now())
     ORDER BY created_at DESC
     LIMIT 1`
  );
  return rows[0];
}

export async function listAnnouncementsAdmin(client: Queryable = pool): Promise<Announcement[]> {
  const { rows } = await client.query('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 50');
  return rows;
}

export async function createAnnouncement(
  id: string,
  message: string,
  startsAt: string | null = null,
  endsAt: string | null = null,
  client: Queryable = pool
): Promise<void> {
  const normalized = message.replace(/\s+/g, ' ').trim();
  await client.query('UPDATE announcements SET active = 0 WHERE active = 1');
  await client.query(
    'INSERT INTO announcements (id, message, starts_at, ends_at) VALUES ($1, $2, $3, $4)',
    [id, normalized, startsAt, endsAt]
  );
}

export async function updateAnnouncement(
  id: string,
  message: string,
  startsAt: string | null = null,
  endsAt: string | null = null,
  client: Queryable = pool
): Promise<void> {
  const normalized = message.replace(/\s+/g, ' ').trim();
  await client.query(
    'UPDATE announcements SET message = $1, starts_at = $2, ends_at = $3 WHERE id = $4',
    [normalized, startsAt, endsAt, id]
  );
}

export async function deactivateAnnouncement(id: string, client: Queryable = pool): Promise<void> {
  await client.query('UPDATE announcements SET active = 0 WHERE id = $1', [id]);
}
