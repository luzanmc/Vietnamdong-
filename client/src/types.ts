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
  status: 'pending';
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
  referred_count?: number;
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

export interface VietsubInfo {
  active: boolean;
  priceNova: number | null;
  priceVnd: number | null;
  description: string;
  bankInfo: string;
  availableCount: number;
  logoUrl?: string;
  apkUrl?: string;
}

export interface VietsubOrder {
  id: string;
  payment_method: 'nova' | 'vnd';
  price_nova: number | null;
  price_vnd: number | null;
  status: string;
  license_key: string | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  message: string;
  link: string | null;
  read: number;
  created_at: string;
}

export interface Achievement {
  code: string;
  icon: string;
  titleVi: string;
  titleEn: string;
  descVi: string;
  descEn: string;
  target: number;
  progress: number;
  unlocked: boolean;
}

export interface ReferralInfo {
  referral_link: string;
  referred_count: number;
  referred_users: { username: string; created_at: string }[];
  total_earned_nova: number;
}

export interface SpinSegment {
  label: string;
  reward: number;
  weight: number;
  color: string;
}

export interface SpinStatus {
  can_spin: boolean;
  segments: SpinSegment[];
}

export interface Quest {
  code: string;
  titleVi: string;
  titleEn: string;
  descVi: string;
  descEn: string;
  target: number;
  reward: number;
  progress: number;
  canClaim: boolean;
  claimed: boolean;
}

export interface SupportTicket {
  id: string;
  subject: string;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  sender_role: 'user' | 'admin';
  message: string;
  created_at: string;
}
