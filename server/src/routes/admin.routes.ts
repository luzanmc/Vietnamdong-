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
import { listAllRedeemOrdersAdmin } from '../repositories/redeemRepository.js';
import { adminFulfillOrder, adminRejectOrder } from '../services/redeemService.js';
import { listAllTasksAdmin, updateTaskAdmin, sumTaskRewardOut } from '../repositories/taskRepository.js';
import { searchUsers, getUserByUsername, adjustUserBalanceRaw, countAllUsers, lockUser, unlockUser, getUserById, addXpToUser, setUserXp } from '../repositories/userRepository.js';
import { calculateLevel } from '../services/levelService.js';
import { logToDiscord } from '../services/discordService.js';
import { createCreatorCode, updateCreatorCodeAdmin, listCreatorCodesAdmin } from '../repositories/creatorRepository.js';
import { getSetting, setSetting } from '../repositories/settingsRepository.js';
import { addLicenseKeys, listLicensesAdmin, listAllVietsubOrdersAdmin } from '../repositories/vietsubRepository.js';
import { getVietsubPublicInfo, updateVietsubSettings, adminApproveVietsubOrder, adminRejectVietsubOrder } from '../services/vietsubService.js';
import { createNotification } from '../repositories/notificationRepository.js';
import { toCsv } from '../utils/csv.js';
import { listAnnouncementsAdmin, createAnnouncement, deactivateAnnouncement } from '../repositories/announcementRepository.js';
import { monthlyTop } from '../repositories/leaderboardRepository.js';
import { listAllTicketsAdmin, getTicketById, getMessagesForTicket, addMessage, closeTicket, reopenTicket } from '../repositories/supportRepository.js';
import { getAllGiftcodes, createGiftcode, toggleGiftcodeActive, deleteGiftcode } from '../repositories/giftcodeRepository.js';

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

