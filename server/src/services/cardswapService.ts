import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';
import type { Card2kBuyResult } from '../types/index.js';

const BASE_URL = env.cardswap.apiBase || (env.nodeEnv === 'production' ? 'https://card2k.com' : 'https://sandbox.card2k.com');

export async function buyCard({ telco, denomination }: { telco: string; denomination: number }): Promise<Card2kBuyResult> {
  if (!env.cardswap.apiKey) throw new HttpError(501, 'Tự động gạch thẻ chưa bật, đơn sẽ chờ admin xử lý thủ công');

  const res = await fetch(`${BASE_URL}/api/v1/card/buy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.cardswap.apiKey}` },
    body: JSON.stringify({ telco, amount: denomination }),
  });

  if (!res.ok) throw new HttpError(502, 'Card2K báo lỗi, đơn sẽ chờ admin xử lý thủ công');

  const data = await res.json();
  return {
    requestId: data.request_id,
    transId: data.trans_id,
    status: data.status,
    cardPin: data.card_pin ?? data.pin,
    cardSerial: data.card_serial ?? data.serial,
  };
}
