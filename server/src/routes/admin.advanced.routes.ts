import { Router } from 'express';
import { pool } from '../db/database.js';
import { hashPassword } from '../services/passwordService.js';
import {
  requireAdminSession,
  requireAdminAdvancedSession,
  signAdminAdvancedToken,
  adminAdvancedCookieOpts,
  checkAdminTotpRateLimit,
  recordAdminTotpFailureAndCheck,
  resetAdminTotpAttempts,
  verifyDangerousTotp,
  logAdminAudit,
} from '../middleware/adminAuth.js';
import { getTotp } from '../repositories/totpRepository.js';
import { verifyTotpCode } from '../utils/totp.js';
import {
  getUserById,
  getUserByEmail,
  getUserByUsername,
  updateUsername,
  markEmailVerified,
  setUserPasswordHash,
  banUser,
  unbanUser,
  softDeleteUser,
  hardDeleteUser,
  countActiveAdmins,
  updateUserRole,
  listAdmins,
} from '../repositories/userRepository.js';
import { listAdminAuditLogs } from '../repositories/adminAuditRepository.js';

export const adminAdvancedRouter = Router();

adminAdvancedRouter.post('/auth/verify-totp', requireAdminSession, async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    const rateCheck = await checkAdminTotpRateLimit(admin.id);
    if (rateCheck.locked) {
      return res.status(429).json({ error: rateCheck.message });
    }

    const code = String(req.body.code || '').trim();
    if (!code) {
      return res.status(400).json({ error: 'Vui lòng nhập mã xác thực TOTP' });
    }

    const totp = await getTotp(admin.id);
    if (!totp || totp.enabled !== 1) {
      return res.status(400).json({ error: 'Tài khoản chưa kích hoạt xác thực TOTP' });
    }

    const valid = verifyTotpCode(totp.secret, code);
    if (!valid) {
      const failRes = await recordAdminTotpFailureAndCheck(admin.id);
      return res.status(401).json({ error: failRes.message });
    }

    await resetAdminTotpAttempts(admin.id);
    const advancedToken = signAdminAdvancedToken(admin.id);
    res.cookie('vnd_admin_advanced_session', advancedToken, adminAdvancedCookieOpts);
    await logAdminAudit(admin.id, 'ADVANCED_SESSION_START', null, null, req);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminAdvancedRouter.use(requireAdminSession, requireAdminAdvancedSession);

const ALLOWED_TABLES = [
  'users',
  'creator_codes',
  'tasks',
  'task_attempts',
  'coin_ledger',
  'withdrawals',
  'redeem_items',
  'redeem_orders',
  'daily_claims',
  'notifications',
  'vietsub_licenses',
  'vietsub_orders',
  'announcements',
  'giftcodes',
  'giftcode_redemptions',
  'support_tickets',
  'support_messages',
  'admin_audit_log',
];

const SENSITIVE_COLUMN_PATTERNS = [
  'password',
  'hash',
  'secret',
  'token',
  'totp',
  'registered_ip',
  'partner_key',
  'client_secret',
];

function isSensitiveColumn(colName: string): boolean {
  const lower = colName.toLowerCase();
  return SENSITIVE_COLUMN_PATTERNS.some((pattern) => lower.includes(pattern));
}

adminAdvancedRouter.get('/databases/tables', async (req, res, next) => {
  try {
    const list: { name: string; count: number }[] = [];
    for (const tbl of ALLOWED_TABLES) {
      try {
        const { rows } = await pool.query(`SELECT COUNT(*) AS c FROM ${tbl}`);
        list.push({ name: tbl, count: Number(rows[0]?.c || 0) });
      } catch {
        list.push({ name: tbl, count: 0 });
      }
    }
    res.json(list);
  } catch (err) {
    next(err);
  }
});

adminAdvancedRouter.get('/databases/:table', async (req, res, next) => {
  try {
    const tableName = String(req.params.table || '').toLowerCase();
    if (!ALLOWED_TABLES.includes(tableName)) {
      return res.status(400).json({ error: 'Bảng dữ liệu không nằm trong danh sách cho phép' });
    }

    const colQuery = await pool.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position ASC`,
      [tableName]
    );

    const safeColumns = colQuery.rows
      .map((c) => c.column_name as string)
      .filter((c) => !isSensitiveColumn(c));

    if (safeColumns.length === 0) {
      return res.status(400).json({ error: 'Không có cột dữ liệu an toàn để hiển thị' });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim();

    const textColumns = colQuery.rows
      .filter((c) => !isSensitiveColumn(c.column_name) && ['text', 'character varying', 'character'].includes(c.data_type))
      .map((c) => c.column_name);

    let whereClause = '';
    const params: any[] = [];

    if (search && textColumns.length > 0) {
      params.push(`%${search}%`);
      const conditions = textColumns.map((col) => `"${col}"::text ILIKE $1`);
      whereClause = `WHERE ${conditions.join(' OR ')}`;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) AS c FROM "${tableName}" ${whereClause}`,
      params
    );
    const total = Number(countRes.rows[0]?.c || 0);

    const orderCol = safeColumns.includes('created_at')
      ? '"created_at" DESC'
      : safeColumns.includes('id')
      ? '"id" DESC'
      : `"${safeColumns[0]}" ASC`;

    const selectCols = safeColumns.map((c) => `"${c}"`).join(', ');
    const dataQuery = `SELECT ${selectCols} FROM "${tableName}" ${whereClause} ORDER BY ${orderCol} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const dataRes = await pool.query(dataQuery, [...params, limit, offset]);

    res.json({
      table: tableName,
      columns: safeColumns,
      rows: dataRes.rows,
      total,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
});

adminAdvancedRouter.post('/users/:id/change-password', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    const { totpCode, newPassword } = req.body;

    const validTotp = await verifyDangerousTotp(admin.id, totpCode);
    if (!validTotp) {
      return res.status(400).json({ error: 'Mã xác thực TOTP không chính xác' });
    }

    const passwordStr = String(newPassword || '');
    if (passwordStr.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    const targetUser = await getUserById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'Người dùng không tồn tại' });

    const newHash = await hashPassword(passwordStr);
    await setUserPasswordHash(targetUser.id, newHash);
    await pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [targetUser.id]);

    await logAdminAudit(admin.id, 'CHANGE_PASSWORD', targetUser.id, { username: targetUser.username }, req);
    res.json({ ok: true, message: 'Đổi mật khẩu tài khoản thành công' });
  } catch (err) {
    next(err);
  }
});

adminAdvancedRouter.post('/users/:id/change-username', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    const newUsername = String(req.body.username || '').trim();
    if (!newUsername || newUsername.length < 3 || newUsername.length > 30) {
      return res.status(400).json({ error: 'Tên đăng nhập mới phải từ 3 đến 30 ký tự' });
    }

    const targetUser = await getUserById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'Người dùng không tồn tại' });

    const existing = await getUserByUsername(newUsername);
    if (existing && existing.id !== targetUser.id) {
      return res.status(400).json({ error: 'Tên đăng nhập này đã được sử dụng' });
    }

    await updateUsername(targetUser.id, newUsername);
    await logAdminAudit(admin.id, 'CHANGE_USERNAME', targetUser.id, { old: targetUser.username, new: newUsername }, req);
    res.json({ ok: true, username: newUsername });
  } catch (err) {
    next(err);
  }
});

adminAdvancedRouter.post('/users/:id/verify-email', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    const targetUser = await getUserById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'Người dùng không tồn tại' });

    await markEmailVerified(targetUser.id);
    await logAdminAudit(admin.id, 'VERIFY_EMAIL', targetUser.id, { username: targetUser.username, email: targetUser.email }, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminAdvancedRouter.post('/users/:id/ban', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    const { totpCode, reason, durationHours } = req.body;

    const validTotp = await verifyDangerousTotp(admin.id, totpCode);
    if (!validTotp) {
      return res.status(400).json({ error: 'Mã xác thực TOTP không chính xác' });
    }

    const targetUser = await getUserById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'Người dùng không tồn tại' });

    if (targetUser.role === 'admin' && targetUser.id === admin.id) {
      return res.status(400).json({ error: 'Không thể tự cấm tài khoản của chính mình' });
    }

    const hours = Number(durationHours);
    const expiresAt = hours > 0 ? new Date(Date.now() + hours * 3600 * 1000) : null;
    const banReason = String(reason || 'Vi phạm điều khoản dịch vụ').trim();

    await banUser(targetUser.id, banReason, expiresAt);
    await logAdminAudit(admin.id, 'BAN_USER', targetUser.id, { username: targetUser.username, reason: banReason, durationHours: hours || 'permanent' }, req);

    res.json({ ok: true, banned_at: new Date().toISOString(), ban_reason: banReason, ban_expires_at: expiresAt?.toISOString() || null });
  } catch (err) {
    next(err);
  }
});

adminAdvancedRouter.post('/users/:id/unban', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    const { totpCode } = req.body;

    const validTotp = await verifyDangerousTotp(admin.id, totpCode);
    if (!validTotp) {
      return res.status(400).json({ error: 'Mã xác thực TOTP không chính xác' });
    }

    const targetUser = await getUserById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'Người dùng không tồn tại' });

    await unbanUser(targetUser.id);
    await logAdminAudit(admin.id, 'UNBAN_USER', targetUser.id, { username: targetUser.username }, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminAdvancedRouter.post('/users/:id/delete', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    const { totpCode, hardDelete } = req.body;

    const validTotp = await verifyDangerousTotp(admin.id, totpCode);
    if (!validTotp) {
      return res.status(400).json({ error: 'Mã xác thực TOTP không chính xác' });
    }

    const targetUser = await getUserById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'Người dùng không tồn tại' });

    if (targetUser.role === 'admin') {
      const adminCount = await countActiveAdmins();
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Không thể xóa quản trị viên cuối cùng' });
      }
    }

    if (hardDelete) {
      await hardDeleteUser(targetUser.id);
      await logAdminAudit(admin.id, 'HARD_DELETE_USER', targetUser.id, { username: targetUser.username }, req);
    } else {
      await softDeleteUser(targetUser.id);
      await logAdminAudit(admin.id, 'SOFT_DELETE_USER', targetUser.id, { username: targetUser.username }, req);
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminAdvancedRouter.get('/admins', async (req, res, next) => {
  try {
    const admins = await listAdmins();
    res.json(admins);
  } catch (err) {
    next(err);
  }
});

adminAdvancedRouter.post('/admins/add', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    const { totpCode, email } = req.body;

    const validTotp = await verifyDangerousTotp(admin.id, totpCode);
    if (!validTotp) {
      return res.status(400).json({ error: 'Mã xác thực TOTP không chính xác' });
    }

    const targetEmail = String(email || '').trim().toLowerCase();
    const targetUser = await getUserByEmail(targetEmail);
    if (!targetUser) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng với email này' });
    }

    if (targetUser.role === 'admin') {
      return res.status(400).json({ error: 'Người dùng này đã là quản trị viên' });
    }

    await updateUserRole(targetUser.id, 'admin');
    await logAdminAudit(admin.id, 'ADD_ADMIN', targetUser.id, { email: targetEmail, username: targetUser.username }, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminAdvancedRouter.post('/admins/remove', async (req, res, next) => {
  try {
    const admin = req.adminUser!;
    const { totpCode, adminId } = req.body;

    const validTotp = await verifyDangerousTotp(admin.id, totpCode);
    if (!validTotp) {
      return res.status(400).json({ error: 'Mã xác thực TOTP không chính xác' });
    }

    const adminCount = await countActiveAdmins();
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Không thể gỡ quyền quản trị viên cuối cùng của hệ thống' });
    }

    const targetUser = await getUserById(adminId);
    if (!targetUser || targetUser.role !== 'admin') {
      return res.status(404).json({ error: 'Quản trị viên không tồn tại' });
    }

    await updateUserRole(targetUser.id, 'user');
    await logAdminAudit(admin.id, 'REMOVE_ADMIN', targetUser.id, { username: targetUser.username }, req);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminAdvancedRouter.get('/audit-logs', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const data = await listAdminAuditLogs(limit, offset);
    res.json({
      rows: data.rows,
      total: data.total,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
});
