import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

interface ProviderAdapter {
  buildUrl: (dest: string) => string;
  isSuccess: (data: any) => boolean;
  getShortUrl: (data: any) => string;
}

const PROVIDERS: Record<string, ProviderAdapter> = {
  yeumoney: {
    buildUrl: (dest) =>
      `https://yeumoney.com/QL_api.php?${new URLSearchParams({
        token: env.shortlinkTokens.yeumoney ?? '',
        format: 'json',
        url: dest,
      })}`,
    isSuccess: (d) => d.status === 'success',
    getShortUrl: (d) => d.shortenedUrl ?? d.shortlink ?? d.url,
  },
  link4m: {
    buildUrl: (dest) => `https://link4m.com/api-shorten/${env.shortlinkTokens.link4m}?${new URLSearchParams({ url: dest })}`,
    isSuccess: (d) => d.status === 200 || d.status === 'success',
    getShortUrl: (d) => d.shortenedUrl ?? d.url,
  },
  nhapma: {
    buildUrl: (dest) => `https://nhapma.com/api?${new URLSearchParams({ api: env.shortlinkTokens.nhapma ?? '', url: dest })}`,
    isSuccess: (d) => d.status === 'success' || d.code === 0,
    getShortUrl: (d) => d.shortenedUrl ?? d.data?.url,
  },
  taplayma: {
    buildUrl: (dest) => `https://taplayma.com/api?${new URLSearchParams({ api: env.shortlinkTokens.taplayma ?? '', url: dest })}`,
    isSuccess: (d) => d.status === 'success',
    getShortUrl: (d) => d.shortenedUrl,
  },
  linktop: {
    buildUrl: (dest) => `https://linktop.one/api?${new URLSearchParams({ token: env.shortlinkTokens.linktop ?? '', url: dest })}`,
    isSuccess: (d) => d.status === 'success',
    getShortUrl: (d) => d.shortenedUrl,
  },
  bbmkts: {
    buildUrl: (dest) => `https://bbmkts.com/api?${new URLSearchParams({ api: env.shortlinkTokens.bbmkts ?? '', url: dest })}`,
    isSuccess: (d) => d.status === 'success',
    getShortUrl: (d) => d.shortenedUrl,
  },
  traffic68: {
    buildUrl: (dest) => `https://traffic68.com/api?${new URLSearchParams({ token: env.shortlinkTokens.traffic68 ?? '', url: dest })}`,
    isSuccess: (d) => d.status === 'success',
    getShortUrl: (d) => d.shortenedUrl,
  },
  phienchoso: {
    buildUrl: (dest) => `https://phienchoso.com/api?${new URLSearchParams({ api: env.shortlinkTokens.phienchoso ?? '', url: dest })}`,
    isSuccess: (d) => d.status === 'success',
    getShortUrl: (d) => d.shortenedUrl,
  },
};

export async function createLink({ providerKey, destinationUrl }: { providerKey: string; destinationUrl: string }): Promise<{ shortUrl: string }> {
  const provider = PROVIDERS[providerKey];
  if (!provider) throw new HttpError(500, 'Nhiệm vụ đang cấu hình sai nhà cung cấp link');

  const res = await fetch(provider.buildUrl(destinationUrl));
  if (!res.ok) {
    throw new HttpError(502, 'Không tạo được liên kết rút gọn, thử lại sau');
  }

  const data = await res.json();
  if (!provider.isSuccess(data)) {
    throw new HttpError(502, 'Nhà cung cấp rút gọn link báo lỗi, thử lại sau');
  }

  return { shortUrl: provider.getShortUrl(data) };
}

export function verifyCallbackSignature(query: Record<string, unknown>): boolean {
  return Boolean(query.attemptToken);
}
