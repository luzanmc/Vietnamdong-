export interface Me {
  id: string;
  username: string;
  avatar_url: string | null;
  role: 'user' | 'admin';
  balance_nova: number;
  streak_days: number;
  email: string | null;
  email_verified: boolean;
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
  done_today: number;
}

export interface Wallet {
  balance_nova: number;
  balance_vnd: number;
  total_redeemed_nova: number;
}

export interface LedgerEntry {
  amount: number;
  reason: string;
  ref_id: string | null;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  amount_nova: number;
  amount_vnd: number;
  method: 'momo' | 'bank' | 'card';
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  created_at: string;
}

export interface RedeemItem {
  id: string;
  category: 'game_topup' | 'card' | 'wallet';
  provider_key: string;
  label: string;
  price_nova: number;
  requires_field: string;
  field_label: string;
  telco: string | null;
  denomination: number | null;
}

export type RedeemCatalog = Record<string, RedeemItem[]>;

export interface RedeemOrderResult {
  ok: true;
  id: string;
  status: 'fulfilled' | 'pending';
  card_pin?: string;
  card_serial?: string;
}

export interface RedeemOrder {
  id: string;
  price_nova: number;
  status: 'pending' | 'fulfilled' | 'rejected';
  result_data: string | null;
  created_at: string;
  label: string;
  category: string;
}

export interface LeaderboardRow {
  username: string;
  avatar_url: string | null;
  earned: number;
  day?: string;
}

export interface ChartPoint {
  day: string;
  net: number;
}

export interface DailyStatus {
  can_claim: boolean;
  streak_days: number;
  next_reward_nova: number;
}

export interface DailyClaimResult {
  ok: true;
  reward_nova: number;
  streak_days: number;
}

export interface CreatorCodeInfo {
  owns_code: boolean;
  code?: string;
  bonus_percent?: number;
  used_by_count?: number;
  total_earned_nova?: number;
}

