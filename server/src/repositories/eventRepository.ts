import { pool, type Queryable } from '../db/database.js';

export interface ScheduledEvent {
  id: string;
  title: string;
  message: string;
  type: string;
  multiplier: number;
  starts_at: string | null;
  ends_at: string | null;
  enabled: number;
  created_at: string;
}

export async function getActiveMultiplierEvent(client: Queryable = pool): Promise<ScheduledEvent | undefined> {
  const { rows } = await client.query(
    `SELECT id, title, message, type, multiplier::float AS multiplier, starts_at, ends_at, enabled, created_at
     FROM scheduled_events
     WHERE enabled = 1
       AND (starts_at IS NULL OR starts_at <= now())
       AND (ends_at IS NULL OR ends_at > now())
     ORDER BY multiplier DESC
     LIMIT 1`
  );
  return rows[0];
}

export async function listEventsAdmin(client: Queryable = pool): Promise<ScheduledEvent[]> {
  const { rows } = await client.query(
    `SELECT id, title, message, type, multiplier::float AS multiplier, starts_at, ends_at, enabled, created_at
     FROM scheduled_events
     ORDER BY created_at DESC
     LIMIT 50`
  );
  return rows;
}

export async function createEvent(
  id: string,
  title: string,
  message: string,
  type: string,
  multiplier: number,
  startsAt: string | null = null,
  endsAt: string | null = null,
  client: Queryable = pool
): Promise<void> {
  const clampedMultiplier = Math.min(3, Math.max(1, multiplier));
  await client.query(
    `INSERT INTO scheduled_events (id, title, message, type, multiplier, starts_at, ends_at, enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 1)`,
    [id, title.trim(), message.trim(), type, clampedMultiplier, startsAt, endsAt]
  );
}

export async function updateEvent(
  id: string,
  title: string,
  message: string,
  type: string,
  multiplier: number,
  startsAt: string | null = null,
  endsAt: string | null = null,
  client: Queryable = pool
): Promise<void> {
  const clampedMultiplier = Math.min(3, Math.max(1, multiplier));
  await client.query(
    `UPDATE scheduled_events
     SET title = $1, message = $2, type = $3, multiplier = $4, starts_at = $5, ends_at = $6
     WHERE id = $7`,
    [title.trim(), message.trim(), type, clampedMultiplier, startsAt, endsAt, id]
  );
}

export async function toggleEvent(id: string, client: Queryable = pool): Promise<void> {
  await client.query(
    `UPDATE scheduled_events SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END WHERE id = $1`,
    [id]
  );
}

export async function deleteEvent(id: string, client: Queryable = pool): Promise<void> {
  await client.query('DELETE FROM scheduled_events WHERE id = $1', [id]);
}
