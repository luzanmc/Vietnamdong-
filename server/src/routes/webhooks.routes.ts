import { Router } from 'express';
import { nanoid } from 'nanoid';
import { credit } from '../services/coinService.js';
import { logToDiscord } from '../services/discordService.js';
import { verifyCard2kCallback } from '../services/cardswapService.js';
import { createNotification } from '../repositories/notificationRepository.js';
import { findPendingOrderByRequestOrTrans, markRedeemOrderFulfilled, markRedeemOrderRejected } from '../repositories/redeemRepository.js';

export const webhooksRouter = Router();

webhooksRouter.all('/callback', async (req, res, next) => {
  try {
    const payload = { ...req.query, ...req.body } as Record<string, string>;
    const { request_id, trans_id, status, card_pin, card_serial, code, serial, callback_sign } = payload;

    if (!code || !serial || !callback_sign) {
      console.warn('card2k webhook: thiếu code/serial/callback_sign, payload:', payload);
      return res.status(400).json({ error: 'missing signature fields' });
    }

    const validSignature = verifyCard2kCallback({ code, serial, callbackSign: callback_sign });
    if (!validSignature) {
      console.warn('card2k webhook: chữ ký không hợp lệ, payload:', payload);
      return res.status(401).json({ error: 'invalid signature' });
    }

    const order = await findPendingOrderByRequestOrTrans(request_id ?? '', trans_id ?? '');
    if (!order) {
      console.warn('card2k webhook: không tìm thấy đơn khớp với payload:', payload);
      return res.status(404).json({ error: 'no matching order' });
    }

    if (status === 'success' || status === '1') {
      await markRedeemOrderFulfilled(order.id, JSON.stringify({ requestId: request_id, transId: trans_id, status, cardPin: card_pin ?? code, cardSerial: card_serial ?? serial }));
      await createNotification(nanoid(), order.user_id, 'Đơn đổi thẻ cào của bạn đã được xử lý thành công.', '/redeem');
      logToDiscord(`✅ Card2K callback: đơn **${order.id}** đã hoàn tất`);
    } else {
      await credit(order.user_id, order.price_nova, 'admin_adjust', order.id);
      await markRedeemOrderRejected(order.id, null, 'Card2K callback báo lỗi, đã hoàn VDX');
      await createNotification(nanoid(), order.user_id, 'Đơn đổi thẻ cào thất bại, đã hoàn lại VDX.', '/redeem');
      logToDiscord(`❌ Card2K callback: đơn **${order.id}** thất bại (${status}) — đã hoàn VDX`);
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
