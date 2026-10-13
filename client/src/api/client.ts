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
} from '../types.js';


const BASE = '/api';

export type LoginResult = { ok: true } | { requires2fa: true; pendingToken: string };

export interface TwoFactorSetup {
  secret: string;
  otpauthUri: string;
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

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(data.error || 'Đã có lỗi xảy ra, vui lòng thử lại', res.status);
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
    request<{ ok: true }>('/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ code }) }),
  twoFactorDisable: (code: string) =>
    request<{ ok: true }>('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ code }) }),
  loginGoogle: (credential: string) => request('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  forgotPassword: (body: { email: string; captchaToken: string }) =>
    request<{ ok: true; message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
  resetPassword: (body: { token: string; password: string }) =>
    request<{ ok: true }>('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ ok: true; message: string }>('/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  tasks: () => request<Task[]>('/tasks'),
  startTask: (id: string) => request<{ shortUrl: string }>(`/tasks/${id}/start`, { method: 'POST' }),

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
  withdraw: (body: { amount_nova: number; method: string; destination: string }) =>
    request('/wallet/withdraw', { method: 'POST', body: JSON.stringify(body) }),
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

  publicSettings: () => request<{ music_url: string; nova_to_vnd_rate: number; announcement: string }>('/settings/public'),

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

  networkStatus: () => request<{ ip: string; isVpn: boolean }>('/security/network-status'),
};


export { ApiError };
