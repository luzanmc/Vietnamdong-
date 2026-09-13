import { Router } from 'express';
import { credit } from '../services/coinService.js';
import { logToDiscord } from '../services/discordService.js';
import { findPendingOrderByRequestOrTrans, markRedeemOrderFulfilled, markRedeemOrderRejected } from '../repositories/redeemRepository.js';

export const webhooksRouter = Router();

webhooksRouter.post('/callback', async (req, res, next) => {
  try {
    const { request_id, trans_id, status, card_pin, card_serial } = req.body;

    const order = await findPendingOrderByRequestOrTrans(request_id ?? '', trans_id ?? '');
    if (!order) {
      console.warn('card2k webhook: no matching pending order for payload:', req.body);
      return res.status(404).json({ error: 'no matching order' });
    }

    if (status === 'success') {
      await markRedeemOrderFulfilled(order.id, JSON.stringify({ requestId: request_id, transId: trans_id, status, cardPin: card_pin, cardSerial: card_serial }));
      logToDiscord(`✅ Card2K callback: đơn **${order.id}** đã hoàn tất`);
    } else {
      await credit(order.user_id, order.price_nova, 'admin_adjust', order.id);
      await markRedeemOrderRejected(order.id, null, 'Card2K callback báo lỗi, đã hoàn Nova');
      logToDiscord(`❌ Card2K callback: đơn **${order.id}** thất bại (${status}) — đã hoàn Nova`);
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
