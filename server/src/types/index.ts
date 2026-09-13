export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  discord_id: string | null;
  google_sub: string | null;
  email: string | null;
  password_hash: string | null;
  email_verified: number;
  username: string;
  avatar_url: string | null;
  role: UserRole;
  balance_nova: number;
  total_redeemed_nova: number;
  referred_by: string | null;
  creator_code_id: string | null;
  streak_days: number;
  streak_last_date: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  provider_key: string;
  name: string;
  reward_nova: number;
  daily_limit: number;
  is_hot: number;
  active: number;
  sort_order: number;
}

export interface TaskWithProgress extends Task {
  done_today: number;
}

export type TaskAttemptStatus = 'pending' | 'completed' | 'expired';

export interface TaskAttempt {
  id: string;
  task_id: string;
  user_id: string;
  token: string;
  status: TaskAttemptStatus;
  short_url: string | null;
  created_at: string;
  completed_at: string | null;
}

export type LedgerReason =
  | 'task_reward'
  | 'withdraw'
  | 'transfer_in'
  | 'transfer_out'
  | 'referral_bonus'
  | 'creator_bonus'
  | 'redeem_order'
  | 'daily_reward'
  | 'admin_adjust';

export interface CoinLedgerEntry {
  id: string;
  user_id: string;
  amount: number;
  reason: LedgerReason;
  ref_id: string | null;
  created_at: string;
}

export type WithdrawMethod = 'momo' | 'bank' | 'card';
export type WithdrawStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface Withdrawal {
  id: string;
  user_id: string;
  amount_nova: number;
  amount_vnd: number;
  method: WithdrawMethod;
  destination: string;
  status: WithdrawStatus;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
}

export type RedeemCategory = 'game_topup' | 'card' | 'wallet';
export type RedeemOrderStatus = 'pending' | 'fulfilled' | 'rejected';

export interface RedeemItem {
  id: string;
  category: RedeemCategory;
  provider_key: string;
  label: string;
  price_nova: number;
  requires_field: string;
  telco: string | null;
  denomination: number | null;
  active: number;
  sort_order: number;
}

export interface RedeemOrder {
  id: string;
  user_id: string;
  item_id: string;
  destination: string;
  price_nova: number;
  status: RedeemOrderStatus;
  result_data: string | null;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface CreatorCode {
  id: string;
  code: string;
  owner_user_id: string;
  bonus_percent: number;
  active: number;
  created_at: string;
}

export interface PasswordReset {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface EmailVerification {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface DailyClaim {
  id: string;
  user_id: string;
  claim_date: string;
  reward_nova: number;
  streak_day: number;
  created_at: string;
}

export type Card2kTransactionStatus = 'pending' | 'success' | 'wrong_amount' | 'failed';

export interface Card2kBuyResult {
  requestId?: string;
  transId?: string;
  status: Card2kTransactionStatus;
  cardPin?: string;
  cardSerial?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
