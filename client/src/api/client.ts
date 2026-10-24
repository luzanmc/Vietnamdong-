import type {
  Me,
  Task,
  Wallet,
  LedgerEntry,
  Withdrawal,
  RedeemCatalog,
  RedeemOrderResult,
  RedeemOrder,
  LeaderboardRow,
  ChartPoint,
  DailyStatus,
  DailyClaimResult,
  CreatorCodeInfo,
  VietsubInfo,
  VietsubOrder,
  AppNotification,
  Achievement,
  ReferralInfo,
  SpinStatus,
  Quest,
  SupportTicket,
  SupportMessage,
  GiftcodeHistoryItem,
  UserSessionItem,
  LoginHistoryEvent,
  PayoutAccountItem,
  WithdrawTierInfo,
} from '../types.js';
import { getDeviceFingerprint } from '../utils/deviceFingerprint.js';


const BASE = '/api';

export type LoginResult =
  | { ok: true }
  | { requires2fa: true; pendingToken: string }
  | { requiresEmailOtp: true; pendingToken: string; emailMasked: string; message: string };

export interface TwoFactorSetup {
  secret: string;
  otpauthUri: string;
}

export interface MaintenanceData {
  maintenance: boolean;
  message?: string;
  eta?: string | null;
}

let maintenanceHandler: ((data: MaintenanceData) => void) | null = null;

export function setMaintenanceHandler(handler: (data: MaintenanceData) => void): void {
  maintenanceHandler = handler;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

if (typeof window !== 'undefined') {
  const origFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith('/api') || url.includes('/api/')) {
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : {}));
      if (!headers.has('X-Requested-With')) {
        headers.set('X-Requested-With', 'vnd');
      }
      return origFetch(input, { ...init, headers });
    }
    return origFetch(input, init);
  };
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'vnd',
    ...((opts.headers as Record<string, string>) || {}),
  };
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...opts,
    headers: mergedHeaders,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 503 && data.maintenance && maintenanceHandler) {
      maintenanceHandler({ maintenance: true, message: data.message, eta: data.eta });
    }
    if (res.status === 401 && unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(data.error || data.message || 'Đã có lỗi xảy ra, vui lòng thử lại', res.status);
  }
  return data as T;
}

