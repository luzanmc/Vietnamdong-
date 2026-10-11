import { env } from '../config/env.js';

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
