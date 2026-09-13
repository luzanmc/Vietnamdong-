import { env } from '../config/env.js';

export async function verifyTurnstile(token: string | undefined, remoteIp: string | undefined): Promise<boolean> {
  if (!env.turnstile.secretKey) {
    return env.nodeEnv !== 'production';
  }
  if (!token) return false;

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: env.turnstile.secretKey, response: token, remoteip: remoteIp }),
  });
  const data = await res.json();
  return Boolean(data.success);
}
