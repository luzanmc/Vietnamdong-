import { nanoid } from 'nanoid';
import { env } from '../config/env.js';
import { pool } from '../db/database.js';

export interface AlertField {
  name: string;
  value: string;
  inline?: boolean;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***';
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***';
  const visible = local.length > 0 ? local[0] : '*';
  return `${visible}***@${domain}`;
}

export function maskIp(ip: string): string {
  if (!ip) return '*.*.*.*';
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`;
    }
  }
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts.slice(0, 2).join(':')}:*:*`;
  }
  return '*.*.*.*';
}

export function maskAccount(account: string): string {
  if (!account) return '****';
  const clean = account.trim();
  if (clean.length <= 4) return clean;
  return `***${clean.slice(-4)}`;
}

export function sanitizeFieldText(text: string): string {
  if (!text) return '';
  return text.replace(/(ey[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,})/g, '[TOKEN_REDACTED]');
}

export async function logToDiscord(message: string): Promise<void> {
  if (!env.discord.botToken || !env.discord.logChannelId) return;
  try {
    const sanitized = sanitizeFieldText(message);
    await fetch(`https://discord.com/api/v10/channels/${env.discord.logChannelId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${env.discord.botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: sanitized }),
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

    const sanitizedFields = fields.map((f) => ({
      name: f.name,
      value: sanitizeFieldText(f.value),
      inline: f.inline,
    }));

    await pool.query(
      `INSERT INTO alert_log (id, type, title, details, created_at)
       VALUES ($1, $2, $3, $4, now())`,
      [nanoid(), type, title, JSON.stringify(sanitizedFields)]
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
            fields: sanitizedFields,
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

export async function sendTestAlert(adminUsername: string): Promise<boolean> {
  return sendAlert(
    'test_alert',
    'Kiểm tra kết nối Webhook Cảnh báo Discord',
    [
      { name: 'Người thực hiện', value: adminUsername, inline: true },
      { name: 'Thời gian', value: new Date().toLocaleString('vi-VN'), inline: true },
      { name: 'Trạng thái', value: 'Hoạt động bình thường', inline: false },
    ],
    null,
    'info'
  );
}