export const api = {
  me: () => request<Me>('/auth/me'),
  register: (body: { username: string; email: string; password: string; captchaToken: string; acceptedTerms: boolean }) =>
    request<{ ok: true }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string; captchaToken: string }) =>
    request<LoginResult>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  login2fa: (body: { pendingToken: string; code: string }) =>
    request<{ ok: true }>('/auth/login/2fa', { method: 'POST', body: JSON.stringify(body) }),
  twoFactorStatus: () => request<{ enabled: boolean }>('/auth/2fa/status'),
  twoFactorSetup: () => request<TwoFactorSetup>('/auth/2fa/setup', { method: 'POST' }),
  twoFactorEnable: (code: string) =>
    request<{ ok: true; recoveryCodes?: string[] }>('/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ code }) }),
  twoFactorDisable: (code: string) =>
    request<{ ok: true }>('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ code }) }),
  twoFactorRecoveryCodesCount: () =>
    request<{ remainingCount: number; totalCount: number }>('/auth/2fa/recovery-codes/count'),
  twoFactorRegenerateRecoveryCodes: (code: string) =>
    request<{ ok: true; recoveryCodes: string[] }>('/auth/2fa/recovery-codes/regenerate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  requestEmailLoginCode: (email: string, captchaToken: string) =>
    request<{ ok: true; message: string }>('/auth/email-code/request', {
      method: 'POST',
      body: JSON.stringify({ email, captchaToken }),
    }),
  verifyEmailLoginCode: (email: string, code: string) =>
    request<LoginResult>('/auth/email-code/verify', { method: 'POST', body: JSON.stringify({ email, code }) }),
  verifyLoginOtp: (pendingToken: string, code: string) =>
    request<{ ok: true }>('/auth/login/verify-otp', { method: 'POST', body: JSON.stringify({ pendingToken, code }) }),
  getSecurityAccountToken: (token: string) =>
    request<{ valid: boolean; username: string }>(`/security/account-token/${token}`),
  trustDevice: (token: string) =>
    request<{ ok: true; message: string }>('/security/trust-device', { method: 'POST', body: JSON.stringify({ token }) }),
  secureAccount: (token: string, newPassword: string) =>
    request<{ ok: true; message: string }>('/security/secure-account', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
  getUserSessions: () => request<{ sessions: UserSessionItem[] }>('/security/sessions'),
  revokeSession: (id: string) =>
    request<{ ok: true; message: string }>(`/security/sessions/${id}/revoke`, { method: 'POST' }),
  revokeOtherSessions: () =>
    request<{ ok: true; message: string }>('/security/sessions/revoke-others', { method: 'POST' }),
  getLoginHistory: () => request<{ events: LoginHistoryEvent[] }>('/security/login-history'),
  exportPersonalData: async (password?: string, totpCode?: string) => {
    const res = await fetch(`${BASE}/security/export-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'vnd',
      },
      credentials: 'include',
      body: JSON.stringify({ password, totpCode }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(data.error || data.message || 'Không thể tải dữ liệu cá nhân', res.status);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vietnamdong-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    return { ok: true };
  },
  requestDeleteAccount: (body: { password?: string; totpCode?: string; confirmUsername?: string }) =>
    request<{ ok: true; message: string }>('/security/request-delete-account', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  loginGoogle: (credential: string) => request('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  forgotPassword: (body: { email: string; captchaToken: string }) =>
    request<{ ok: true; message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
  resetPassword: (body: { token: string; password: string }) =>
    request<{ ok: true }>('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ ok: true; message: string }>('/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
  updateAvatar: (avatar_url: string | null) =>
    request<{ ok: true; avatar_url: string | null }>('/auth/avatar', {
      method: 'POST',
      body: JSON.stringify({ avatar_url }),
    }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  tasks: () => request<Task[]>('/tasks'),
  startTask: (id: string, captchaToken?: string) =>
    request<{ shortUrl: string }>(`/tasks/${id}/start`, {
      method: 'POST',
      body: JSON.stringify({ captchaToken }),
    }),

  wallet: () => request<Wallet>('/wallet'),
  ledger: () => request<LedgerEntry[]>('/wallet/ledger'),
  filteredLedger: (params: { reason?: string; from?: string; to?: string; page: number; pageSize: number }) => {
    const qs = new URLSearchParams();
    if (params.reason) qs.set('reason', params.reason);
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    qs.set('page', String(params.page));
    qs.set('pageSize', String(params.pageSize));
    return request<{ items: LedgerEntry[]; total: number }>(`/wallet/ledger/filtered?${qs}`);
  },
  withdrawals: () => request<Withdrawal[]>('/wallet/withdrawals'),
  payoutAccounts: () => request<{ accounts: PayoutAccountItem[] }>('/wallet/payout-accounts'),
  addPayoutAccount: (body: {
    type: 'bank' | 'ewallet';
    bank_name: string;
    account_name: string;
    account_number: string;
    totpCode?: string;
    otpCode?: string;
  }) =>
    request<{ ok: true; id: string; status: string; message: string }>('/wallet/payout-accounts', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  confirmPayoutAccount: (id: string, body: { token?: string; totpCode?: string; otpCode?: string }) =>
    request<{ ok: true; message: string }>(`/wallet/payout-accounts/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deletePayoutAccount: (id: string) =>
    request<{ ok: true; message: string }>(`/wallet/payout-accounts/${id}`, { method: 'DELETE' }),
  withdrawTierLimit: () => request<WithdrawTierInfo>('/wallet/tier-limit'),
  initWithdraw: (body: { amount_nova: number; payout_account_id: string }) =>
    request<{
      requiresConfirmation: boolean;
      challengeId: string;
      method: 'totp' | 'email_otp';
      emailMasked?: string;
      amountNova: number;
      amountVnd: number;
      message: string;
    }>('/wallet/withdraw/init', { method: 'POST', body: JSON.stringify(body) }),
  confirmWithdraw: (body: { challengeId: string; code: string }) =>
    request<{ ok: true; id: string; status: string; transfer_code?: string }>('/wallet/withdraw/confirm', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  withdraw: (body: { amount_nova: number; method: string; destination: string; payout_account_id?: string }) =>
    request<{ ok: true; id: string; transfer_code?: string; requiresConfirmation?: boolean; requiresInit?: boolean }>(
      '/wallet/withdraw',
      { method: 'POST', body: JSON.stringify(body) }
    ),
  transfer: (body: { to_username: string; amount_nova: number }) =>
    request('/wallet/transfer', { method: 'POST', body: JSON.stringify(body) }),

  referral: () => request<ReferralInfo>('/referral'),
  spinStatus: () => request<SpinStatus>('/spin/status'),
  spin: () => request<{ ok: true; segmentIndex: number; reward: number }>('/spin/spin', { method: 'POST' }),

  quests: () => request<Quest[]>('/quests'),
  claimQuest: (code: string) => request<{ ok: true; reward: number }>(`/quests/${code}/claim`, { method: 'POST' }),

  supportTickets: () => request<SupportTicket[]>('/support/tickets'),
  createSupportTicket: (subject: string, message: string) =>
    request<{ ok: true; id: string }>('/support/tickets', { method: 'POST', body: JSON.stringify({ subject, message }) }),
  supportTicketDetail: (id: string) => request<{ ticket: SupportTicket; messages: SupportMessage[] }>(`/support/tickets/${id}`),
  replySupportTicket: (id: string, message: string) =>
    request(`/support/tickets/${id}/messages`, { method: 'POST', body: JSON.stringify({ message }) }),

  claimReferral: (refUsername: string) => request('/referral/claim', { method: 'POST', body: JSON.stringify({ ref_username: refUsername }) }),
  leaderboard: () => request<LeaderboardRow[]>('/leaderboard/weekly'),
  dailyTop: () => request<LeaderboardRow[]>('/leaderboard/daily'),
  recordDaily: () => request<LeaderboardRow[]>('/leaderboard/record-daily'),
  monthlyTop: () => request<LeaderboardRow[]>('/leaderboard/monthly'),
  topReferrers: () => request<(LeaderboardRow & { referred_count: number })[]>('/leaderboard/referrers'),
  myChart: () => request<ChartPoint[]>('/leaderboard/my-chart'),

  redeemCatalog: () => request<RedeemCatalog>('/redeem/catalog'),
  redeemOrder: (body: { item_id: string; destination: string }) =>
    request<RedeemOrderResult>('/redeem/order', { method: 'POST', body: JSON.stringify(body) }),
  redeemOrders: () => request<RedeemOrder[]>('/redeem/orders'),

  dailyStatus: () => request<DailyStatus>('/daily/status'),
  dailyClaim: () => request<DailyClaimResult>('/daily/claim', { method: 'POST' }),

  myCreatorCode: () => request<CreatorCodeInfo>('/creator/mine'),
  applyCreatorCode: (code: string) => request('/creator/apply', { method: 'POST', body: JSON.stringify({ code }) }),

  publicSettings: () =>
    request<{
      music_url: string;
      nova_to_vnd_rate: number;
      announcement: string;
      maintenance?: boolean;
      maintenance_message?: string;
      maintenance_eta?: string | null;
    }>('/settings/public'),
  reportTask: (taskId: string, reason?: string) =>
    request<{ ok: true }>(`/tasks/${taskId}/report`, { method: 'POST', body: JSON.stringify({ reason }) }),

  vietsubInfo: () => request<VietsubInfo>('/vietsub/info'),
  vietsubBuyNova: () => request<{ ok: true; orderId: string }>('/vietsub/buy-nova', { method: 'POST' }),
  vietsubBuyVnd: (transferNote: string) =>
    request<{ ok: true; orderId: string }>('/vietsub/buy-vnd', { method: 'POST', body: JSON.stringify({ transferNote }) }),
  vietsubOrders: () => request<VietsubOrder[]>('/vietsub/orders'),

  notifications: () => request<{ items: AppNotification[]; unreadCount: number }>('/notifications'),
  markNotificationsRead: () => request('/notifications/read', { method: 'POST' }),

  achievements: () => request<Achievement[]>('/achievements'),

  redeemGiftcode: (code: string) =>
    request<{ ok: true; code: string; reward_nova: number }>('/giftcodes/redeem', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  giftcodeHistory: () => request<GiftcodeHistoryItem[]>('/giftcodes/history'),

  updateCardConfig: (config: { card_bg: string | null; card_show_wm: boolean }) =>
    request<{ ok: true; card_bg: string | null; card_show_wm: boolean }>('/auth/card-config', {
      method: 'PATCH',
      body: JSON.stringify(config),
    }),

  networkStatus: () => request<{ ip: string; isVpn: boolean }>('/security/network-status'),
};


export { ApiError };
