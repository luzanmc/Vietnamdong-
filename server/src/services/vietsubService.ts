import { nanoid } from 'nanoid';
import { withTransaction } from '../db/database.js';
import { debit } from './coinService.js';
import { sendLicenseKeyEmail } from './mailService.js';
import { logToDiscord } from './discordService.js';
import { getSettings, setSetting } from '../repositories/settingsRepository.js';
import {
  countAvailableLicenses,
  claimAvailableLicense,
  createVietsubOrder,
  markVietsubOrderFulfilled,
  markVietsubOrderRejected,
  getPendingVietsubOrder,
} from '../repositories/vietsubRepository.js';
import { getUserById } from '../repositories/userRepository.js';
import { createNotification } from '../repositories/notificationRepository.js';
import { HttpError } from '../utils/httpError.js';

const SETTING_KEYS = [
  'vietsub_price_nova',
  'vietsub_price_vnd',
  'vietsub_description',
  'vietsub_active',
  'vietsub_bank_info',
  'vietsub_apk_url',
  'vietsub_logo_url',
];

export async function getVietsubPublicInfo() {
  const settings = await getSettings(SETTING_KEYS);
  return {
    active: settings.vietsub_active === '1',
    priceNova: settings.vietsub_price_nova ? Number(settings.vietsub_price_nova) : null,
    priceVnd: settings.vietsub_price_vnd ? Number(settings.vietsub_price_vnd) : null,
    description: settings.vietsub_description ?? '',
    bankInfo: settings.vietsub_bank_info ?? '',
    apkUrl: settings.vietsub_apk_url ?? '',
    logoUrl: settings.vietsub_logo_url ?? '',
    availableCount: await countAvailableLicenses(),
  };
}

export async function updateVietsubSettings(patch: {
  priceNova?: number;
  priceVnd?: number;
  description?: string;
  active?: boolean;
  bankInfo?: string;
  apkUrl?: string;
  logoUrl?: string;
}): Promise<void> {
  if (patch.priceNova !== undefined) await setSetting('vietsub_price_nova', String(patch.priceNova));
  if (patch.priceVnd !== undefined) await setSetting('vietsub_price_vnd', String(patch.priceVnd));
  if (patch.description !== undefined) await setSetting('vietsub_description', patch.description);
  if (patch.active !== undefined) await setSetting('vietsub_active', patch.active ? '1' : '0');
  if (patch.bankInfo !== undefined) await setSetting('vietsub_bank_info', patch.bankInfo);
  if (patch.apkUrl !== undefined) await setSetting('vietsub_apk_url', patch.apkUrl);
  if (patch.logoUrl !== undefined) await setSetting('vietsub_logo_url', patch.logoUrl);
}

export async function requestNovaPurchase(userId: string): Promise<{ orderId: string }> {
  const info = await getVietsubPublicInfo();
  if (!info.active || !info.priceNova) throw new HttpError(400, 'Vietsub Studio hiện không mở bán bằng VNC');

  const user = await getUserById(userId);
  if (!user) throw new HttpError(404, 'Không tìm thấy tài khoản');
  if (user.balance_nova < info.priceNova) throw new HttpError(400, 'Số dư VNC không đủ');

  const orderId = nanoid();
  await createVietsubOrder(orderId, userId, 'nova', info.priceNova, null, null);

  logToDiscord(`🔑 **${user.username}** yêu cầu mua Vietsub Studio bằng ${info.priceNova} VNC — chờ admin duyệt`);

  return { orderId };
}

export async function createVndOrder(userId: string, transferNote: string): Promise<{ orderId: string }> {
  const info = await getVietsubPublicInfo();
  if (!info.active || !info.priceVnd) throw new HttpError(400, 'Vietsub Studio hiện không mở bán bằng VND');

  const orderId = nanoid();
  await createVietsubOrder(orderId, userId, 'vnd', null, info.priceVnd, transferNote);

  const user = await getUserById(userId);
  logToDiscord(`💳 **${user?.username}** đặt mua Vietsub Studio bằng chuyển khoản (${info.priceVnd.toLocaleString('vi-VN')}đ) — chờ admin duyệt`);

  return { orderId };
}

export async function adminApproveVietsubOrder(orderId: string): Promise<void> {
  const order = await getPendingVietsubOrder(orderId);
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hoặc đã xử lý rồi');

  const info = await getVietsubPublicInfo();
  const user = await getUserById(order.user_id);

  const licenseKey = await withTransaction(async (client) => {
    if (order.payment_method === 'nova' && order.price_nova) {
      await debit(order.user_id, order.price_nova, 'vietsub_purchase', orderId, client);
    }
    const license = await claimAvailableLicense(order.user_id, client);
    await markVietsubOrderFulfilled(orderId, license.id, client);
    return license.license_key;
  });

  if (user?.email) sendLicenseKeyEmail(user.email, licenseKey, info.apkUrl).catch(() => {});
  await createNotification(nanoid(), order.user_id, 'Đơn mua Vietsub Studio đã được duyệt, license key đã gửi vào email của bạn.', '/vietsub-studio');
  logToDiscord(`✅ Admin duyệt đơn Vietsub Studio **${orderId}** của **${user?.username}**`);
}

export async function adminRejectVietsubOrder(orderId: string, note: string): Promise<void> {
  const order = await getPendingVietsubOrder(orderId);
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hoặc đã xử lý rồi');
  await markVietsubOrderRejected(orderId, note);
  await createNotification(nanoid(), order.user_id, `Đơn mua Vietsub Studio bị từ chối: ${note}`, '/vietsub-studio');
  logToDiscord(`❌ Admin từ chối đơn Vietsub Studio **${orderId}** (${note})`);
}
