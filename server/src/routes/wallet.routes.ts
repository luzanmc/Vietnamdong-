import { Router } from 'express';
import { nanoid } from 'nanoid';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { withdrawSchema, transferSchema } from '../validators/wallet.validators.js';
import { debit, credit, novaToVnd } from '../services/coinService.js';
import {
  getLedgerForUser,
  createWithdrawal,
  listWithdrawalsForUser,
  createTransferRecord,
} from '../repositories/walletRepository.js';
import { getUserByUsername } from '../repositories/userRepository.js';

export const walletRouter = Router();

walletRouter.get('/', requireAuth, (req, res) => {
  res.json({
    balance_nova: req.user!.balance_nova,
    balance_vnd: novaToVnd(req.user!.balance_nova, env.economy.novaToVnd),
    total_redeemed_nova: req.user!.total_redeemed_nova,
  });
});

walletRouter.get('/ledger', requireAuth, async (req, res, next) => {
  try {
    res.json(await getLedgerForUser(req.user!.id));
  } catch (err) {
    next(err);
  }
});

walletRouter.post('/withdraw', requireAuth, validateBody(withdrawSchema), async (req, res, next) => {
  try {
    const { amount_nova, method, destination } = req.body;
    if (amount_nova < env.economy.minWithdrawNova) {
      return res.status(400).json({ error: `Số Nova rút tối thiểu là ${env.economy.minWithdrawNova}` });
    }

    const id = nanoid();
    const amountVnd = novaToVnd(amount_nova, env.economy.novaToVnd);
    await debit(req.user!.id, amount_nova, 'withdraw', id);
    await createWithdrawal(id, req.user!.id, amount_nova, amountVnd, method, destination);

    res.json({ ok: true, id, status: 'pending' });
  } catch (err) {
    next(err);
  }
});

walletRouter.get('/withdrawals', requireAuth, async (req, res, next) => {
  try {
    res.json(await listWithdrawalsForUser(req.user!.id));
  } catch (err) {
    next(err);
  }
});

walletRouter.post('/transfer', requireAuth, validateBody(transferSchema), async (req, res, next) => {
  try {
    const { to_username, amount_nova } = req.body;
    const recipient = await getUserByUsername(to_username);
    if (!recipient) return res.status(404).json({ error: 'Không tìm thấy người nhận' });
    if (recipient.id === req.user!.id) return res.status(400).json({ error: 'Không thể tự chuyển cho chính mình' });

    const id = nanoid();
    await debit(req.user!.id, amount_nova, 'transfer_out', id);
    await credit(recipient.id, amount_nova, 'transfer_in', id);
    await createTransferRecord(id, req.user!.id, recipient.id, amount_nova);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
