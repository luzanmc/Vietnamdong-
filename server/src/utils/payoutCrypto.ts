import crypto from 'node:crypto';
import { env } from '../config/env.js';

function getEncryptionKey(): Buffer {
  const rawKey = env.payoutEncKey || process.env.PAYOUT_ENC_KEY || env.jwtSecret || 'vnd-payout-secret-key-salt';
  return crypto.createHash('sha256').update(rawKey).digest();
}

export function encryptAccountNumber(accountNumber: string): string {
  const cleanNumber = accountNumber.trim().replace(/\s+/g, '');
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(cleanNumber, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptAccountNumber(encryptedString: string): string {
  try {
    const parts = encryptedString.split(':');
    if (parts.length !== 3) return '';
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '';
  }
}

export function extractLast4(accountNumber: string): string {
  const cleanNumber = accountNumber.trim().replace(/\s+/g, '');
  return cleanNumber.length >= 4 ? cleanNumber.slice(-4) : cleanNumber.padStart(4, '*');
}
