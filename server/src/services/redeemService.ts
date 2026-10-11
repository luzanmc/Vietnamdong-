import { nanoid } from 'nanoid';
import { debit, credit } from './coinService.js';
import { logToDiscord } from './discordService.js';
import { buyCard } from './cardswapService.js';
import { createNotification } from '../repositories/notificationRepository.js';
import {
  listActiveRedeemItems,
  getActiveRedeemItem,
  createRedeemOrder,
  markRedeemOrderFulfilled,
  markRedeemOrderRejected,
  getPendingRedeemOrderWithItem,
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

export async function createOrderForUser(userId: string, itemId: string, destination: string): Promise<{ id: string }> {
  const item = await getActiveRedeemItem(itemId);
  if (!item) throw new HttpError(404, 'Vật phẩm không tồn tại');

  const user = await getUserById(userId);
  const id = nanoid();
  await debit(userId, item.price_nova, 'redeem_order', id);
  await createRedeemOrder(id, userId, item.id, destination, item.price_nova);

  logToDiscord(`🎁 **${user?.username}** đổi **${item.label}** (-${item.price_nova} VDX) — chờ admin duyệt`);
  return { id };
}

export async function adminFulfillOrder(orderId: string, note: string): Promise<void> {
  const order = await getPendingRedeemOrderWithItem(orderId);
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hoặc đã xử lý rồi');

  if (order.category === 'card' && order.telco && order.denomination) {
    const result = await buyCard({ telco: order.telco, denomination: order.denomination, requestId: orderId });

    if (result.status === 'success') {
      await markRedeemOrderFulfilled(orderId, JSON.stringify(result));
      await createNotification(nanoid(), order.user_id, `Đơn đổi **${order.label}** đã được duyệt và xử lý thành công.`, '/redeem');
      logToDiscord(`✅ Admin duyệt đơn **${order.label}**, Card2K trả thẻ thành công`);
      return;
    }

    if (result.status === 'pending') {
      throw new HttpError(409, 'Card2K đang xử lý đơn này (chờ callback), thử duyệt lại sau');
    }

    throw new HttpError(400, `Card2K từ chối đơn này (${result.status}), dùng nút Từ chối để hoàn VDX cho user`);
  }

  await markRedeemOrderFulfilled(orderId, note);
  await createNotification(nanoid(), order.user_id, `Đơn đổi **${order.label}** đã được duyệt và xử lý.`, '/redeem');
}

export async function adminRejectOrder(orderId: string, note: string): Promise<void> {
  const order = await getPendingRedeemOrderWithItem(orderId);
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hoặc đã xử lý rồi');

  await credit(order.user_id, order.price_nova, 'admin_adjust', orderId);
  await markRedeemOrderRejected(orderId, order.result_data, note);
  await createNotification(nanoid(), order.user_id, `Đơn đổi **${order.label}** bị từ chối, đã hoàn lại VDX.`, '/redeem');
}
