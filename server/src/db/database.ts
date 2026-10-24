import { Pool } from 'pg';
import type { PoolClient, QueryResultRow } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface Queryable {
  query: <T extends QueryResultRow = any>(text: string, params?: any[]) => Promise<{ rows: T[]; rowCount?: number | null }>;
}

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const directConnectionString = process.env.DIRECT_URL || connectionString;

function sslFor(cs: string | undefined) {
  return cs && !cs.includes('sslmode=disable') ? { rejectUnauthorized: false } : false;
}

export const pool: Pool = new Pool({
  connectionString,
  max: Number(process.env.PG_POOL_MAX || 5),
  ssl: sslFor(connectionString),
});

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

import { schemaSql } from './schemaSql.js';

let readyPromise: Promise<void> | null = null;

export function ensureReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = migrate().catch((err) => {
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
}

async function migrate(): Promise<void> {
  if (!connectionString) {
    throw new Error('DATABASE_URL (hoặc SUPABASE_DB_URL) chưa được cấu hình trên server');
  }

  // Fast check: if users table already exists, ensure auxiliary tables and return
  try {
    const check = await pool.query('SELECT 1 FROM users LIMIT 1');
    if (check) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS giftcodes (
          id TEXT PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          reward_nova INTEGER NOT NULL,
          max_uses INTEGER NOT NULL DEFAULT 1,
          used_count INTEGER NOT NULL DEFAULT 0,
          expires_at TIMESTAMPTZ,
          active INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_giftcodes_code ON giftcodes(code);
        CREATE TABLE IF NOT EXISTS giftcode_redemptions (
          id TEXT PRIMARY KEY,
          giftcode_id TEXT NOT NULL REFERENCES giftcodes(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          reward_nova INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE(giftcode_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS idx_giftcode_redemptions_user ON giftcode_redemptions(user_id);
      `);

      // Safely ensure card columns exist on users table independently
      try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS card_id TEXT');
        await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_card_id ON users(card_id)');
      } catch (e) {
        console.error('Failed to ensure card_id:', e);
      }
      try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS card_bg TEXT');
      } catch (e) {
        console.error('Failed to ensure card_bg:', e);
      }
      try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS card_show_wm INTEGER DEFAULT 1');
      } catch (e) {
        console.error('Failed to ensure card_show_wm:', e);
      }
      try {
        await pool.query(`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMPTZ;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_frame TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
          CREATE TABLE IF NOT EXISTS admin_audit_log (
            id TEXT PRIMARY KEY,
            admin_id TEXT NOT NULL REFERENCES users(id),
            action TEXT NOT NULL,
            target TEXT,
            payload TEXT,
            ip TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
          CREATE TABLE IF NOT EXISTS admin_totp_attempts (
            admin_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            failed_attempts INTEGER NOT NULL DEFAULT 0,
            locked_until TIMESTAMPTZ,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          ALTER TABLE announcements ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
          ALTER TABLE announcements ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
          ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS admin_id TEXT REFERENCES users(id);
          CREATE TABLE IF NOT EXISTS scheduled_events (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'xp_vnc',
            multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
            starts_at TIMESTAMPTZ,
            ends_at TIMESTAMPTZ,
            enabled INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS idx_scheduled_events_active ON scheduled_events(enabled, starts_at, ends_at);
          CREATE TABLE IF NOT EXISTS alert_throttle (
            key TEXT PRIMARY KEY,
            sent_at TIMESTAMPTZ NOT NULL
          );
          CREATE TABLE IF NOT EXISTS alert_log (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            details JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS idx_alert_log_created_at ON alert_log(created_at DESC);
          CREATE TABLE IF NOT EXISTS task_reports (
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            reason TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS idx_task_reports_task_created ON task_reports(task_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_task_reports_user_task ON task_reports(user_id, task_id);
        `);
      } catch (e) {
        console.error('Failed to ensure admin tables and columns:', e);
      }

      return;
    }
  } catch {
    // Table does not exist yet or first run, proceed with migration below
  }

  const migrationPool = new Pool({
    connectionString: directConnectionString,
    max: 1,
    ssl: sslFor(directConnectionString),
  });

  try {
    let schema = schemaSql;
    if (!schema) {
      try {
        schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
      } catch {
        // fallback to embedded
      }
    }
    await migrationPool.query(schema);

    const seedTaskCount = await migrationPool.query('SELECT COUNT(*) AS c FROM tasks');
    if (Number(seedTaskCount.rows[0].c) === 0) {
      const seed: [string, string, number, number, number, number][] = [
        ['yeumoney', 'Uptolink Social', 3, 1000, 0, 1],
        ['yeumoney', 'Uptolink Step 2', 3, 1000, 0, 2],
        ['yeumoney', 'Uptolink Step 3', 5, 1000, 0, 3],
        ['yeumoney', 'Uptolink Step 4', 5, 1000, 0, 4],
        ['link4m', 'Link4m', 2, 2, 0, 5],
        ['traffic68', 'Traffic68', 2, 4, 0, 6],
        ['phienchoso', 'TrafficVN', 2, 3, 1, 7],
        ['nhapma', 'Nhapma', 2, 4, 0, 8],
      ];
      for (let i = 0; i < seed.length; i++) {
        const [provider, name, reward, limit, hot, order] = seed[i];
        await migrationPool.query(
          `INSERT INTO tasks (id, provider_key, name, reward_nova, daily_limit, is_hot, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
          [`task_${i}`, provider, name, reward, limit, hot, order]
        );
      }
    }

    const seedRedeemCount = await migrationPool.query('SELECT COUNT(*) AS c FROM redeem_items');
    if (Number(seedRedeemCount.rows[0].c) === 0) {
      const items: [string, string, string, number, string, string | null, number | null][] = [
        ['game_topup', 'robux', '800 Robux (qua Gamepass)', 400, 'roblox_gamepass_link', null, null],
        ['game_topup', 'robux_vng', '1000 Robux VNG', 480, 'game_uid', null, null],
        ['game_topup', 'lienquan', '100 Quân Huy Liên Quân', 60, 'game_uid', null, null],
        ['game_topup', 'freefire', '100 Kim Cương Free Fire', 65, 'game_uid', null, null],
        ['game_topup', 'valorant', '475 VP Valorant', 300, 'game_uid', null, null],
        ['game_topup', 'pubg', '600 UC PUBG Mobile', 350, 'game_uid', null, null],
        ['game_topup', 'fcmobile', '100 FC Points (FC Mobile VN)', 70, 'game_uid', null, null],
        ['wallet', 'steam', '50.000đ Ví Steam', 300, 'game_uid', null, null],
        ['card', 'scratch_card', 'Thẻ cào Viettel 20.000đ', 120, 'phone_number', 'VIETTEL', 20000],
        ['card', 'scratch_card', 'Thẻ cào Mobifone 20.000đ', 120, 'phone_number', 'MOBIFONE', 20000],
      ];
      for (let i = 0; i < items.length; i++) {
        const [category, provider_key, label, price, field, telco, denomination] = items[i];
        await migrationPool.query(
          `INSERT INTO redeem_items (id, category, provider_key, label, price_nova, requires_field, telco, denomination, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
          [`redeem_seed_${i}`, category, provider_key, label, price, field, telco, denomination, i]
        );
      }
    }
  } finally {
    await migrationPool.end();
  }
}
