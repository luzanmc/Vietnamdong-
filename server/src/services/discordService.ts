import { nanoid } from 'nanoid';
import { env } from '../config/env.js';
import { pool } from '../db/database.js';

export interface AlertField {
  name: string;
  value: string;
  inline?: boolean;
}

export async function logToDiscord(message: string): Promise<void> {
  if (!env.discord.botToken || !env.discord.logChannelId) return;
  try {
    await fetch(`https://discord.com/api/v10/channels/${env.discord.logChannelId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${env.discord.botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message }),
    });
  } catch (err) {
    console.error('Discord log failed:', (err as Error).message);
  }
}

export async function sendAlert(
  type: string,
  title: string,
  fields: AlertField[],
  throttleKey?: string | null,
  level: 'info' | 'warning' | 'danger' = 'info'
): Promise<boolean> {
  try {
    if (throttleKey) {
      const fullKey = `${type}:${throttleKey}`;
      const now = new Date();
      const { rows } = await pool.query<{ sent_at: string }>(
        `SELECT sent_at FROM alert_throttle WHERE key = $1`,
        [fullKey]
      );
      if (rows.length > 0) {
        const lastSent = new Date(rows[0].sent_at).getTime();
        if (now.getTime() - lastSent < 10 * 60 * 1000) {
          return false;
        }
      }
      await pool.query(
        `INSERT INTO alert_throttle (key, sent_at) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET sent_at = $2`,
        [fullKey, now.toISOString()]
      );
    }

    await pool.query(
      `INSERT INTO alert_log (id, type, title, details, created_at)
       VALUES ($1, $2, $3, $4, now())`,
      [nanoid(), type, title, JSON.stringify(fields)]
    );

    const webhookUrl = env.discord.alertWebhookUrl?.trim();
    if (!webhookUrl) return false;

    const colorMap = {
      info: 3900790,
      warning: 16096779,
      danger: 15680580,
    };
    const color = colorMap[level] || colorMap.info;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title,
            color,
            fields,
            timestamp: new Date().toISOString(),
            footer: { text: env.appName },
          },
        ],
      }),
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timer);
    });

    return res.ok;
  } catch {
    return false;
  }
}
