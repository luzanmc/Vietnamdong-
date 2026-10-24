import { Router } from 'express';
import crypto from 'node:crypto';
import { nanoid } from 'nanoid';
import { env } from '../config/env.js';
import { pool } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { requireEmailVerified } from '../middleware/requireEmailVerified.js';
import { requireNotLocked } from '../middleware/requireNotLocked.js';
import { requireNoVpn } from '../middleware/requireNoVpn.js';
import { validateBody } from '../middleware/validate.js';
import { withdrawSchema, transferSchema } from '../validators/wallet.validators.js';
import { debit, credit, novaToVnd } from '../services/coinService.js';
import {
  getLedgerForUser,
  getFilteredLedgerForUser,
  createWithdrawal,
  listWithdrawalsForUser,
  createTransferRecord,
  listPayoutAccountsForUser,
  getPayoutAccountById,
  countUserPayoutAccounts,
  removePayoutAccount,
  getUserTotalWithdrawn24h,
} from '../repositories/walletRepository.js';
import { getUserByUsername } from '../repositories/userRepository.js';
import { getSetting } from '../repositories/settingsRepository.js';
import { sendAlert } from '../services/discordService.js';
import { createNotification } from '../repositories/notificationRepository.js';
import { auditService } from '../services/auditService.js';
import { getTotp } from '../repositories/totpRepository.js';
import { verifyTotpCode } from '../utils/totp.js';
import { verifyAndUseRecoveryCode } from '../services/totpRecoveryService.js';
import { encryptAccountNumber, extractLast4 } from '../utils/payoutCrypto.js';
import { scoreWithdrawal } from '../services/riskService.js';
import { recordDeviceLink } from '../services/deviceLinkService.js';
import { getClientIp, getClientCountry } from '../utils/ip.js';
import {
  sendPayoutAccountConfirmEmail,
  sendPayoutAccountConfirmedEmail,
  sendPayoutAccountRemovedEmail,
  sendWithdrawalOtpEmail,
} from '../services/mailService.js';
import type { User, WithdrawMethod, PayoutAccount } from '../types/index.js';

export const walletRouter = Router();

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

async function computeUserTierLimit(user: User): Promise<{
  tier: 'new' | 'basic' | '2fa';
  tierLabel: string;
  dailyLimit: number;
  totalWithdrawn24h: number;
  remainingLimit: number;
  limit2fa: number;
}> {
  const accountAgeDays = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24);
  const isNew = accountAgeDays < 7 || user.email_verified !== 1;
  const totp = await getTotp(user.id);
  const has2fa = totp?.enabled === 1;

  const tier: 'new' | 'basic' | '2fa' = isNew ? 'new' : has2fa ? '2fa' : 'basic';
  const tierLabel = isNew ? 'Tài khoản mới' : has2fa ? 'Đã kích hoạt 2FA' : 'Tài khoản thường';

  const limitNew = Number((await getSetting('withdraw_daily_limit_new')) || 500000);
  const limitBasic = Number((await getSetting('withdraw_daily_limit_basic')) || 2000000);
  const limit2fa = Number((await getSetting('withdraw_daily_limit_2fa')) || 10000000);

  const dailyLimit = tier === 'new' ? limitNew : tier === 'basic' ? limitBasic : limit2fa;
  const totalWithdrawn24h = await getUserTotalWithdrawn24h(user.id);
  const remainingLimit = Math.max(0, dailyLimit - totalWithdrawn24h);

  return {
    tier,
    tierLabel,
    dailyLimit,
    totalWithdrawn24h,
    remainingLimit,
    limit2fa,
  };
}

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

