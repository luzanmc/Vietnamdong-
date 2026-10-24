import { Router } from 'express';
import { nanoid } from 'nanoid';
import { pool } from '../db/database.js';
import { env } from '../config/env.js';
import { verifySession } from '../utils/jwt.js';
import { generateBase32Secret, verifyTotpCode, buildOtpAuthUri } from '../utils/totp.js';
import { getTotp, saveTotpSecret, enableTotp } from '../repositories/totpRepository.js';
import {
  requireAdminSession,
  signAdminToken,
  adminCookieOpts,
  adminAdvancedCookieOpts,
  verifyAdminToken,
  verifyAdminAdvancedToken,
  checkAdminTotpRateLimit,
  recordAdminTotpFailureAndCheck,
  resetAdminTotpAttempts,
  verifyDangerousTotp,
  logAdminAudit,
} from '../middleware/adminAuth.js';
import { adminAdvancedRouter } from './admin.advanced.routes.js';
import { validateBody } from '../middleware/validate.js';
import { createCreatorCodeSchema } from '../validators/creator.validators.js';
import { credit, debit } from '../services/coinService.js';
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
import {
  searchUsers,
  getUserByUsername,
  countAllUsers,
  lockUser,
  unlockUser,
  getUserById,
  addXpToUser,
  setUserXp,
  updateUserAvatar,
  updateUsername,
  updateUserAvatarFrame,
  updateCardConfig,
  updateUserRole,
  countActiveAdmins,
} from '../repositories/userRepository.js';
import { calculateLevel } from '../services/levelService.js';
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

