import { nanoid } from 'nanoid';
import { debit, credit } from './coinService.js';
import { logToDiscord } from './discordService.js';
import { buyCard } from './cardswapService.js';
import {
  listActiveRedeemItems,
  getActiveRedeemItem,
  createRedeemOrder,
  markRedeemOrderFulfilled,
  markRedeemOrderRejected,
  setRedeemOrderResultData,
} from '../repositories/redeemRepository.js';
import { getUserById } from '../repositories/userRepository.js';
import { HttpError } from '../utils/httpError.js';
import type { RedeemItem } from '../types/index.js';

const FIELD_LABEL: Record<string, string> = {
  roblox_gamepass_link: 'Link Gamepass Roblox',
  game_uid: 'UID / ID trong game',
  phone_number: 'Số điện thoại nhận thẻ',
};

export function fieldLabelFor(item: Pick<RedeemItem, 'requires_field'>): string {
  return FIELD_LABEL[item.requires_field] || item.requires_field;
}

export async function getGroupedCatalog(): Promise<Record<string, (RedeemItem & { field_label: string })[]>> {
  const items = await listActiveRedeemItems();
  return items.reduce<Record<string, (RedeemItem & { field_label: string })[]>>((acc, item) => {
    (acc[item.category] ??= []).push({ ...item, field_label: fieldLabelFor(item) });
    return acc;
  }, {});
}

export type RedeemOrderOutcome =
  | { status: 'fulfilled'; id: string; cardPin?: string; cardSerial?: string }
  | { status: 'pending'; id: string }
  | { status: 'rejected'; id: string; reason: string };

export async function createOrderForUser(userId: string, itemId: string, destination: string): Promise<RedeemOrderOutcome> {
  const item = await getActiveRedeemItem(itemId);
  if (!item) throw new HttpError(404, 'Vật phẩm không tồn tại');

  const user = await getUserById(userId);
  const id = nanoid();
  await debit(userId, item.price_nova, 'redeem_order', id);
  await createRedeemOrder(id, userId, item.id, destination, item.price_nova);

  if (item.category === 'card' && item.telco && item.denomination) {
    try {
      const result = await buyCard({ telco: item.telco, denomination: item.denomination });

      if (result.status === 'success') {
        await markRedeemOrderFulfilled(id, JSON.stringify(result));
        logToDiscord(`🎁 **${user?.username}** đổi **${item.label}** (-${item.price_nova} Nova) — tự động qua Card2K ✅`);
        return { status: 'fulfilled', id, cardPin: result.cardPin, cardSerial: result.cardSerial };
      }

      if (result.status === 'pending') {
        await setRedeemOrderResultData(id, JSON.stringify(result));
        logToDiscord(`⏳ Card2K đang xử lý đơn **${item.label}** của **${user?.username}** (request_id: ${result.requestId})`);
        return { status: 'pending', id };
      }

      await credit(userId, item.price_nova, 'admin_adjust', id);
      await markRedeemOrderRejected(id, JSON.stringify(result), 'Card2K báo lỗi tự động, đã hoàn Nova');
      logToDiscord(`❌ Card2K từ chối đơn **${item.label}** của **${user?.username}** (status: ${result.status}) — đã hoàn Nova`);
      return { status: 'rejected', id, reason: `Card2K không xử lý được đơn này (${result.status}), Nova đã được hoàn lại` };
    } catch (err) {
      logToDiscord(`⚠️ Card2K tự động lỗi cho đơn **${item.label}** của **${user?.username}**, chờ admin xử lý tay: ${(err as Error).message}`);
    }
  }

  logToDiscord(`🎁 **${user?.username}** đổi **${item.label}** (-${item.price_nova} Nova) — chờ xử lý`);
  return { status: 'pending', id };
}
