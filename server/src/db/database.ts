import { Pool } from 'pg';
import type { PoolClient, QueryResultRow } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nanoid } from 'nanoid';
import { encryptAccountNumber, extractLast4 } from '../utils/payoutCrypto.js';

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
          CREATE TABLE IF NOT EXISTS user_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            device_hash TEXT,
            user_agent TEXT,
            ip_hash TEXT NOT NULL,
            ip_masked TEXT NOT NULL,
            country TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            revoked_at TIMESTAMPTZ,
            trusted BOOLEAN NOT NULL DEFAULT FALSE
          );
          CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
          CREATE INDEX IF NOT EXISTS idx_user_sessions_revoked ON user_sessions(revoked_at);
          CREATE TABLE IF NOT EXISTS login_events (
            id BIGSERIAL PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            success BOOLEAN NOT NULL,
            ip_masked TEXT NOT NULL,
            user_agent TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS idx_login_events_user_created ON login_events(user_id, created_at DESC);
          CREATE TABLE IF NOT EXISTS audit_chain (
            id BIGSERIAL PRIMARY KEY,
            actor_id TEXT,
            action TEXT NOT NULL,
            target TEXT,
            payload JSONB,
            prev_hash TEXT NOT NULL,
            hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS idx_audit_chain_created_at ON audit_chain(created_at DESC);
          ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS hash TEXT;
          ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS prev_hash TEXT;
          CREATE OR REPLACE FUNCTION prevent_audit_chain_tamper()
          RETURNS TRIGGER AS $$
          BEGIN
            RAISE EXCEPTION 'audit_chain is append-only and cannot be modified or deleted';
          END;
          $$ LANGUAGE plpgsql;
          DROP TRIGGER IF EXISTS trg_prevent_audit_chain_tamper ON audit_chain;
          CREATE TRIGGER trg_prevent_audit_chain_tamper
          BEFORE UPDATE OR DELETE ON audit_chain
          FOR EACH ROW
          EXECUTE FUNCTION prevent_audit_chain_tamper();

          ALTER TABLE users ADD COLUMN IF NOT EXISTS withdraw_locked_until TIMESTAMPTZ;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS last_data_export_at TIMESTAMPTZ;

          CREATE TABLE IF NOT EXISTS account_security_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash TEXT NOT NULL UNIQUE,
            device_hash TEXT,
            session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
            used_at TIMESTAMPTZ,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS idx_account_security_tokens_hash ON account_security_tokens(token_hash);
          CREATE INDEX IF NOT EXISTS idx_account_security_tokens_user ON account_security_tokens(user_id);

          CREATE TABLE IF NOT EXISTS totp_recovery_codes (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            code_hash TEXT NOT NULL,
            used_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS idx_totp_recovery_codes_user ON totp_recovery_codes(user_id);

          CREATE TABLE IF NOT EXISTS totp_failed_attempts (
            user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            failed_attempts INTEGER NOT NULL DEFAULT 0,
            locked_until TIMESTAMPTZ,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );

          CREATE TABLE IF NOT EXISTS email_auth_codes (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            email TEXT NOT NULL,
            code_hash TEXT NOT NULL,
            purpose TEXT NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            max_attempts INTEGER NOT NULL DEFAULT 5,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS idx_email_auth_codes_lookup ON email_auth_codes(user_id, purpose, expires_at);

          CREATE TABLE IF NOT EXISTS email_code_throttle (
            id TEXT PRIMARY KEY,
            identifier_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS idx_email_code_throttle_lookup ON email_code_throttle(identifier_hash, created_at);

          CREATE TABLE IF NOT EXISTS payout_accounts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type TEXT NOT NULL CHECK (type IN ('bank', 'ewallet')),
            bank_name TEXT NOT NULL,
            account_name TEXT NOT NULL,
            account_number_enc TEXT NOT NULL,
            last4 TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('pending_email', 'waiting', 'active', 'removed')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            email_confirmed_at TIMESTAMPTZ,
            active_from TIMESTAMPTZ
          );
          CREATE INDEX IF NOT EXISTS idx_payout_accounts_user ON payout_accounts(user_id);
          CREATE INDEX IF NOT EXISTS idx_payout_accounts_status ON payout_accounts(user_id, status);

          CREATE TABLE IF NOT EXISTS payout_account_confirmations (
            id TEXT PRIMARY KEY,
            payout_account_id TEXT NOT NULL REFERENCES payout_accounts(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            used_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS idx_payout_account_confirmations_token ON payout_account_confirmations(token_hash);

          CREATE TABLE IF NOT EXISTS withdraw_challenges (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            payout_account_id TEXT NOT NULL REFERENCES payout_accounts(id) ON DELETE CASCADE,
            amount_nova NUMERIC(20, 2) NOT NULL,
            amount_vnd NUMERIC(20, 2) NOT NULL,
            method TEXT NOT NULL,
            destination TEXT NOT NULL,
            code_hash TEXT,
            requires_2fa BOOLEAN NOT NULL DEFAULT false,
            attempts INTEGER NOT NULL DEFAULT 0,
            max_attempts INTEGER NOT NULL DEFAULT 5,
            expires_at TIMESTAMPTZ NOT NULL,
            used_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS idx_withdraw_challenges_user ON withdraw_challenges(user_id);

          ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS risk_score INTEGER NOT NULL DEFAULT 0;
          ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS risk_reasons JSONB NOT NULL DEFAULT '[]'::jsonb;
          ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT false;
          ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS payout_account_id TEXT REFERENCES payout_accounts(id);

          ALTER TABLE tasks ADD COLUMN IF NOT EXISTS min_seconds INTEGER NOT NULL DEFAULT 8;

          CREATE TABLE IF NOT EXISTS device_links (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            fp_hash TEXT NOT NULL,
            ip_hash TEXT NOT NULL,
            first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
            last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
            note TEXT,
            UNIQUE(user_id, fp_hash)
          );

          CREATE INDEX IF NOT EXISTS idx_device_links_fp ON device_links(fp_hash);
          CREATE INDEX IF NOT EXISTS idx_device_links_ip ON device_links(ip_hash);
          CREATE INDEX IF NOT EXISTS idx_device_links_user ON device_links(user_id);

          CREATE TABLE IF NOT EXISTS rate_limit_counters (
            key TEXT NOT NULL,
            window_start TIMESTAMPTZ NOT NULL,
            count INTEGER NOT NULL DEFAULT 1,
            PRIMARY KEY (key, window_start)
          );

          CREATE INDEX IF NOT EXISTS idx_rate_limit_counters_key ON rate_limit_counters(key, window_start DESC);

          CREATE TABLE IF NOT EXISTS rate_limit_penalties (
            key TEXT PRIMARY KEY,
            violation_level INTEGER NOT NULL DEFAULT 0,
            locked_until TIMESTAMPTZ,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );

          CREATE INDEX IF NOT EXISTS idx_rate_limit_penalties_locked ON rate_limit_penalties(locked_until);

          CREATE TABLE IF NOT EXISTS giftcode_failures (
            id TEXT PRIMARY KEY,
            identifier TEXT UNIQUE NOT NULL,
            count INTEGER NOT NULL DEFAULT 0,
            locked_until TIMESTAMPTZ,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );

          CREATE INDEX IF NOT EXISTS idx_giftcode_failures_identifier ON giftcode_failures(identifier);

          INSERT INTO settings (key, value) VALUES
            ('withdraw_daily_limit_new', '500000'),
            ('withdraw_daily_limit_basic', '2000000'),
            ('withdraw_daily_limit_2fa', '10000000'),
            ('withdraw_otp_threshold', '500000'),
            ('withdraw_risk_config', '{"risk_threshold": 50}')
          ON CONFLICT (key) DO NOTHING;
        `);

        try {
          const { rows: legacyWithdrawals } = await pool.query<{
            user_id: string;
            method: string;
            destination: string;
            created_at: string;
          }>(
            `SELECT DISTINCT ON (user_id, destination) user_id, method, destination, created_at
             FROM withdrawals
             WHERE status IN ('paid', 'approved', 'completed')
             ORDER BY user_id, destination, created_at ASC`
          );

          for (const w of legacyWithdrawals) {
            let bankName = 'Ngân hàng';
            let accountName = 'Chủ tài khoản';
            let accountNumber = '0000';
            let pType: 'bank' | 'ewallet' = 'bank';

            if (w.destination.includes('Ngân hàng:')) {
              const parts = w.destination.split('|').map((s) => s.trim());
              for (const part of parts) {
                if (part.startsWith('Ngân hàng:')) bankName = part.replace('Ngân hàng:', '').trim();
                else if (part.startsWith('STK:')) accountNumber = part.replace('STK:', '').trim();
                else if (part.startsWith('Chủ TK:')) accountName = part.replace('Chủ TK:', '').trim();
              }
            } else if (w.destination.includes('Ví MoMo') || w.method === 'momo') {
              pType = 'ewallet';
              bankName = 'Ví MoMo';
              const parts = w.destination.split('|').map((s) => s.trim());
              for (const part of parts) {
                if (part.startsWith('SĐT:')) accountNumber = part.replace('SĐT:', '').trim();
                else if (part.startsWith('Tên:')) accountName = part.replace('Tên:', '').trim();
              }
            } else {
              accountNumber = w.destination.replace(/[^\w]/g, '').slice(-8) || '0000';
            }

            const last4 = extractLast4(accountNumber);
            const enc = encryptAccountNumber(accountNumber);

            const checkRes = await pool.query(
              'SELECT id FROM payout_accounts WHERE user_id = $1 AND bank_name = $2 AND last4 = $3 LIMIT 1',
              [w.user_id, bankName, last4]
            );

            let pId = checkRes.rows[0]?.id;
            if (!pId) {
              pId = nanoid();
              await pool.query(
                `INSERT INTO payout_accounts (id, user_id, type, bank_name, account_name, account_number_enc, last4, status, created_at, email_confirmed_at, active_from)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $8, $8)`,
                [pId, w.user_id, pType, bankName, accountName, enc, last4, w.created_at]
              );
            }

            await pool.query(
              `UPDATE withdrawals SET payout_account_id = $1
               WHERE user_id = $2 AND destination = $3 AND payout_account_id IS NULL`,
              [pId, w.user_id, w.destination]
            );
          }
        } catch (migErr) {
          console.error('Lỗi chuyển đổi tài khoản nhận tiền cũ:', migErr);
        }
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