adminRouter.get('/withdrawals/export.csv', async (req, res, next) => {
  try {
    const rows = await listAllWithdrawalsAdmin();
    const csv = toCsv(rows, ['id', 'username', 'amount_nova', 'amount_vnd', 'method', 'destination', 'status', 'created_at', 'processed_at']);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="withdrawals.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/withdrawals/:id/approve', async (req, res, next) => {
  try {
    const w = await getPendingWithdrawal(req.params.id);
    if (!w) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
    await markWithdrawalPaid(req.params.id, req.body.note || null);
    await createNotification(nanoid(), w.user_id, `Yêu cầu rút ${w.amount_nova} VNC đã được duyệt và thanh toán.`, '/wallet');
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
    await createNotification(nanoid(), w.user_id, `Yêu cầu rút ${w.amount_nova} VNC bị từ chối, đã hoàn lại VNC.`, '/wallet');
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

adminRouter.get('/redeem-orders/export.csv', async (req, res, next) => {
  try {
    const rows = await listAllRedeemOrdersAdmin();
    const csv = toCsv(rows, ['id', 'username', 'label', 'category', 'destination', 'price_nova', 'status', 'created_at', 'processed_at']);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="redeem-orders.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/redeem-orders/:id/fulfill', async (req, res, next) => {
  try {
    await adminFulfillOrder(req.params.id, req.body.note || '');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/redeem-orders/:id/reject', async (req, res, next) => {
  try {
    await adminRejectOrder(req.params.id, req.body.note || 'Từ chối bởi admin');
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
    const rawUsers = await searchUsers(String(req.query.search || ''));
    const enriched = rawUsers.map((u) => {
      const xp = Number(u.xp || 0);
      const levelProgress = calculateLevel(xp);
      return {
        ...u,
        xp,
        level: levelProgress.level,
        levelProgress,
      };
    });
    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/users/:id/adjust-xp', async (req, res, next) => {
  try {
    const targetUser = await getUserById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'Người dùng không tồn tại' });

    const xpDelta = req.body.xpDelta !== undefined ? Number(req.body.xpDelta) : undefined;
    const directXp = req.body.xp !== undefined ? Number(req.body.xp) : undefined;

    let resXp: { previousXp: number; newXp: number };
    if (directXp !== undefined) {
      if (isNaN(directXp) || directXp < 0) {
        return res.status(400).json({ error: 'Giá trị XP không hợp lệ' });
      }
      resXp = await setUserXp(req.params.id, directXp);
    } else if (xpDelta !== undefined) {
      if (isNaN(xpDelta) || xpDelta === 0) {
        return res.status(400).json({ error: 'Giá trị chênh lệch XP không hợp lệ' });
      }
      resXp = await addXpToUser(req.params.id, xpDelta);
    } else {
      return res.status(400).json({ error: 'Thiếu dữ liệu XP cần điều chỉnh' });
    }

    const oldLevel = calculateLevel(resXp.previousXp).level;
    const newLevelInfo = calculateLevel(resXp.newXp);
    const newLevel = newLevelInfo.level;

    if (newLevel > oldLevel) {
      await createNotification(
        nanoid(),
        targetUser.id,
        `Bạn đã lên cấp ${newLevel}`,
        '/profile'
      );
    }

    const logMsg = `[Admin XP] ${req.user?.username} chỉnh XP cho ${targetUser.username}: ${resXp.previousXp} -> ${resXp.newXp} (Cấp ${newLevel})`;
    console.log(logMsg);
    logToDiscord(logMsg).catch(() => {});

    res.json({
      ok: true,
      previousXp: resXp.previousXp,
      xp: resXp.newXp,
      level: newLevel,
      levelProgress: newLevelInfo,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/users/:id/adjust', async (req, res, next) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount) return res.status(400).json({ error: 'Số VNC không hợp lệ' });
    if (amount > 0) await credit(req.params.id, amount, 'admin_adjust', req.body.note || null);
    else await adjustUserBalanceRaw(req.params.id, amount);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/users/:id/lock', async (req, res, next) => {
  try {
    await lockUser(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/users/:id/unlock', async (req, res, next) => {
  try {
    await unlockUser(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Giftcodes management
adminRouter.get('/giftcodes', async (req, res, next) => {
  try {
    res.json(await getAllGiftcodes());
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/giftcodes', async (req, res, next) => {
  try {
    const { code, reward_nova, max_uses, expires_at } = req.body;
    if (!code || !reward_nova) {
      return res.status(400).json({ error: 'Mã và phần thưởng không được để trống' });
    }
    const created = await createGiftcode(
      nanoid(),
      String(code).trim().toUpperCase(),
      Number(reward_nova),
      Number(max_uses) || 1,
      expires_at ? new Date(expires_at).toISOString() : null
    );
    res.json({ ok: true, giftcode: created });
  } catch (err: any) {
    if (err?.code === '23505') {
      return res.status(400).json({ error: 'Mã Giftcode này đã tồn tại' });
    }
    next(err);
  }
});

adminRouter.patch('/giftcodes/:id/toggle', async (req, res, next) => {
  try {
    const updated = await toggleGiftcodeActive(req.params.id);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy giftcode' });
    res.json({ ok: true, giftcode: updated });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/giftcodes/:id', async (req, res, next) => {
  try {
    const deleted = await deleteGiftcode(req.params.id);
    res.json({ ok: deleted });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/vietsub/settings', async (req, res, next) => {
  try {
    res.json(await getVietsubPublicInfo());
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/vietsub/settings', async (req, res, next) => {
  try {
    await updateVietsubSettings(req.body);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/vietsub/licenses', async (req, res, next) => {
  try {
    res.json(await listLicensesAdmin());
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/vietsub/licenses', async (req, res, next) => {
  try {
    const keys = String(req.body.keys || '')
      .split('\n')
      .map((k: string) => k.trim())
      .filter(Boolean);
    if (keys.length === 0) return res.status(400).json({ error: 'Chưa nhập key nào' });
    const added = await addLicenseKeys(keys);
    res.json({ ok: true, added, skipped: keys.length - added });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/vietsub/orders', async (req, res, next) => {
  try {
    res.json(await listAllVietsubOrdersAdmin());
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/vietsub/orders/:id/approve', async (req, res, next) => {
  try {
    await adminApproveVietsubOrder(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/vietsub/orders/:id/reject', async (req, res, next) => {
  try {
    await adminRejectVietsubOrder(req.params.id, req.body.note || 'Từ chối bởi admin');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/announcements', async (req, res, next) => {
  try {
    res.json(await listAnnouncementsAdmin());
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/announcements', async (req, res, next) => {
  try {
    const raw = String(req.body?.message || '').trim();
    if (!raw) {
      return res.status(400).json({ error: 'Nội dung thông báo không được để trống' });
    }
    const normalized = raw.replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return res.status(400).json({ error: 'Nội dung thông báo không được để trống' });
    }
    if (raw.length > 200 || normalized.length > 200) {
      return res.status(400).json({ error: 'Nội dung thông báo không được vượt quá 200 ký tự' });
    }
    await createAnnouncement(nanoid(), normalized);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/announcements/:id/deactivate', async (req, res, next) => {
  try {
    await deactivateAnnouncement(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/leaderboard/monthly-payout', async (req, res, next) => {
  try {
    const top = await monthlyTop();
    const prizes = [500, 300, 100];
    const paid: { username: string; amount: number }[] = [];

    for (let i = 0; i < Math.min(3, top.length); i++) {
      const row = top[i];
      if (row.earned <= 0) continue;
      const user = await getUserByUsername(row.username);
      if (!user) continue;
      await credit(user.id, prizes[i], 'monthly_leaderboard_reward', `month-top-${i + 1}`);
      await createNotification(nanoid(), user.id, `Chúc mừng! Bạn đạt hạng ${i + 1} bảng xếp hạng tháng, nhận thưởng ${prizes[i]} VNC`, '/leaderboard');
      paid.push({ username: user.username, amount: prizes[i] });
    }

    res.json({ ok: true, paid });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/support/tickets', async (req, res, next) => {
  try {
    res.json(await listAllTicketsAdmin());
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/support/tickets/:id', async (req, res, next) => {
  try {
    const ticket = await getTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Không tìm thấy ticket' });
    const messages = await getMessagesForTicket(ticket.id);
    res.json({ ticket, messages });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/support/tickets/:id/messages', async (req, res, next) => {
  try {
    const ticket = await getTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Không tìm thấy ticket' });
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(400).json({ error: 'Nội dung không được để trống' });

    await addMessage(nanoid(), ticket.id, 'admin', message);
    await createNotification(nanoid(), ticket.user_id, `Admin đã trả lời ticket "${ticket.subject}" của bạn`, '/support');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/support/tickets/:id/close', async (req, res, next) => {
  try {
    await closeTicket(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/support/tickets/:id/reopen', async (req, res, next) => {
  try {
    await reopenTicket(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
