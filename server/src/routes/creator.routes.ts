import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { applyCreatorCodeSchema } from '../validators/creator.validators.js';
import { setCreatorCode } from '../repositories/userRepository.js';
import {
  getCreatorCodeByOwner,
  getActiveCreatorCodeByCode,
  countUsersUsingCode,
  sumCreatorBonusEarned,
} from '../repositories/creatorRepository.js';

export const creatorRouter = Router();

creatorRouter.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const code = await getCreatorCodeByOwner(req.user!.id);
    if (!code) return res.json({ owns_code: false });

    res.json({
      owns_code: true,
      code: code.code,
      bonus_percent: code.bonus_percent,
      used_by_count: await countUsersUsingCode(code.id),
      total_earned_nova: await sumCreatorBonusEarned(req.user!.id),
    });
  } catch (err) {
    next(err);
  }
});

creatorRouter.post('/apply', requireAuth, validateBody(applyCreatorCodeSchema), async (req, res, next) => {
  try {
    if (req.user!.creator_code_id) return res.status(400).json({ error: 'Tài khoản đã áp dụng creator code trước đó' });

    const creatorCode = await getActiveCreatorCodeByCode(req.body.code);
    if (!creatorCode) return res.status(404).json({ error: 'Creator code không hợp lệ' });
    if (creatorCode.owner_user_id === req.user!.id) return res.status(400).json({ error: 'Không thể tự áp dụng code của chính mình' });

    await setCreatorCode(req.user!.id, creatorCode.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
