import { nanoid } from 'nanoid';
import { withTransaction } from '../db/database.js';
import { HttpError } from '../utils/httpError.js';
import {
  getGiftcodeByCode,
  hasUserRedeemedGiftcode,
  recordGiftcodeRedemption,
  incrementGiftcodeUsedCount,
} from '../repositories/giftcodeRepository.js';
import { credit } from './coinService.js';
import { createNotification } from '../repositories/notificationRepository.js';
import { getUserById } from '../repositories/userRepository.js';
import { logToDiscord } from './discordService.js';

export async function redeemGiftcode(userId: string, rawCode: string): Promise<{ code: string; reward_nova: number }> {
  const code = (rawCode || '').trim().toUpperCase();
  if (!code) {
    throw new HttpError(400, 'Vui lòng nhập mã Giftcode');
  }

  const giftcode = await getGiftcodeByCode(code);
  if (!giftcode || !giftcode.active) {
    throw new HttpError(404, 'Mã Giftcode không tồn tại hoặc đã bị vô hiệu hóa');
  }

  if (giftcode.expires_at && new Date(giftcode.expires_at) < new Date()) {
    throw new HttpError(400, 'Mã Giftcode này đã hết hạn sử dụng');
  }

  if (giftcode.used_count >= giftcode.max_uses) {
    throw new HttpError(400, 'Mã Giftcode đã hết lượt sử dụng');
  }

  const alreadyClaimed = await hasUserRedeemedGiftcode(giftcode.id, userId);
  if (alreadyClaimed) {
    throw new HttpError(400, 'Bạn đã sử dụng mã Giftcode này rồi');
  }

  await withTransaction(async (tx) => {
    // Re-verify under lock / transaction
    const hasClaimedInTx = await hasUserRedeemedGiftcode(giftcode.id, userId, tx);
    if (hasClaimedInTx) {
      throw new HttpError(400, 'Bạn đã sử dụng mã Giftcode này rồi');
    }

    await incrementGiftcodeUsedCount(giftcode.id, tx);
    await recordGiftcodeRedemption(nanoid(), giftcode.id, userId, giftcode.reward_nova, tx);
    await credit(userId, giftcode.reward_nova, 'giftcode_reward', giftcode.id, tx);
  });

  const user = await getUserById(userId);
  await createNotification(
    nanoid(),
    userId,
    `Nhận thành công +${giftcode.reward_nova} VNC từ mã Giftcode [${giftcode.code}].`,
    '/wallet'
  );

  logToDiscord(`🎁 **${user?.username || userId}** nhập Giftcode **${giftcode.code}** (+${giftcode.reward_nova} VNC)`);

  return {
    code: giftcode.code,
    reward_nova: giftcode.reward_nova,
  };
}
