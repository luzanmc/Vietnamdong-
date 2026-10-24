export const schemaSql = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  discord_id TEXT UNIQUE,
  google_sub TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  username TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  balance_nova INTEGER NOT NULL DEFAULT 0,
  total_redeemed_nova INTEGER NOT NULL DEFAULT 0,
  referred_by TEXT REFERENCES users(id),
  creator_code_id TEXT,
  streak_days INTEGER NOT NULL DEFAULT 0,
  streak_last_date TEXT,
  registered_ip TEXT,
  locked INTEGER NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0,
  card_id TEXT UNIQUE,
  card_bg TEXT,
  card_show_wm INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS creator_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  bonus_percent INTEGER NOT NULL DEFAULT 5,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_creator_code ON users(creator_code_id);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  provider_key TEXT NOT NULL,
  name TEXT NOT NULL,
  reward_nova INTEGER NOT NULL,
  daily_limit INTEGER NOT NULL DEFAULT 1000,
  is_hot INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS task_attempts (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  short_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS coin_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ref_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount_nova INTEGER NOT NULL,
  amount_vnd INTEGER NOT NULL,
  method TEXT NOT NULL,
  destination TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL REFERENCES users(id),
  to_user_id TEXT NOT NULL REFERENCES users(id),
  amount_nova INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_user ON task_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON coin_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

CREATE TABLE IF NOT EXISTS redeem_items (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  provider_key TEXT NOT NULL,
  label TEXT NOT NULL,
  price_nova INTEGER NOT NULL,
  requires_field TEXT NOT NULL,
  telco TEXT,
  denomination INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS redeem_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  item_id TEXT NOT NULL REFERENCES redeem_items(id),
  destination TEXT NOT NULL,
  price_nova INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result_data TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_redeem_orders_status ON redeem_orders(status);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);

CREATE TABLE IF NOT EXISTS email_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);

CREATE TABLE IF NOT EXISTS daily_claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  claim_date TEXT NOT NULL,
  reward_nova INTEGER NOT NULL,
  streak_day INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, claim_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_claims_user ON daily_claims(user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  link TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id TEXT NOT NULL REFERENCES users(id),
  code TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, code)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email_unique') THEN
    CREATE UNIQUE INDEX idx_users_email_unique ON users(email) WHERE email IS NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS vietsub_licenses (
  id TEXT PRIMARY KEY,
  license_key TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  sold_to_user_id TEXT REFERENCES users(id),
  sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vietsub_licenses_status ON vietsub_licenses(status);

CREATE TABLE IF NOT EXISTS vietsub_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  payment_method TEXT NOT NULL,
  price_nova INTEGER,
  price_vnd INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  license_key_id TEXT REFERENCES vietsub_licenses(id),
  transfer_note TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vietsub_orders_status ON vietsub_orders(status);
CREATE INDEX IF NOT EXISTS idx_vietsub_orders_user ON vietsub_orders(user_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS registered_ip TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_registered_ip ON users(registered_ip);

CREATE TABLE IF NOT EXISTS security_flags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_flags_user ON security_flags(user_id);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id),
  sender_role TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id, created_at);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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

CREATE TABLE IF NOT EXISTS spin_claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  spin_date TEXT NOT NULL,
  reward_nova INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, spin_date)
);

CREATE INDEX IF NOT EXISTS idx_spin_claims_user ON spin_claims(user_id);

CREATE TABLE IF NOT EXISTS quest_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  quest_code TEXT NOT NULL,
  period_key TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  claimed INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, quest_code, period_key)
);

CREATE INDEX IF NOT EXISTS idx_quest_progress_user ON quest_progress(user_id, period_key);

CREATE TABLE IF NOT EXISTS totp_secrets (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  secret TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;
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
  hash TEXT,
  prev_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);

CREATE TABLE IF NOT EXISTS admin_totp_attempts (
  admin_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
`;

