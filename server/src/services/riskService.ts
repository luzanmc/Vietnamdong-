import crypto from 'node:crypto';
import { pool } from '../db/database.js';
import type { User, PayoutAccount } from '../types/index.js';
import { checkIsVpn } from './vpnDetectionService.js';
import { hashIp, getIpSubnet24 } from '../utils/ip.js';
import { getSetting } from '../repositories/settingsRepository.js';

export interface RiskEvaluationResult {
  score: number;
  reasons: string[];
  needsReview: boolean;
  threshold: number;
}

export async function scoreWithdrawal(
  user: User,
  amountNova: number,
  payoutAccount: PayoutAccount | { created_at: string },
  ctx: { ip: string; userAgent?: string; country?: string | null }
): Promise<RiskEvaluationResult> {
  let score = 0;
  const reasons: string[] = [];

  let threshold = 50;
  let customWeights: Record<string, number> = {};

  try {
    const rawConfig = await getSetting('withdraw_risk_config');
    if (rawConfig) {
      const parsed = JSON.parse(rawConfig);
      if (typeof parsed.risk_threshold === 'number') {
        threshold = parsed.risk_threshold;
      }
      if (parsed.weights && typeof parsed.weights === 'object') {
        customWeights = parsed.weights;
      }
    }
  } catch {}

  const getWeight = (key: string, def: number): number => {
    return typeof customWeights[key] === 'number' ? customWeights[key] : def;
  };

  const accountAgeDays = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (accountAgeDays < 7) {
    const pts = getWeight('account_age_under_7d', 25);
    score += pts;
    reasons.push('Tài khoản mới tạo dưới 7 ngày');
  } else if (accountAgeDays < 30) {
    const pts = getWeight('account_age_under_30d', 10);
    score += pts;
    reasons.push('Tài khoản mới tạo dưới 30 ngày');
  }

  const vpnCheck = await checkIsVpn(ctx.ip);
  if (vpnCheck.isVpn) {
    const pts = getWeight('vpn_or_proxy', 30);
    score += pts;
    reasons.push('Phát hiện sử dụng VPN hoặc Proxy');
  }

  const ipHash = hashIp(ctx.ip);
  const ipPriorRes = await pool.query<{ c: string }>(
    'SELECT COUNT(*) as c FROM user_sessions WHERE user_id = $1 AND ip_hash = $2',
    [user.id, ipHash]
  );
  if (Number(ipPriorRes.rows[0]?.c || 0) === 0) {
    const pts = getWeight('new_ip_hash', 15);
    score += pts;
    reasons.push('Địa chỉ IP chưa từng đăng nhập trước đây');
  }

  if (ctx.country) {
    const countryRes = await pool.query<{ country: string }>(
      `SELECT DISTINCT UPPER(country) as country
       FROM user_sessions
       WHERE user_id = $1 AND country IS NOT NULL AND created_at >= now() - interval '90 days'`,
      [user.id]
    );
    const trustedCountries = countryRes.rows.map((r) => r.country);
    if (trustedCountries.length > 0 && !trustedCountries.includes(ctx.country.toUpperCase())) {
      const pts = getWeight('abnormal_country', 20);
      score += pts;
      reasons.push(`Đăng nhập từ quốc gia bất thường (${ctx.country})`);
    }
  }

  const payoutAgeDays = (Date.now() - new Date(payoutAccount.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (payoutAgeDays < 2) {
    const pts = getWeight('payout_under_48h', 15);
    score += pts;
    reasons.push('Vừa thêm tài khoản nhận tiền trong 48 giờ qua');
  } else if (payoutAgeDays < 7) {
    const pts = getWeight('payout_under_7d', 20);
    score += pts;
    reasons.push('Tài khoản nhận tiền mới liên kết dưới 7 ngày');
  }

  const rawUa = ctx.userAgent || '';
  const normalizedUa = rawUa.toLowerCase().replace(/\s+/g, ' ');
  const subnet24 = getIpSubnet24(ctx.ip);
  const deviceHash = crypto.createHash('sha256').update(`${normalizedUa}:${subnet24}`).digest('hex');

  const multiUserRes = await pool.query<{ count: string }>(
    `SELECT COUNT(DISTINCT user_id) as count
     FROM user_sessions
     WHERE (device_hash = $1 OR ip_hash = $2) AND user_id != $3`,
    [deviceHash, ipHash, user.id]
  );
  const otherUsersCount = Number(multiUserRes.rows[0]?.count || 0);
  if (otherUsersCount >= 2) {
    const pts = getWeight('multi_account_high', 25);
    score += pts;
    reasons.push(`Trùng thiết bị/mạng với ${otherUsersCount} tài khoản khác`);
  } else if (otherUsersCount === 1) {
    const pts = getWeight('multi_account_single', 10);
    score += pts;
    reasons.push('Trùng thiết bị/mạng với 1 tài khoản khác');
  }

  const recentWithdrawalsRes = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM withdrawals
     WHERE user_id = $1 AND created_at >= now() - interval '24 hours'`,
    [user.id]
  );
  const count24h = Number(recentWithdrawalsRes.rows[0]?.count || 0);
  if (count24h >= 3) {
    const pts = getWeight('withdraw_frequency_high', 20);
    score += pts;
    reasons.push(`Tần suất rút tiền cao (${count24h} lệnh trong 24 giờ)`);
  } else if (count24h === 2) {
    const pts = getWeight('withdraw_frequency_med', 10);
    score += pts;
    reasons.push('Tần suất rút tiền cao (2 lệnh trong 24 giờ)');
  }

  const ledgerRes = await pool.query<{ reason: string; total: string }>(
    `SELECT reason, COALESCE(SUM(amount), 0) as total
     FROM coin_ledger
     WHERE user_id = $1 AND amount > 0
     GROUP BY reason`,
    [user.id]
  );
  let totalEarned = 0;
  let giftcodeRefTotal = 0;
  for (const r of ledgerRes.rows) {
    const amt = Number(r.total);
    totalEarned += amt;
    if (
      r.reason === 'giftcode_reward' ||
      r.reason === 'referral_bonus' ||
      r.reason === 'creator_bonus'
    ) {
      giftcodeRefTotal += amt;
    }
  }
  if (totalEarned > 0 && giftcodeRefTotal / totalEarned > 0.7) {
    const pts = getWeight('high_giftcode_referral_ratio', 20);
    score += pts;
    const pct = Math.round((giftcodeRefTotal / totalEarned) * 100);
    reasons.push(`${pct}% số dư kiếm từ giftcode hoặc giới thiệu`);
  }

  const flagsRes = await pool.query<{ count: string }>(
    'SELECT COUNT(*) as count FROM security_flags WHERE user_id = $1',
    [user.id]
  );
  if (Number(flagsRes.rows[0]?.count || 0) > 0) {
    const pts = getWeight('has_security_flags', 25);
    score += pts;
    reasons.push('Tài khoản có cờ cảnh báo an ninh');
  }

  if (user.balance_nova > 0 && amountNova >= user.balance_nova * 0.9) {
    const pts = getWeight('withdraw_drain_balance', 15);
    score += pts;
    reasons.push('Rút trên 90% số dư VNC hiện có');
  }

  const avgRes = await pool.query<{ avg: string | null }>(
    `SELECT AVG(amount_nova) as avg
     FROM withdrawals
     WHERE user_id = $1 AND status IN ('paid', 'approved')`,
    [user.id]
  );
  const avgAmt = Number(avgRes.rows[0]?.avg || 0);
  if (avgAmt > 0 && amountNova >= avgAmt * 3 && amountNova >= 200000) {
    const pts = getWeight('withdraw_spike', 15);
    score += pts;
    reasons.push(`Số tiền rút đột biến gấp 3 lần mức trung bình (${Math.round(avgAmt).toLocaleString('vi-VN')} VNC)`);
  }

  const needsReview = score >= threshold;
  return {
    score,
    reasons,
    needsReview,
    threshold,
  };
}
