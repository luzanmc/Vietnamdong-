import { DoiTheLib, productionUrl, sandboxUrl, Telco } from 'doithelib';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';
import type { Card2kBuyResult } from '../types/index.js';

const TELCO_MAP: Record<string, Telco> = {
  VIETTEL: Telco.Viettel,
  MOBIFONE: Telco.Mobifone,
  VINAPHONE: Telco.Vinaphone,
  VIETNAMOBILE: Telco.Vietnamobile,
  ZING: Telco.Zing,
  GARENA: Telco.Garena,
  GATE: Telco.Gate,
  VCOIN: Telco.Vcoin,
};

function getClient(): DoiTheLib {
  if (!env.cardswap.partnerId || !env.cardswap.partnerKey) {
    throw new HttpError(501, 'Tự động gạch thẻ chưa bật, đơn sẽ chờ admin xử lý thủ công');
  }
  return new DoiTheLib({
    baseUrl: env.cardswap.sandbox ? sandboxUrl : productionUrl,
    buyCard: { partnerId: env.cardswap.partnerId, partnerKey: env.cardswap.partnerKey },
  });
}

export async function buyCard({
  telco,
  denomination,
  requestId,
}: {
  telco: string;
  denomination: number;
  requestId: string;
}): Promise<Card2kBuyResult> {
  const client = getClient();
  const serviceCode = TELCO_MAP[telco.toUpperCase()];
  if (!serviceCode) throw new HttpError(400, `Nhà mạng không được hỗ trợ: ${telco}`);

  const result = (await client.buyCard.buy({ serviceCode, value: denomination, qty: 1, requestId })) as any;
  console.log('card2k buyCard raw response:', JSON.stringify(result));

  const card = Array.isArray(result) ? result[0] : (result?.cards?.[0] ?? result);
  const cardPin = card?.code ?? card?.pin ?? card?.cardCode;
  const cardSerial = card?.serial ?? card?.cardSerial;

  return {
    requestId,
    transId: card?.transId ?? card?.trans_id,
    status: cardPin && cardSerial ? 'success' : 'pending',
    cardPin,
    cardSerial,
  };
}

export function verifyCard2kCallback(payload: { code: string; serial: string; callbackSign: string }): boolean {
  if (!env.cardswap.partnerId || !env.cardswap.partnerKey) return false;
  const client = new DoiTheLib({
    baseUrl: env.cardswap.sandbox ? sandboxUrl : productionUrl,
    buyCard: { partnerId: env.cardswap.partnerId, partnerKey: env.cardswap.partnerKey },
  });
  return client.verifyCallback(payload, 'buyCard');
}
