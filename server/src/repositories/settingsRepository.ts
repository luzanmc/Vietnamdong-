import { pool, type Queryable } from '../db/database.js';

export async function getSetting(key: string, client: Queryable = pool): Promise<string | null> {
  const { rows } = await client.query('SELECT value FROM settings WHERE key = $1', [key]);
  return rows[0]?.value ?? null;
}

export async function getSettings(keys: string[], client: Queryable = pool): Promise<Record<string, string | null>> {
  const { rows } = await client.query('SELECT key, value FROM settings WHERE key = ANY($1)', [keys]);
  const map: Record<string, string | null> = {};
  for (const key of keys) map[key] = null;
  for (const row of rows) map[row.key] = row.value;
  return map;
}

export async function setSetting(key: string, value: string, client: Queryable = pool): Promise<void> {
  await client.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2`,
    [key, value]
  );
}
