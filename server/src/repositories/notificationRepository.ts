import { pool, type Queryable } from '../db/database.js';

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  link: string | null;
  read: number;
  created_at: string;
}

export async function createNotification(
  id: string,
  userId: string,
  message: string,
  link: string | null = null,
  client: Queryable = pool
): Promise<void> {
  await client.query('INSERT INTO notifications (id, user_id, message, link) VALUES ($1, $2, $3, $4)', [
    id,
    userId,
    message,
    link,
  ]);
}

export async function listNotificationsForUser(userId: string, limit = 20, client: Queryable = pool): Promise<Notification[]> {
  const { rows } = await client.query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
  return rows;
}

export async function countUnreadNotifications(userId: string, client: Queryable = pool): Promise<number> {
  const { rows } = await client.query('SELECT COUNT(*) AS c FROM notifications WHERE user_id = $1 AND read = 0', [userId]);
  return Number(rows[0].c);
}

export async function markAllNotificationsRead(userId: string, client: Queryable = pool): Promise<void> {
  await client.query('UPDATE notifications SET read = 1 WHERE user_id = $1 AND read = 0', [userId]);
}
