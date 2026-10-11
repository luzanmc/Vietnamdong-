import { pool, type Queryable } from '../db/database.js';

export interface Announcement {
  id: string;
  message: string;
  active: number;
  created_at: string;
}

export async function getActiveAnnouncement(client: Queryable = pool): Promise<Announcement | undefined> {
  const { rows } = await client.query('SELECT * FROM announcements WHERE active = 1 ORDER BY created_at DESC LIMIT 1');
  return rows[0];
}

export async function listAnnouncementsAdmin(client: Queryable = pool): Promise<Announcement[]> {
  const { rows } = await client.query('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 20');
  return rows;
}

export async function createAnnouncement(id: string, message: string, client: Queryable = pool): Promise<void> {
  await client.query('UPDATE announcements SET active = 0 WHERE active = 1');
  await client.query('INSERT INTO announcements (id, message) VALUES ($1, $2)', [id, message]);
}

export async function deactivateAnnouncement(id: string, client: Queryable = pool): Promise<void> {
  await client.query('UPDATE announcements SET active = 0 WHERE id = $1', [id]);
}
