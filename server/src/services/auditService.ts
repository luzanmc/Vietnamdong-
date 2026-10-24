import crypto from 'node:crypto';
import { pool, withTransaction } from '../db/database.js';

function canonicalStringify(val: any): string {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return '[' + val.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(val).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalStringify(val[k])).join(',') + '}';
}

function sanitizePayload(payload: any): any {
  if (payload === undefined || payload === null) return null;
  if (typeof payload !== 'object') return payload;

  if (Array.isArray(payload)) {
    return payload.map(sanitizePayload);
  }

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    const lower = key.toLowerCase();
    if (
      lower.includes('password') ||
      lower.includes('secret') ||
      lower.includes('token') ||
      lower.includes('totp') ||
      lower.includes('cookie') ||
      lower.includes('credential')
    ) {
      continue;
    }
    clean[key] = sanitizePayload(value);
  }
  return clean;
}

export const auditService = {
  record: async (
    actorId: string | null,
    action: string,
    target?: string | null,
    payload?: any
  ): Promise<{ id: number; hash: string }> => {
    const sanitized = sanitizePayload(payload);

    return withTransaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext('audit_chain_lock'))");

      const prevRes = await client.query<{ hash: string }>(
        'SELECT hash FROM audit_chain ORDER BY id DESC LIMIT 1'
      );
      const prevHash = prevRes.rows[0]?.hash || '0000000000000000000000000000000000000000000000000000000000000000';

      const canonical = canonicalStringify({
        action,
        actor_id: actorId ?? null,
        payload: sanitized,
        target: target ?? null,
      });

      const hash = crypto.createHash('sha256').update(prevHash + canonical).digest('hex');

      const res = await client.query<{ id: string; hash: string }>(
        `INSERT INTO audit_chain (actor_id, action, target, payload, prev_hash, hash, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())
         RETURNING id, hash`,
        [actorId ?? null, action, target ?? null, sanitized ? JSON.stringify(sanitized) : null, prevHash, hash]
      );

      return { id: Number(res.rows[0].id), hash: res.rows[0].hash };
    });
  },

  verifyChain: async (): Promise<{
    valid: boolean;
    corruptedId?: number;
    totalChecked: number;
    reason?: string;
  }> => {
    const { rows } = await pool.query<{
      id: string;
      actor_id: string | null;
      action: string;
      target: string | null;
      payload: any;
      prev_hash: string;
      hash: string;
    }>('SELECT id, actor_id, action, target, payload, prev_hash, hash FROM audit_chain ORDER BY id ASC');

    let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';

    for (const row of rows) {
      const id = Number(row.id);
      if (row.prev_hash !== expectedPrevHash) {
        return {
          valid: false,
          corruptedId: id,
          totalChecked: rows.length,
          reason: 'prev_hash mismatch',
        };
      }

      const payloadObj = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
      const canonical = canonicalStringify({
        action: row.action,
        actor_id: row.actor_id ?? null,
        payload: payloadObj ?? null,
        target: row.target ?? null,
      });

      const computed = crypto.createHash('sha256').update(row.prev_hash + canonical).digest('hex');
      if (computed !== row.hash) {
        return {
          valid: false,
          corruptedId: id,
          totalChecked: rows.length,
          reason: 'hash signature mismatch',
        };
      }

      expectedPrevHash = row.hash;
    }

    return { valid: true, totalChecked: rows.length };
  },
};
