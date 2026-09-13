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
} from '../types.js';

const BASE = '/api';

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
  register: (body: { username: string; email: string; password: string; captchaToken: string }) =>
    request<{ ok: true }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string; captchaToken: string }) =>
    request<{ ok: true }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  loginGoogle: (credential: string) => request('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  forgotPassword: (body: { email: string; captchaToken: string }) =>
    request<{ ok: true; message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
  resetPassword: (body: { token: string; password: string }) =>
    request<{ ok: true }>('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  tasks: () => request<Task[]>('/tasks'),
  startTask: (id: string) => request<{ shortUrl: string }>(`/tasks/${id}/start`, { method: 'POST' }),

  wallet: () => request<Wallet>('/wallet'),
  ledger: () => request<LedgerEntry[]>('/wallet/ledger'),
  withdrawals: () => request<Withdrawal[]>('/wallet/withdrawals'),
  withdraw: (body: { amount_nova: number; method: string; destination: string }) =>
    request('/wallet/withdraw', { method: 'POST', body: JSON.stringify(body) }),
  transfer: (body: { to_username: string; amount_nova: number }) =>
    request('/wallet/transfer', { method: 'POST', body: JSON.stringify(body) }),

  referral: () => request('/referral'),
  leaderboard: () => request<LeaderboardRow[]>('/leaderboard/weekly'),
  dailyTop: () => request<LeaderboardRow[]>('/leaderboard/daily'),
  recordDaily: () => request<LeaderboardRow[]>('/leaderboard/record-daily'),
  myChart: () => request<ChartPoint[]>('/leaderboard/my-chart'),

  redeemCatalog: () => request<RedeemCatalog>('/redeem/catalog'),
  redeemOrder: (body: { item_id: string; destination: string }) =>
    request<RedeemOrderResult>('/redeem/order', { method: 'POST', body: JSON.stringify(body) }),
  redeemOrders: () => request<RedeemOrder[]>('/redeem/orders'),

  dailyStatus: () => request<DailyStatus>('/daily/status'),
  dailyClaim: () => request<DailyClaimResult>('/daily/claim', { method: 'POST' }),

  myCreatorCode: () => request<CreatorCodeInfo>('/creator/mine'),
  applyCreatorCode: (code: string) => request('/creator/apply', { method: 'POST', body: JSON.stringify({ code }) }),
};

export { ApiError };
