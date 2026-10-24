import { nanoid } from 'nanoid';
import { pool } from '../db/database.js';
import { env } from '../config/env.js';
import { lockUser, getUserById } from '../repositories/userRepository.js';
import { createNotification } from '../repositories/notificationRepository.js';
import { logToDiscord } from './discordService.js';

export async function flagAndCheckAnomaly(userId: string): Promise<void> {
  const { rows } = await pool.query<{ c: string }>(
    `SELECT COUNT(*) AS c FROM task_attempts
     WHERE user_id = $1 AND status = 'completed'
       AND completed_at >= now() - interval '${env.security.anomalyWindowMinutes} minutes'`,
    [userId]
  );
  const recentCount = Number(rows[0].c);

  if (recentCount >= env.security.anomalyTaskCountThreshold) {
    const user = await getUserById(userId);
    if (user?.locked) return;

    await lockUser(userId);
    await pool.query('INSERT INTO security_flags (id, user_id, reason) VALUES ($1, $2, $3)', [
      nanoid(),
      userId,
      `Hoàn thành ${recentCount} nhiệm vụ trong ${env.security.anomalyWindowMinutes} phút`,
    ]);
    await createNotification(
      nanoid(),
      userId,
      'Tài khoản của bạn đã bị tạm khóa do phát hiện hoạt động bất thường. Vui lòng liên hệ hỗ trợ.',
      '/support'
    );
    logToDiscord(`[Canh bao] Tu dong khoa tai khoan **${user?.username}** — hoan thanh ${recentCount} nhiem vu trong ${env.security.anomalyWindowMinutes} phut`);
  }
}
