import { Router } from 'express';
import { nanoid } from 'nanoid';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createCreatorCodeSchema } from '../validators/creator.validators.js';
import { credit } from '../services/coinService.js';
import {
  listAllWithdrawalsAdmin,
  getPendingWithdrawal,
  markWithdrawalPaid,
  markWithdrawalRejected,
  countPendingWithdrawals,
} from '../repositories/walletRepository.js';
import {
  listAllRedeemOrdersAdmin,
  getPendingRedeemOrder,
  markRedeemOrderFulfilled,
  markRedeemOrderRejected,
} from '../repositories/redeemRepository.js';
import { listAllTasksAdmin, updateTaskAdmin, sumTaskRewardOut } from '../repositories/taskRepository.js';
import { searchUsers, getUserByUsername, adjustUserBalanceRaw, countAllUsers } from '../repositories/userRepository.js';
import { createCreatorCode, updateCreatorCodeAdmin, listCreatorCodesAdmin } from '../repositories/creatorRepository.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/stats', async (req, res, next) => {
  try {
    res.json({
      users: await countAllUsers(),
      totalNovaOut: await sumTaskRewardOut(),
      pendingWithdrawals: await countPendingWithdrawals(),
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/withdrawals', async (req, res, next) => {
  try {
    res.json(await listAllWithdrawalsAdmin());
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/withdrawals/:id/approve', async (req, res, next) => {
  try {
    await markWithdrawalPaid(req.params.id, req.body.note || null);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/withdrawals/:id/reject', async (req, res, next) => {
  try {
    const w = await getPendingWithdrawal(req.params.id);
    if (!w) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
    await credit(w.user_id, w.amount_nova, 'admin_adjust', w.id);
    await markWithdrawalRejected(req.params.id, req.body.note || 'Từ chối bởi admin');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/redeem-orders', async (req, res, next) => {
  try {
    res.json(await listAllRedeemOrdersAdmin());
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/redeem-orders/:id/fulfill', async (req, res, next) => {
  try {
    await markRedeemOrderFulfilled(req.params.id, req.body.note || '');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/redeem-orders/:id/reject', async (req, res, next) => {
  try {
    const o = await getPendingRedeemOrder(req.params.id);
    if (!o) return res.status(404).json({ error: 'Không tìm thấy đơn' });

    await credit(o.user_id, o.price_nova, 'admin_adjust', req.params.id);
    await markRedeemOrderRejected(req.params.id, o.result_data, req.body.note || 'Từ chối bởi admin');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/tasks', async (req, res, next) => {
  try {
    res.json(await listAllTasksAdmin());
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/tasks/:id', async (req, res, next) => {
  try {
    await updateTaskAdmin(req.params.id, req.body);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/creator-codes', async (req, res, next) => {
  try {
    res.json(await listCreatorCodesAdmin());
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/creator-codes', validateBody(createCreatorCodeSchema), async (req, res, next) => {
  try {
    const { code, owner_username, bonus_percent } = req.body;
    const owner = await getUserByUsername(owner_username);
    if (!owner) return res.status(404).json({ error: 'Không tìm thấy user để gán code' });

    await createCreatorCode(nanoid(), code, owner.id, bonus_percent || 5);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/creator-codes/:id', async (req, res, next) => {
  try {
    await updateCreatorCodeAdmin(req.params.id, req.body);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/users', async (req, res, next) => {
  try {
    res.json(await searchUsers(String(req.query.search || '')));
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/users/:id/adjust', async (req, res, next) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount) return res.status(400).json({ error: 'Số Nova không hợp lệ' });
    if (amount > 0) await credit(req.params.id, amount, 'admin_adjust', req.body.note || null);
    else await adjustUserBalanceRaw(req.params.id, amount);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