walletRouter.get('/ledger/filtered', requireAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const result = await getFilteredLedgerForUser(req.user!.id, {
      reason: req.query.reason ? String(req.query.reason) : undefined,
      from: req.query.from ? String(req.query.from) : undefined,
      to: req.query.to ? String(req.query.to) : undefined,
      page,
      pageSize,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

walletRouter.get('/tier-limit', requireAuth, async (req, res, next) => {
  try {
    const tierInfo = await computeUserTierLimit(req.user!);
    res.json(tierInfo);
  } catch (err) {
    next(err);
  }
});

walletRouter.get('/payout-accounts', requireAuth, async (req, res, next) => {
  try {
    const accounts = await listPayoutAccountsForUser(req.user!.id);
    res.json({ accounts });
  } catch (err) {
    next(err);
  }
});

walletRouter.post('/payout-accounts', requireAuth, async (req, res, next) => {
  try {
    const currentCount = await countUserPayoutAccounts(req.user!.id);
    if (currentCount >= 5) {
      return res.status(400).json({ error: 'Mỗi tài khoản chỉ được liên kết tối đa 5 tài khoản nhận tiền.' });
    }

    const type = req.body.type === 'ewallet' ? 'ewallet' : 'bank';
    const bankName = String(req.body.bank_name || '').trim();
    const accountName = String(req.body.account_name || '').trim().toUpperCase();
    const accountNumberRaw = String(req.body.account_number || '').trim().replace(/\s+/g, '');
    const totpCode = String(req.body.totpCode || '').trim();
    const otpCode = String(req.body.otpCode || '').trim();

    if (!bankName) return res.status(400).json({ error: 'Vui lòng chọn hoặc nhập tên ngân hàng/ví.' });
    if (!accountName) return res.status(400).json({ error: 'Vui lòng nhập tên chủ tài khoản.' });
    if (!accountNumberRaw || accountNumberRaw.length < 4) {
      return res.status(400).json({ error: 'Số tài khoản hoặc số điện thoại không hợp lệ (tối thiểu 4 ký tự).' });
    }

    const last4 = extractLast4(accountNumberRaw);
    const enc = encryptAccountNumber(accountNumberRaw);
    const accountId = nanoid();

    let initialStatus: 'pending_email' | 'waiting' = 'pending_email';
    let emailConfirmedAt: Date | null = null;
    let activeFrom: Date | null = null;

    const hasVerifiedEmail = req.user!.email && req.user!.email_verified === 1;

    let confirmedImmediately = false;

    if (totpCode) {
      const totp = await getTotp(req.user!.id);
      if (totp && totp.enabled === 1 && verifyTotpCode(totp.secret, totpCode)) {
        confirmedImmediately = true;
      }
    } else if (otpCode && hasVerifiedEmail) {
      const inputHash = crypto.createHash('sha256').update(`${otpCode}:${env.jwtSecret}`).digest('hex');
      const otpRes = await pool.query<{ id: string }>(
        `SELECT id FROM email_auth_codes
         WHERE user_id = $1 AND code_hash = $2 AND purpose = 'payout_account_confirm' AND expires_at > now()`,
        [req.user!.id, inputHash]
      );
      if (otpRes.rows.length > 0) {
        confirmedImmediately = true;
        await pool.query('DELETE FROM email_auth_codes WHERE id = $1', [otpRes.rows[0].id]);
      }
    }

    if (!hasVerifiedEmail && !confirmedImmediately) {
      const totp = await getTotp(req.user!.id);
      if (totp?.enabled === 1) {
        return res.status(400).json({
          requires2fa: true,
          error: 'Tài khoản chưa xác minh email. Vui lòng nhập mã Google Authenticator (2FA) để xác nhận tài khoản nhận tiền.',
        });
      } else {
        return res.status(400).json({
          error: 'Tài khoản cần xác minh email hoặc kích hoạt 2FA để thêm tài khoản nhận tiền an toàn.',
        });
      }
    }

    if (confirmedImmediately) {
      initialStatus = 'waiting';
      emailConfirmedAt = new Date();
      activeFrom = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    await pool.query(
      `INSERT INTO payout_accounts (id, user_id, type, bank_name, account_name, account_number_enc, last4, status, created_at, email_confirmed_at, active_from)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), $9, $10)`,
      [accountId, req.user!.id, type, bankName, accountName, enc, last4, initialStatus, emailConfirmedAt, activeFrom]
    );

    void auditService.record(req.user!.id, 'ADD_PAYOUT_ACCOUNT', accountId, {
      type,
      bankName,
      last4,
      status: initialStatus,
    });

    if (confirmedImmediately) {
      const timeStr = activeFrom!.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      void createNotification(
        nanoid(),
        req.user!.id,
        `Tài khoản nhận tiền ${bankName} (***${last4}) đã được xác nhận và sẽ sẵn sàng sử dụng vào lúc ${timeStr}.`,
        '/wallet'
      );
      if (req.user!.email && env.mail.host) {
        sendPayoutAccountConfirmedEmail(req.user!.email, {
          bankName,
          last4,
          activeFromFormatted: timeStr,
        }).catch(() => {});
      }

      return res.json({
        ok: true,
        id: accountId,
        status: initialStatus,
        message: `Đã xác nhận tài khoản nhận tiền thành công. Theo chính sách an toàn, tài khoản sẽ sẵn sàng sử dụng sau 24 giờ (${timeStr}).`,
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO payout_account_confirmations (id, payout_account_id, user_id, token_hash, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [nanoid(), accountId, req.user!.id, tokenHash, expiresAt]
    );

    const confirmUrl = `${env.clientUrl}/wallet?confirm_payout=${rawToken}&payout_id=${accountId}`;
    if (req.user!.email && env.mail.host) {
      sendPayoutAccountConfirmEmail(req.user!.email, {
        bankName,
        last4,
        confirmUrl,
      }).catch(() => {});
    }

    void createNotification(
      nanoid(),
      req.user!.id,
      `Tài khoản nhận tiền ${bankName} (***${last4}) đang chờ xác nhận qua email của bạn.`,
      '/wallet'
    );

    res.json({
      ok: true,
      id: accountId,
      status: initialStatus,
      message: 'Đã gửi liên kết xác nhận tới hòm thư của bạn. Vui lòng xác nhận trong vòng 24 giờ.',
    });
  } catch (err) {
    next(err);
  }
});

walletRouter.post('/payout-accounts/:id/confirm', requireAuth, async (req, res, next) => {
  try {
    const accountId = req.params.id;
    const token = String(req.body.token || '').trim();
    const totpCode = String(req.body.totpCode || '').trim();

    const acc = await getPayoutAccountById(accountId, req.user!.id);
    if (!acc) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản nhận tiền' });
    }

    if (acc.status === 'active' || (acc.status === 'waiting' && acc.active_from && new Date(acc.active_from).getTime() <= Date.now())) {
      return res.json({ ok: true, message: 'Tài khoản nhận tiền này đã sẵn sàng sử dụng.' });
    }

    let isValid = false;

    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const { rows } = await pool.query<{ id: string }>(
        `SELECT id FROM payout_account_confirmations
         WHERE payout_account_id = $1 AND token_hash = $2 AND used_at IS NULL AND expires_at > now()`,
        [accountId, tokenHash]
      );
      if (rows.length > 0) {
        isValid = true;
        await pool.query('UPDATE payout_account_confirmations SET used_at = now() WHERE id = $1', [rows[0].id]);
      }
    } else if (totpCode) {
      const totp = await getTotp(req.user!.id);
      if (totp && totp.enabled === 1 && verifyTotpCode(totp.secret, totpCode)) {
        isValid = true;
      }
    }

    if (!isValid) {
      return res.status(400).json({ error: 'Mã xác nhận hoặc liên kết không hợp lệ hoặc đã hết hạn.' });
    }

    const activeFrom = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await pool.query(
      `UPDATE payout_accounts
       SET status = 'waiting', email_confirmed_at = now(), active_from = $1
       WHERE id = $2`,
      [activeFrom, accountId]
    );

    const timeStr = activeFrom.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    void createNotification(
      nanoid(),
      req.user!.id,
      `Tài khoản nhận tiền ${acc.bank_name} (***${acc.last4}) đã được xác nhận. Tài khoản sẽ sẵn sàng vào lúc ${timeStr}.`,
      '/wallet'
    );

    if (req.user!.email && env.mail.host) {
      sendPayoutAccountConfirmedEmail(req.user!.email, {
        bankName: acc.bank_name,
        last4: acc.last4,
        activeFromFormatted: timeStr,
      }).catch(() => {});
    }

    void auditService.record(req.user!.id, 'CONFIRM_PAYOUT_ACCOUNT', accountId);

    res.json({
      ok: true,
      message: `Đã xác nhận tài khoản nhận tiền thành công. Bạn có thể sử dụng để rút tiền sau 24 giờ (${timeStr}).`,
    });
  } catch (err) {
    next(err);
  }
});

walletRouter.delete('/payout-accounts/:id', requireAuth, async (req, res, next) => {
  try {
    const accountId = req.params.id;
    const acc = await getPayoutAccountById(accountId, req.user!.id);
    if (!acc) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản nhận tiền' });
    }

    await removePayoutAccount(accountId, req.user!.id);

    void createNotification(
      nanoid(),
      req.user!.id,
      `Tài khoản nhận tiền ${acc.bank_name} (***${acc.last4}) đã được gỡ khỏi danh sách tài khoản của bạn.`,
      '/wallet'
    );

    if (req.user!.email && env.mail.host) {
      sendPayoutAccountRemovedEmail(req.user!.email, {
        bankName: acc.bank_name,
        last4: acc.last4,
      }).catch(() => {});
    }

    void auditService.record(req.user!.id, 'REMOVE_PAYOUT_ACCOUNT', accountId);

    res.json({ ok: true, message: 'Đã xóa tài khoản nhận tiền thành công.' });
  } catch (err) {
    next(err);
  }
});

walletRouter.post(
  '/withdraw/init',
  requireAuth,
  requireNotLocked,
  requireNoVpn,
  requireEmailVerified,
  async (req, res, next) => {
    try {
      if (req.user!.withdraw_locked_until && new Date(req.user!.withdraw_locked_until).getTime() > Date.now()) {
        return res.status(403).json({
          error: `Tính năng rút tiền đang bị tạm khóa đến ${new Date(req.user!.withdraw_locked_until).toLocaleString('vi-VN')} để bảo vệ an toàn tài khoản.`,
        });
      }

      if (req.user!.deletion_requested_at) {
        return res.status(403).json({ error: 'Tài khoản đang trong thời gian chờ xóa, không thể thực hiện rút tiền.' });
      }

      const deviceFp = req.headers['x-device-id'] as string | undefined;
      recordDeviceLink(req.user!.id, deviceFp, req.ip || '').catch(() => {});

      const amountNova = Number(req.body.amount_nova);
      const payoutAccountId = String(req.body.payout_account_id || '').trim();

      if (!amountNova || amountNova <= 0) {
        return res.status(400).json({ error: 'Số tiền VNC rút không hợp lệ.' });
      }
      if (amountNova < env.economy.minWithdrawNova) {
        return res.status(400).json({ error: `Số VNC rút tối thiểu là ${env.economy.minWithdrawNova}` });
      }
      if (req.user!.balance_nova < amountNova) {
        return res.status(400).json({ error: 'Số dư VNC không đủ để thực hiện yêu cầu.' });
      }

      const payoutAcc = await getPayoutAccountById(payoutAccountId, req.user!.id);
      if (!payoutAcc || payoutAcc.status === 'removed') {
        return res.status(400).json({ error: 'Vui lòng chọn một tài khoản nhận tiền hợp lệ từ danh sách tin cậy.' });
      }

      const isAccountActive =
        payoutAcc.status === 'active' ||
        (payoutAcc.status === 'waiting' && payoutAcc.active_from && new Date(payoutAcc.active_from).getTime() <= Date.now());

      if (!isAccountActive) {
        if (payoutAcc.status === 'pending_email') {
          return res.status(400).json({ error: 'Tài khoản nhận tiền này đang chờ xác nhận qua email.' });
        }
        const hoursLeft = Math.max(1, Math.ceil((new Date(payoutAcc.active_from!).getTime() - Date.now()) / (1000 * 60 * 60)));
        return res.status(400).json({
          error: `Tài khoản nhận tiền này đang trong thời gian bảo vệ an toàn. Còn ${hoursLeft} giờ nữa mới dùng được để rút tiền.`,
        });
      }

      const tierInfo = await computeUserTierLimit(req.user!);
      if (tierInfo.totalWithdrawn24h + amountNova > tierInfo.dailyLimit) {
        const remainingStr = tierInfo.remainingLimit.toLocaleString('vi-VN');
        const advice = tierInfo.tier !== '2fa' ? ` Bật 2FA để nâng hạn mức rút lên ${tierInfo.limit2fa.toLocaleString('vi-VN')} VNC/ngày.` : '';
        return res.status(400).json({
          error: `Yêu cầu vượt quá hạn mức rút tiền trong ngày (${tierInfo.dailyLimit.toLocaleString('vi-VN')} VNC). Bạn còn lại ${remainingStr} VNC có thể rút hôm nay.${advice}`,
        });
      }

      const amountVnd = novaToVnd(amountNova, env.economy.novaToVnd);
      const destination = `${payoutAcc.bank_name} | STK: ***${payoutAcc.last4} | Chủ TK: ${payoutAcc.account_name}`;

      const totp = await getTotp(req.user!.id);
      const requires2fa = totp?.enabled === 1;

      let codeHash: string | null = null;
      let emailOtpCode: string | null = null;

      if (!requires2fa) {
        emailOtpCode = String(crypto.randomInt(100000, 1000000));
        codeHash = crypto.createHash('sha256').update(`${emailOtpCode}:${env.jwtSecret}`).digest('hex');
      }

      const challengeId = nanoid();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await pool.query(
        `INSERT INTO withdraw_challenges (id, user_id, payout_account_id, amount_nova, amount_vnd, method, destination, code_hash, requires_2fa, attempts, max_attempts, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 5, $10, now())`,
        [challengeId, req.user!.id, payoutAcc.id, amountNova, amountVnd, payoutAcc.type, destination, codeHash, requires2fa, expiresAt]
      );

      if (!requires2fa && emailOtpCode && req.user!.email && env.mail.host) {
        sendWithdrawalOtpEmail(req.user!.email, {
          code: emailOtpCode,
          amountNova,
          amountVnd,
          destination,
        }).catch(() => {});
      }

      res.json({
        requiresConfirmation: true,
        challengeId,
        method: requires2fa ? 'totp' : 'email_otp',
        emailMasked: maskEmail(req.user!.email || ''),
        amountNova,
        amountVnd,
        message: requires2fa
          ? 'Vui lòng nhập mã Google Authenticator (2FA) để xác nhận hoàn tất lệnh rút tiền.'
          : 'Mã xác nhận 6 số đã được gửi tới email của bạn. Vui lòng nhập mã để hoàn tất lệnh rút.',
      });
    } catch (err) {
      next(err);
    }
  }
);

walletRouter.post(
  '/withdraw/confirm',
  requireAuth,
  requireNotLocked,
  requireNoVpn,
  requireEmailVerified,
  async (req, res, next) => {
    try {
      if (req.user!.withdraw_locked_until && new Date(req.user!.withdraw_locked_until).getTime() > Date.now()) {
        return res.status(403).json({
          error: `Tính năng rút tiền đang bị tạm khóa đến ${new Date(req.user!.withdraw_locked_until).toLocaleString('vi-VN')} để bảo vệ an toàn tài khoản.`,
        });
      }

      if (req.user!.deletion_requested_at) {
        return res.status(403).json({ error: 'Tài khoản đang trong thời gian chờ xóa, không thể thực hiện rút tiền.' });
      }

      const deviceFp = req.headers['x-device-id'] as string | undefined;
      recordDeviceLink(req.user!.id, deviceFp, req.ip || '').catch(() => {});

      const challengeId = String(req.body.challengeId || '').trim();
      const code = String(req.body.code || '').trim();

      if (!challengeId || !code) {
        return res.status(400).json({ error: 'Vui lòng cung cấp mã thử thách và mã xác thực.' });
      }

      const { rows: challengeRows } = await pool.query<{
        id: string;
        user_id: string;
        payout_account_id: string;
        amount_nova: string;
        amount_vnd: string;
        method: string;
        destination: string;
        code_hash: string | null;
        requires_2fa: boolean;
        attempts: number;
        max_attempts: number;
        created_at: string;
      }>(
        `SELECT * FROM withdraw_challenges
         WHERE id = $1 AND user_id = $2 AND used_at IS NULL AND expires_at > now()`,
        [challengeId, req.user!.id]
      );

      if (challengeRows.length === 0) {
        return res.status(400).json({ error: 'Yêu cầu xác nhận rút tiền không tồn tại hoặc đã hết hạn (10 phút).' });
      }

      const challenge = challengeRows[0];
      if (challenge.attempts >= challenge.max_attempts) {
        return res.status(429).json({ error: 'Bạn đã nhập sai mã xác nhận quá 5 lần. Vui lòng tạo lại yêu cầu rút tiền mới.' });
      }

      let codeValid = false;
      if (challenge.requires_2fa) {
        const totp = await getTotp(req.user!.id);
        if (totp && totp.enabled === 1) {
          const cleanCode = code.toUpperCase().replace(/\s+/g, '');
          if (/^\d{6}$/.test(cleanCode) && verifyTotpCode(totp.secret, cleanCode)) {
            codeValid = true;
          } else {
            const recRes = await verifyAndUseRecoveryCode(req.user!.id, cleanCode);
            if (recRes.ok) codeValid = true;
          }
        }
      } else if (challenge.code_hash) {
        const inputHash = crypto.createHash('sha256').update(`${code}:${env.jwtSecret}`).digest('hex');
        if (inputHash === challenge.code_hash) {
          codeValid = true;
        }
      }

      if (!codeValid) {
        await pool.query('UPDATE withdraw_challenges SET attempts = attempts + 1 WHERE id = $1', [challenge.id]);
        return res.status(401).json({ error: 'Mã xác nhận không chính xác.' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        await client.query('SELECT id, balance_nova FROM users WHERE id = $1 FOR UPDATE', [req.user!.id]);

        const amtNova = Number(challenge.amount_nova);
        const { rows: uRows } = await client.query<{ balance_nova: number }>(
          'SELECT balance_nova FROM users WHERE id = $1',
          [req.user!.id]
        );
        const currentBalance = Number(uRows[0]?.balance_nova || 0);
        if (currentBalance < amtNova) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Số dư VNC không đủ để thực hiện yêu cầu.' });
        }

        const tierInfo = await computeUserTierLimit(req.user!);
        const { rows: limitRows } = await client.query<{ total: string }>(
          `SELECT COALESCE(SUM(amount_nova), 0) AS total
           FROM withdrawals
           WHERE user_id = $1
             AND status IN ('pending', 'paid', 'approved', 'completed')
             AND created_at >= now() - interval '24 hours'`,
          [req.user!.id]
        );
        const totalWithdrawnNow = Number(limitRows[0]?.total || 0);
        if (totalWithdrawnNow + amtNova > tierInfo.dailyLimit) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: `Đã vượt quá hạn mức rút tiền trong ngày (${tierInfo.dailyLimit.toLocaleString('vi-VN')} VNC). Đã rút: ${totalWithdrawnNow.toLocaleString('vi-VN')} VNC.`,
          });
        }

        const payoutAcc = await getPayoutAccountById(challenge.payout_account_id, req.user!.id, client);
        if (!payoutAcc || payoutAcc.status === 'removed') {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Tài khoản nhận tiền không hợp lệ.' });
        }

        const isAccountActive =
          payoutAcc.status === 'active' ||
          (payoutAcc.status === 'waiting' && payoutAcc.active_from && new Date(payoutAcc.active_from).getTime() <= Date.now());
        if (!isAccountActive) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Tài khoản nhận tiền chưa đủ điều kiện hoạt động.' });
        }

        await client.query('UPDATE withdraw_challenges SET used_at = now() WHERE id = $1', [challenge.id]);

        const riskResult = await scoreWithdrawal(
          req.user!,
          amtNova,
          payoutAcc,
          {
            ip: getClientIp(req),
            userAgent: req.headers['user-agent'],
            country: getClientCountry(req),
          }
        );

        const withdrawalId = nanoid();
        await debit(req.user!.id, amtNova, 'withdraw', withdrawalId, client);

        await createWithdrawal(
          withdrawalId,
          req.user!.id,
          amtNova,
          Number(challenge.amount_vnd),
          challenge.method as WithdrawMethod,
          challenge.destination,
          riskResult.score,
          riskResult.reasons,
          riskResult.needsReview,
          payoutAcc.id,
          client
        );

        await client.query('COMMIT');

        const thresholdSetting = await getSetting('alert_withdraw_threshold');
        const threshold = Number(thresholdSetting || 500000);
        const enabledSetting = await getSetting('alert_withdraw_enabled');
        const alertEnabled = enabledSetting !== 'false' && enabledSetting !== '0';

        if ((Number(challenge.amount_vnd) >= threshold && alertEnabled) || riskResult.needsReview) {
          const reasonText = riskResult.reasons.length > 0 ? riskResult.reasons.join(', ') : 'Không có';
          sendAlert(
            riskResult.needsReview ? 'security_alert' : 'withdraw_large',
            riskResult.needsReview ? 'Cảnh báo lệnh rút tiền có rủi ro cao (Cần xem kỹ)' : 'Cảnh báo yêu cầu rút tiền lớn',
            [
              { name: 'Người dùng', value: `${req.user!.username} (${req.user!.id})`, inline: true },
              { name: 'Số tiền VNC', value: `${amtNova.toLocaleString('vi-VN')} VNC`, inline: true },
              { name: 'Số tiền VNĐ', value: `${Number(challenge.amount_vnd).toLocaleString('vi-VN')} VNĐ`, inline: true },
              { name: 'Tài khoản nhận', value: challenge.destination, inline: true },
              { name: 'Điểm rủi ro', value: `${riskResult.score} điểm (${riskResult.needsReview ? 'Cần xem kỹ' : 'Bình thường'})`, inline: true },
              { name: 'Lý do rủi ro', value: reasonText, inline: false },
              { name: 'Duyệt trong Admin', value: `${env.clientUrl}/admin`, inline: false },
            ],
            req.user!.id,
            riskResult.needsReview ? 'danger' : 'warning'
          ).catch(() => {});
        }

        void auditService.record(req.user!.id, 'CREATE_WITHDRAWAL_CONFIRMED', withdrawalId, {
          amountNova: amtNova,
          riskScore: riskResult.score,
        });

        const transferCode = `VNC-RUT-${withdrawalId.slice(0, 8).toUpperCase()}`;
        res.json({ ok: true, id: withdrawalId, status: 'pending', transfer_code: transferCode });
      } catch (txErr) {
        await client.query('ROLLBACK');
        throw txErr;
      } finally {
        client.release();
      }
    } catch (err) {
      next(err);
    }
  }
);

walletRouter.post(
  '/withdraw',
  requireAuth,
  requireNotLocked,
  requireNoVpn,
  requireEmailVerified,
  validateBody(withdrawSchema),
  async (req, res, next) => {
    try {
      if (req.user!.withdraw_locked_until && new Date(req.user!.withdraw_locked_until).getTime() > Date.now()) {
        return res.status(403).json({
          error: `Tính năng rút tiền đang bị tạm khóa đến ${new Date(req.user!.withdraw_locked_until).toLocaleString('vi-VN')} để bảo vệ an toàn tài khoản.`,
        });
      }

      if (req.user!.deletion_requested_at) {
        return res.status(403).json({ error: 'Tài khoản đang trong thời gian chờ xóa, không thể thực hiện rút tiền.' });
      }

      const deviceFp = req.headers['x-device-id'] as string | undefined;
      recordDeviceLink(req.user!.id, deviceFp, req.ip || '').catch(() => {});

      const { amount_nova, method, destination, payout_account_id } = req.body as {
        amount_nova: number;
        method: WithdrawMethod;
        destination: string;
        payout_account_id?: string;
      };

      if (amount_nova < env.economy.minWithdrawNova) {
        return res.status(400).json({ error: `Số VNC rút tối thiểu là ${env.economy.minWithdrawNova}` });
      }

      const otpThresholdSetting = await getSetting('withdraw_otp_threshold');
      const otpThreshold = Number(otpThresholdSetting || 500000);

      if (amount_nova >= otpThreshold) {
        return res.status(400).json({
          requiresConfirmation: true,
          requiresInit: true,
          error: `Số tiền rút từ ${otpThreshold.toLocaleString('vi-VN')} VNC trở lên yêu cầu xác nhận 2 bước bằng mã OTP/2FA. Vui lòng thử lại qua bước xác thực.`,
        });
      }

      let payoutAcc: PayoutAccount | null = null;
      if (payout_account_id) {
        payoutAcc = await getPayoutAccountById(payout_account_id, req.user!.id);
      } else {
        const userAccounts = await listPayoutAccountsForUser(req.user!.id);
        const activeAccounts = userAccounts.filter((a) => a.isActive);
        if (activeAccounts.length > 0) {
          payoutAcc = (await getPayoutAccountById(activeAccounts[0].id, req.user!.id))!;
        }
      }

      if (payoutAcc) {
        const isAccountActive =
          payoutAcc.status === 'active' ||
          (payoutAcc.status === 'waiting' && payoutAcc.active_from && new Date(payoutAcc.active_from).getTime() <= Date.now());
        if (!isAccountActive) {
          if (payoutAcc.status === 'pending_email') {
            return res.status(400).json({ error: 'Tài khoản nhận tiền này đang chờ xác nhận qua email.' });
          }
          const hoursLeft = Math.max(1, Math.ceil((new Date(payoutAcc.active_from!).getTime() - Date.now()) / (1000 * 60 * 60)));
          return res.status(400).json({
            error: `Tài khoản nhận tiền này đang trong thời gian bảo vệ an toàn. Còn ${hoursLeft} giờ nữa mới dùng được để rút tiền.`,
          });
        }
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        await client.query('SELECT id, balance_nova FROM users WHERE id = $1 FOR UPDATE', [req.user!.id]);

        const { rows: uRows } = await client.query<{ balance_nova: number }>(
          'SELECT balance_nova FROM users WHERE id = $1',
          [req.user!.id]
        );
        const currentBalance = Number(uRows[0]?.balance_nova || 0);
        if (currentBalance < amount_nova) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Số dư VNC không đủ để thực hiện yêu cầu.' });
        }

        const tierInfo = await computeUserTierLimit(req.user!);
        const { rows: limitRows } = await client.query<{ total: string }>(
          `SELECT COALESCE(SUM(amount_nova), 0) AS total
           FROM withdrawals
           WHERE user_id = $1
             AND status IN ('pending', 'paid', 'approved', 'completed')
             AND created_at >= now() - interval '24 hours'`,
          [req.user!.id]
        );
        const totalWithdrawnNow = Number(limitRows[0]?.total || 0);
        if (totalWithdrawnNow + amount_nova > tierInfo.dailyLimit) {
          await client.query('ROLLBACK');
          const advice = tierInfo.tier !== '2fa' ? ` Bật 2FA để nâng hạn mức rút lên ${tierInfo.limit2fa.toLocaleString('vi-VN')} VNC/ngày.` : '';
          return res.status(400).json({
            error: `Đã vượt quá hạn mức rút tiền trong ngày (${tierInfo.dailyLimit.toLocaleString('vi-VN')} VNC). Bạn còn lại ${(Math.max(0, tierInfo.dailyLimit - totalWithdrawnNow)).toLocaleString('vi-VN')} VNC.${advice}`,
          });
        }

        const effectiveDest = payoutAcc
          ? `${payoutAcc.bank_name} | STK: ***${payoutAcc.last4} | Chủ TK: ${payoutAcc.account_name}`
          : destination;

        const riskResult = await scoreWithdrawal(
          req.user!,
          amount_nova,
          payoutAcc || { created_at: req.user!.created_at },
          {
            ip: getClientIp(req),
            userAgent: req.headers['user-agent'],
            country: getClientCountry(req),
          }
        );

        const withdrawalId = nanoid();
        const amountVnd = novaToVnd(amount_nova, env.economy.novaToVnd);

        await debit(req.user!.id, amount_nova, 'withdraw', withdrawalId, client);

        await createWithdrawal(
          withdrawalId,
          req.user!.id,
          amount_nova,
          amountVnd,
          method,
          effectiveDest,
          riskResult.score,
          riskResult.reasons,
          riskResult.needsReview,
          payoutAcc?.id || null,
          client
        );

        await client.query('COMMIT');

        const thresholdSetting = await getSetting('alert_withdraw_threshold');
        const threshold = Number(thresholdSetting || 500000);
        const enabledSetting = await getSetting('alert_withdraw_enabled');
        const alertEnabled = enabledSetting !== 'false' && enabledSetting !== '0';

        if ((amountVnd >= threshold && alertEnabled) || riskResult.needsReview) {
          const reasonText = riskResult.reasons.length > 0 ? riskResult.reasons.join(', ') : 'Không có';
          sendAlert(
            riskResult.needsReview ? 'security_alert' : 'withdraw_large',
            riskResult.needsReview ? 'Cảnh báo lệnh rút tiền có rủi ro cao (Cần xem kỹ)' : 'Cảnh báo yêu cầu rút tiền lớn',
            [
              { name: 'Người dùng', value: `${req.user!.username} (${req.user!.id})`, inline: true },
              { name: 'Số tiền VNC', value: `${amount_nova.toLocaleString('vi-VN')} VNC`, inline: true },
              { name: 'Số tiền VNĐ', value: `${amountVnd.toLocaleString('vi-VN')} VNĐ`, inline: true },
              { name: 'Phương thức', value: method, inline: true },
              { name: 'Tài khoản nhận', value: effectiveDest, inline: true },
              { name: 'Điểm rủi ro', value: `${riskResult.score} điểm (${riskResult.needsReview ? 'Cần xem kỹ' : 'Bình thường'})`, inline: true },
              { name: 'Lý do rủi ro', value: reasonText, inline: false },
              { name: 'Duyệt trong Admin', value: `${env.clientUrl}/admin`, inline: false },
            ],
            req.user!.id,
            riskResult.needsReview ? 'danger' : 'warning'
          ).catch(() => {});
        }

        void auditService.record(req.user!.id, 'CREATE_WITHDRAWAL', withdrawalId, {
          amount_nova,
          riskScore: riskResult.score,
        });

        const transferCode = `VNC-RUT-${withdrawalId.slice(0, 8).toUpperCase()}`;
        res.json({ ok: true, id: withdrawalId, status: 'pending', transfer_code: transferCode });
      } catch (txErr) {
        await client.query('ROLLBACK');
        throw txErr;
      } finally {
        client.release();
      }
    } catch (err) {
      next(err);
    }
  }
);

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
