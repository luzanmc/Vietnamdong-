import { Pool } from 'pg';
import type { PoolClient, QueryResultRow } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface Queryable {
  query: <T extends QueryResultRow = any>(text: string, params?: any[]) => Promise<{ rows: T[] }>;
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

let readyPromise: Promise<void> | null = null;

export function ensureReady(): Promise<void> {
  if (!readyPromise) readyPromise = migrate();
  return readyPromise;
}

async function migrate(): Promise<void> {
  if (!connectionString) {
    throw new Error('DATABASE_URL (hoặc SUPABASE_DB_URL) chưa được cấu hình trên server');
  }

  const migrationPool = new Pool({
    connectionString: directConnectionString,
    max: 1,
    ssl: sslFor(directConnectionString),
  });

  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
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