adminRouter.get('/auth/status', async (req, res, next) => {
  try {
    const userCookie = req.cookies?.vnd_session;
    const userPayload = userCookie && verifySession(userCookie);
    if (!userPayload) {
      return res.json({ loggedIn: false, hasTotp: false, sessionActive: false, advancedSessionActive: false });
    }

    const user = await getUserById(userPayload.uid);
    if (!user || user.role !== 'admin' || user.deleted_at || user.locked) {
      return res.json({ loggedIn: false, hasTotp: false, sessionActive: false, advancedSessionActive: false });
    }

    const totp = await getTotp(user.id);
    const hasTotp = totp?.enabled === 1;

    const adminToken = req.cookies?.vnd_admin_session || (req.headers['x-admin-token'] as string | undefined);
    const adminPayload = adminToken ? verifyAdminToken(adminToken) : null;
    const sessionActive = Boolean(adminPayload && adminPayload.uid === user.id);

    const advToken = req.cookies?.vnd_admin_advanced_session || (req.headers['x-admin-advanced-token'] as string | undefined);
    const advPayload = advToken ? verifyAdminAdvancedToken(advToken) : null;
    const advancedSessionActive = Boolean(advPayload && advPayload.uid === user.id);

    res.json({
      loggedIn: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
      },
      hasTotp,
      sessionActive,
      advancedSessionActive,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/auth/setup-totp', async (req, res, next) => {
  try {
    const userCookie = req.cookies?.vnd_session;
    const userPayload = userCookie && verifySession(userCookie);
    if (!userPayload) return res.status(401).json({ error: 'Chưa đăng nhập' });

    const user = await getUserById(userPayload.uid);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Không có quyền quản trị viên' });

    const existing = await getTotp(user.id);
    if (existing?.enabled === 1) {
      return res.status(400).json({ error: 'Xác thực TOTP đã được kích hoạt trước đó' });
    }

    const secret = generateBase32Secret();
    await saveTotpSecret(user.id, secret);
    const label = user.email || user.username;
    const otpauthUri = buildOtpAuthUri(secret, label, env.appName);

    res.json({ secret, otpauthUri });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/auth/enable-totp', async (req, res, next) => {
  try {
    const userCookie = req.cookies?.vnd_session;
    const userPayload = userCookie && verifySession(userCookie);
    if (!userPayload) return res.status(401).json({ error: 'Chưa đăng nhập' });

    const user = await getUserById(userPayload.uid);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Không có quyền quản trị viên' });

    const totp = await getTotp(user.id);
    if (!totp) return res.status(400).json({ error: 'Chưa khởi tạo xác thực TOTP' });

    const code = String(req.body.code || '').trim();
    if (!verifyTotpCode(totp.secret, code)) {
      return res.status(401).json({ error: 'Mã xác thực TOTP không chính xác' });
    }

    await enableTotp(user.id);
    await resetAdminTotpAttempts(user.id);

    const adminToken = signAdminToken(user.id);
    res.cookie('vnd_admin_session', adminToken, adminCookieOpts);
    await logAdminAudit(user.id, 'ENABLE_TOTP', user.id, null, req);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/auth/verify-totp', async (req, res, next) => {
  try {
    const userCookie = req.cookies?.vnd_session;
    const userPayload = userCookie && verifySession(userCookie);
    if (!userPayload) return res.status(401).json({ error: 'Chưa đăng nhập' });

    const user = await getUserById(userPayload.uid);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Không có quyền quản trị viên' });

    const rateCheck = await checkAdminTotpRateLimit(user.id);
    if (rateCheck.locked) {
      return res.status(429).json({ error: rateCheck.message });
    }

    const code = String(req.body.code || '').trim();
    if (!code) return res.status(400).json({ error: 'Vui lòng nhập mã xác thực TOTP' });

    const totp = await getTotp(user.id);
    if (!totp || totp.enabled !== 1) {
      return res.status(400).json({ error: 'Tài khoản chưa thiết lập xác thực TOTP' });
    }

    const valid = verifyTotpCode(totp.secret, code);
    if (!valid) {
      const failRes = await recordAdminTotpFailureAndCheck(user.id);
      return res.status(401).json({ error: failRes.message });
    }

    await resetAdminTotpAttempts(user.id);
    const adminToken = signAdminToken(user.id);
    res.cookie('vnd_admin_session', adminToken, adminCookieOpts);
    await logAdminAudit(user.id, 'ADMIN_LOGIN', null, null, req);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/auth/logout', (req, res) => {
  res.clearCookie('vnd_admin_session', adminCookieOpts);
  res.clearCookie('vnd_admin_advanced_session', adminAdvancedCookieOpts);
  res.json({ ok: true });
});

adminRouter.use('/advanced', adminAdvancedRouter);

adminRouter.use(requireAdminSession);

let cachedDashboardStats: { data: any; expiresAt: number } | null = null;

adminRouter.get('/dashboard-stats', async (req, res, next) => {
  try {
    const now = Date.now();
    if (cachedDashboardStats && cachedDashboardStats.expiresAt > now) {
      return res.json(cachedDashboardStats.data);
    }

    const [
      totalUsersRes,
      newTodayRes,
      new7DaysRes,
      totalLinksRes,
      totalBypassedRes,
      totalVncRes,
      pendingWithdrawalsRes,
      pendingRedeemsRes,
      pendingVietsubRes,
      openTicketsRes,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) AS c FROM users WHERE deleted_at IS NULL'),
      pool.query('SELECT COUNT(*) AS c FROM users WHERE created_at >= CURRENT_DATE AND deleted_at IS NULL'),
      pool.query("SELECT COUNT(*) AS c FROM users WHERE created_at >= NOW() - INTERVAL '7 days' AND deleted_at IS NULL"),
      pool.query('SELECT COUNT(*) AS c FROM tasks WHERE active = 1'),
      pool.query("SELECT COUNT(*) AS c FROM task_attempts WHERE status = 'completed'"),
      pool.query('SELECT COALESCE(SUM(balance_nova), 0)::bigint AS c FROM users WHERE deleted_at IS NULL'),
      pool.query("SELECT COUNT(*) AS c FROM withdrawals WHERE status = 'pending'"),
      pool.query("SELECT COUNT(*) AS c FROM redeem_orders WHERE status = 'pending'"),
      pool.query("SELECT COUNT(*) AS c FROM vietsub_orders WHERE status = 'pending'"),
      pool.query("SELECT COUNT(*) AS c FROM support_tickets WHERE status = 'open'"),
    ]);

    const data = {
      totalUsers: Number(totalUsersRes.rows[0]?.c || 0),
      newUsersToday: Number(newTodayRes.rows[0]?.c || 0),
      newUsers7Days: Number(new7DaysRes.rows[0]?.c || 0),
      totalLinks: Number(totalLinksRes.rows[0]?.c || 0),
      totalBypassed: Number(totalBypassedRes.rows[0]?.c || 0),
      totalServerVnc: Number(totalVncRes.rows[0]?.c || 0),
      pendingWithdrawals: Number(pendingWithdrawalsRes.rows[0]?.c || 0),
      pendingRedeems: Number(pendingRedeemsRes.rows[0]?.c || 0),
      pendingVietsub: Number(pendingVietsubRes.rows[0]?.c || 0),
      openTickets: Number(openTicketsRes.rows[0]?.c || 0),
    };

    cachedDashboardStats = {
      data,
      expiresAt: now + 45 * 1000,
    };

    res.json(data);
  } catch (err) {
    next(err);
  }
});

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

adminRouter.get('/analytics', async (req, res, next) => {
  try {
    const rawDays = Number(req.query.days) || 7;
    const days = [7, 30, 90].includes(rawDays) ? rawDays : 7;

    const bypassesRes = await pool.query(
      `SELECT to_char(completed_at, 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
       FROM task_attempts
       WHERE status = 'completed' AND completed_at >= NOW() - ($1 || ' days')::interval
       GROUP BY day ORDER BY day ASC`,
      [days]
    );

    const topLinksRes = await pool.query(
      `SELECT t.name, COUNT(a.id)::int AS count
       FROM task_attempts a
       JOIN tasks t ON t.id = a.task_id
       WHERE a.status = 'completed' AND a.completed_at >= NOW() - ($1 || ' days')::interval
       GROUP BY t.name ORDER BY count DESC LIMIT 8`,
      [days]
    );

    const newUsersRes = await pool.query(
      `SELECT to_char(created_at, 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
       FROM users
       WHERE created_at >= NOW() - ($1 || ' days')::interval AND deleted_at IS NULL
       GROUP BY day ORDER BY day ASC`,
      [days]
    );

    const vncIssuedRes = await pool.query(
      `SELECT to_char(created_at, 'YYYY-MM-DD') AS day, COALESCE(SUM(amount), 0)::bigint AS amount
       FROM coin_ledger
       WHERE amount > 0 AND created_at >= NOW() - ($1 || ' days')::interval
       GROUP BY day ORDER BY day ASC`,
      [days]
    );

    const vncWithdrawnRes = await pool.query(
      `SELECT to_char(created_at, 'YYYY-MM-DD') AS day, COALESCE(SUM(amount_nova), 0)::bigint AS amount
       FROM withdrawals
       WHERE status IN ('paid', 'pending') AND created_at >= NOW() - ($1 || ' days')::interval
       GROUP BY day ORDER BY day ASC`,
      [days]
    );

    res.json({
      days,
      dailyBypasses: bypassesRes.rows,
      topLinks: topLinksRes.rows,
      newUsers: newUsersRes.rows,
      vncIssued: vncIssuedRes.rows.map((r) => ({ day: r.day, amount: Number(r.amount) })),
      vncWithdrawn: vncWithdrawnRes.rows.map((r) => ({ day: r.day, amount: Number(r.amount) })),
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/users', async (req, res, next) => {
  try {
    const search = String(req.query.search || '');
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const result = await searchUsers(search, limit, offset);

    const enriched = result.rows.map((u) => {
      const xp = Number(u.xp || 0);
      const levelProgress = calculateLevel(xp);
      return {
        ...u,
        xp,
        level: levelProgress.level,
        levelProgress,
      };
    });

    res.json({
      rows: enriched,
      total: result.total,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/users/:id', async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Người dùng không tồn tại' });
    const currentXp = Number(user.xp || 0);
    const levelProgress = calculateLevel(currentXp);

    const { password_hash, ...safeUser } = user;
    res.json({
      ...safeUser,
      xp: currentXp,
      level: levelProgress.level,
      levelProgress,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/users/:id/adjust-balance', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    const amount = Number(req.body.amount);
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Số lượng VNC không hợp lệ' });
    }

    const reason = String(req.body.reason || '').trim();
    if (!reason) {
      return res.status(400).json({ error: 'Vui lòng nhập lý do điều chỉnh số dư' });
    }

    const targetUser = await getUserById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'Người dùng không tồn tại' });

    if (amount > 0) {
      await credit(targetUser.id, amount, 'admin_adjust', reason);
    } else {
      const deduct = Math.abs(amount);
      if (targetUser.balance_nova < deduct) {
        return res.status(400).json({ error: 'Số dư của người dùng không đủ để trừ' });
      }
      await debit(targetUser.id, deduct, 'admin_adjust', reason);
    }

    await logAdminAudit(admin.id, 'ADJUST_BALANCE', targetUser.id, { username: targetUser.username, amount, reason }, req);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Lỗi điều chỉnh số dư' });
  }
});

adminRouter.post('/users/:id/adjust-xp', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
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
      await createNotification(nanoid(), targetUser.id, `Bạn đã lên cấp ${newLevel}`, '/profile');
    }

    await logAdminAudit(admin.id, 'ADJUST_XP', targetUser.id, { username: targetUser.username, from: resXp.previousXp, to: resXp.newXp, level: newLevel }, req);

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

adminRouter.post('/users/:id/update-profile', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    const targetUser = await getUserById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'Người dùng không tồn tại' });

    const { username, avatar_url, avatar_frame, card_bg } = req.body;

    if (username && username.trim() !== targetUser.username) {
      const cleanName = username.trim();
      const existing = await getUserByUsername(cleanName);
      if (existing && existing.id !== targetUser.id) {
        return res.status(400).json({ error: 'Tên người dùng này đã có người sử dụng' });
      }
      await updateUsername(targetUser.id, cleanName);
    }

    if (avatar_url !== undefined) {
      await updateUserAvatar(targetUser.id, avatar_url ? String(avatar_url).trim() : null);
    }

    if (avatar_frame !== undefined) {
      await updateUserAvatarFrame(targetUser.id, avatar_frame ? String(avatar_frame).trim() : null);
    }

    if (card_bg !== undefined) {
      await updateCardConfig(targetUser.id, card_bg ? String(card_bg).trim() : null, Boolean(targetUser.card_show_wm));
    }

    await logAdminAudit(admin.id, 'UPDATE_PROFILE', targetUser.id, { username, avatar_frame, card_bg }, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/users/:id/change-role', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    const targetUser = await getUserById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'Người dùng không tồn tại' });

    const newRole = req.body.role === 'admin' ? 'admin' : 'user';

    if (targetUser.role === 'admin' && newRole === 'user') {
      const adminCount = await countActiveAdmins();
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Không thể hạ quyền quản trị viên cuối cùng của hệ thống' });
      }

      const totpCode = String(req.body.totpCode || '').trim();
      const valid = await verifyDangerousTotp(admin.id, totpCode);
      if (!valid) {
        return res.status(400).json({ error: 'Mã xác thực TOTP không chính xác' });
      }
    }

    await updateUserRole(targetUser.id, newRole);
    await logAdminAudit(admin.id, 'CHANGE_ROLE', targetUser.id, { username: targetUser.username, oldRole: targetUser.role, newRole }, req);

    res.json({ ok: true, role: newRole });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/users/:id/lock', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    await lockUser(req.params.id);
    await logAdminAudit(admin.id, 'LOCK_USER', req.params.id, null, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/users/:id/unlock', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    await unlockUser(req.params.id);
    await logAdminAudit(admin.id, 'UNLOCK_USER', req.params.id, null, req);
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
    const admin = req.adminUser!;
    const raw = String(req.body?.message || '').replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
    if (!raw) {
      return res.status(400).json({ error: 'Nội dung thông báo không được để trống' });
    }
    if (raw.length > 200) {
      return res.status(400).json({ error: 'Nội dung thông báo không được vượt quá 200 ký tự' });
    }
    await createAnnouncement(nanoid(), raw);
    await logAdminAudit(admin.id, 'CREATE_ANNOUNCEMENT', null, { message: raw }, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/announcements/:id', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    const raw = String(req.body?.message || '').replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
    if (!raw) return res.status(400).json({ error: 'Nội dung thông báo không được để trống' });
    if (raw.length > 200) return res.status(400).json({ error: 'Nội dung thông báo không được vượt quá 200 ký tự' });

    await pool.query('UPDATE announcements SET message = $1 WHERE id = $2', [raw, req.params.id]);
    await logAdminAudit(admin.id, 'EDIT_ANNOUNCEMENT', req.params.id, { message: raw }, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/announcements/:id/toggle', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    await pool.query('UPDATE announcements SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = $1', [req.params.id]);
    await logAdminAudit(admin.id, 'TOGGLE_ANNOUNCEMENT', req.params.id, null, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/announcements/:id', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    await pool.query('DELETE FROM announcements WHERE id = $1', [req.params.id]);
    await logAdminAudit(admin.id, 'DELETE_ANNOUNCEMENT', req.params.id, null, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/announcements/:id/deactivate', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    await deactivateAnnouncement(req.params.id);
    await logAdminAudit(admin.id, 'DEACTIVATE_ANNOUNCEMENT', req.params.id, null, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/notifications/send', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    const { userId, message, link } = req.body;
    const cleanMsg = String(message || '').trim();
    if (!userId || !cleanMsg) {
      return res.status(400).json({ error: 'Thiếu người nhận hoặc nội dung thông báo' });
    }

    const targetUser = await getUserById(userId);
    if (!targetUser) return res.status(404).json({ error: 'Người nhận không tồn tại' });

    await createNotification(nanoid(), targetUser.id, cleanMsg, link ? String(link).trim() : null);
    await logAdminAudit(admin.id, 'SEND_NOTIFICATION', targetUser.id, { username: targetUser.username, message: cleanMsg }, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/notifications/broadcast', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    const cleanMsg = String(req.body.message || '').trim();
    if (!cleanMsg) return res.status(400).json({ error: 'Nội dung thông báo không được để trống' });
    const link = req.body.link ? String(req.body.link).trim() : null;

    const { rows } = await pool.query<{ id: string }>('SELECT id FROM users WHERE deleted_at IS NULL');
    for (const u of rows) {
      await createNotification(nanoid(), u.id, cleanMsg, link);
    }

    await logAdminAudit(admin.id, 'BROADCAST_NOTIFICATION', null, { count: rows.length, message: cleanMsg }, req);
    res.json({ ok: true, count: rows.length });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/codes/giftcodes', async (req, res, next) => {
  try {
    res.json(await getAllGiftcodes());
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/codes/giftcodes/:id/history', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.user_id, u.username, r.reward_nova, r.created_at
       FROM giftcode_redemptions r
       JOIN users u ON u.id = r.user_id
       WHERE r.giftcode_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/codes/giftcodes', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
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
    await logAdminAudit(admin.id, 'CREATE_GIFTCODE', created.id, { code: created.code, reward: created.reward_nova }, req);
    res.json({ ok: true, giftcode: created });
  } catch (err: any) {
    if (err?.code === '23505') {
      return res.status(400).json({ error: 'Mã Giftcode này đã tồn tại' });
    }
    next(err);
  }
});

adminRouter.patch('/codes/giftcodes/:id/toggle', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    const updated = await toggleGiftcodeActive(req.params.id);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy giftcode' });
    await logAdminAudit(admin.id, 'TOGGLE_GIFTCODE', req.params.id, null, req);
    res.json({ ok: true, giftcode: updated });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/codes/giftcodes/:id', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    const deleted = await deleteGiftcode(req.params.id);
    await logAdminAudit(admin.id, 'DELETE_GIFTCODE', req.params.id, null, req);
    res.json({ ok: deleted });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/codes/creators', async (req, res, next) => {
  try {
    res.json(await listCreatorCodesAdmin());
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/codes/creators/:id/history', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.created_at
       FROM users u
       WHERE u.creator_code_id = $1 AND u.deleted_at IS NULL
       ORDER BY u.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/codes/creators', validateBody(createCreatorCodeSchema), async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    const { code, owner_username, bonus_percent } = req.body;
    const owner = await getUserByUsername(owner_username);
    if (!owner) return res.status(404).json({ error: 'Không tìm thấy user để gán code' });

    const newId = nanoid();
    await createCreatorCode(newId, code, owner.id, bonus_percent || 5);
    await logAdminAudit(admin.id, 'CREATE_CREATOR_CODE', newId, { code, owner: owner_username }, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/codes/creators/:id', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    await updateCreatorCodeAdmin(req.params.id, req.body);
    await logAdminAudit(admin.id, 'UPDATE_CREATOR_CODE', req.params.id, req.body, req);
    res.json({ ok: true });
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
    const admin = req.adminUser!;
    const w = await getPendingWithdrawal(req.params.id);
    if (!w) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
    await markWithdrawalPaid(req.params.id, req.body.note || null);
    await createNotification(nanoid(), w.user_id, `Yêu cầu rút ${w.amount_nova} VNC đã được duyệt và thanh toán.`, '/wallet');
    await logAdminAudit(admin.id, 'APPROVE_WITHDRAWAL', w.id, { amount: w.amount_nova, userId: w.user_id }, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/withdrawals/:id/reject', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    const w = await getPendingWithdrawal(req.params.id);
    if (!w) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
    await credit(w.user_id, w.amount_nova, 'admin_adjust', w.id);
    await markWithdrawalRejected(req.params.id, req.body.note || 'Từ chối bởi admin');
    await createNotification(nanoid(), w.user_id, `Yêu cầu rút ${w.amount_nova} VNC bị từ chối, đã hoàn lại VNC.`, '/wallet');
    await logAdminAudit(admin.id, 'REJECT_WITHDRAWAL', w.id, { amount: w.amount_nova, userId: w.user_id, note: req.body.note }, req);
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
    const admin = req.adminUser!;
    await adminFulfillOrder(req.params.id, req.body.note || '');
    await logAdminAudit(admin.id, 'FULFILL_REDEEM_ORDER', req.params.id, null, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/redeem-orders/:id/reject', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    await adminRejectOrder(req.params.id, req.body.note || 'Từ chối bởi admin');
    await logAdminAudit(admin.id, 'REJECT_REDEEM_ORDER', req.params.id, { note: req.body.note }, req);
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
    const admin = req.adminUser!;
    await updateTaskAdmin(req.params.id, req.body);
    await logAdminAudit(admin.id, 'UPDATE_TASK', req.params.id, req.body, req);
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
    const admin = req.adminUser!;
    const { code, owner_username, bonus_percent } = req.body;
    const owner = await getUserByUsername(owner_username);
    if (!owner) return res.status(404).json({ error: 'Không tìm thấy user để gán code' });

    const newId = nanoid();
    await createCreatorCode(newId, code, owner.id, bonus_percent || 5);
    await logAdminAudit(admin.id, 'CREATE_CREATOR_CODE', newId, { code, owner: owner_username }, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/creator-codes/:id', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    await updateCreatorCodeAdmin(req.params.id, req.body);
    await logAdminAudit(admin.id, 'UPDATE_CREATOR_CODE', req.params.id, req.body, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/giftcodes', async (req, res, next) => {
  try {
    res.json(await getAllGiftcodes());
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/giftcodes', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
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
    await logAdminAudit(admin.id, 'CREATE_GIFTCODE', created.id, { code: created.code }, req);
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
    const admin = req.adminUser!;
    const updated = await toggleGiftcodeActive(req.params.id);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy giftcode' });
    await logAdminAudit(admin.id, 'TOGGLE_GIFTCODE', req.params.id, null, req);
    res.json({ ok: true, giftcode: updated });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/giftcodes/:id', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    const deleted = await deleteGiftcode(req.params.id);
    await logAdminAudit(admin.id, 'DELETE_GIFTCODE', req.params.id, null, req);
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
    const admin = req.adminUser!;
    await updateVietsubSettings(req.body);
    await logAdminAudit(admin.id, 'UPDATE_VIETSUB_SETTINGS', null, req.body, req);
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
    const admin = req.adminUser!;
    const keys = String(req.body.keys || '')
      .split('\n')
      .map((k: string) => k.trim())
      .filter(Boolean);
    if (keys.length === 0) return res.status(400).json({ error: 'Chưa nhập key nào' });
    const added = await addLicenseKeys(keys);
    await logAdminAudit(admin.id, 'ADD_VIETSUB_LICENSES', null, { added, total: keys.length }, req);
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
    const admin = req.adminUser!;
    await adminApproveVietsubOrder(req.params.id);
    await logAdminAudit(admin.id, 'APPROVE_VIETSUB_ORDER', req.params.id, null, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/vietsub/orders/:id/reject', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    await adminRejectVietsubOrder(req.params.id, req.body.note || 'Từ chối bởi admin');
    await logAdminAudit(admin.id, 'REJECT_VIETSUB_ORDER', req.params.id, { note: req.body.note }, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/leaderboard/monthly-payout', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
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

    await logAdminAudit(admin.id, 'MONTHLY_PAYOUT', null, { paid }, req);
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
    const admin = req.adminUser!;
    const ticket = await getTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Không tìm thấy ticket' });
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(400).json({ error: 'Nội dung không được để trống' });

    await addMessage(nanoid(), ticket.id, 'admin', message);
    await createNotification(nanoid(), ticket.user_id, `Admin đã trả lời ticket "${ticket.subject}" của bạn`, '/support');
    await logAdminAudit(admin.id, 'REPLY_TICKET', ticket.id, { message }, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/support/tickets/:id/close', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    await closeTicket(req.params.id);
    await logAdminAudit(admin.id, 'CLOSE_TICKET', req.params.id, null, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/support/tickets/:id/reopen', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    await reopenTicket(req.params.id);
    await logAdminAudit(admin.id, 'REOPEN_TICKET', req.params.id, null, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/settings', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM settings');
    const obj: Record<string, string> = {};
    for (const r of rows) obj[r.key] = r.value;
    res.json(obj);
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/settings', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Khóa cài đặt không được để trống' });
    await setSetting(key, String(value ?? ''));
    await logAdminAudit(admin.id, 'UPDATE_SETTING', key, { value }, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
