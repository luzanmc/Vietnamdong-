import { pool, type Queryable } from '../db/database.js';
import type { Task, TaskAttempt } from '../types/index.js';

export async function listActiveTasks(client: Queryable = pool): Promise<Task[]> {
  const { rows } = await client.query('SELECT * FROM tasks WHERE active = 1 ORDER BY sort_order');
  return rows;
}

export async function getTaskById(id: string, client: Queryable = pool): Promise<Task | undefined> {
  const { rows } = await client.query('SELECT * FROM tasks WHERE id = $1 AND active = 1', [id]);
  return rows[0];
}

export async function getAnyTaskById(id: string, client: Queryable = pool): Promise<Task | undefined> {
  const { rows } = await client.query('SELECT * FROM tasks WHERE id = $1', [id]);
  return rows[0];
}

export async function countCompletedAttemptsToday(taskId: string, userId: string, client: Queryable = pool): Promise<number> {
  const { rows } = await client.query(
    `SELECT COUNT(*) AS c FROM task_attempts
     WHERE task_id = $1 AND user_id = $2 AND status = 'completed'
       AND created_at::date = CURRENT_DATE`,
    [taskId, userId]
  );
  return Number(rows[0].c);
}

export async function createAttempt(
  id: string,
  taskId: string,
  userId: string,
  token: string,
  shortUrl: string,
  client: Queryable = pool
): Promise<void> {
  await client.query('INSERT INTO task_attempts (id, task_id, user_id, token, short_url) VALUES ($1, $2, $3, $4, $5)', [
    id,
    taskId,
    userId,
    token,
    shortUrl,
  ]);
}

export async function getAttemptByToken(
  token: string,
  client: Queryable = pool
): Promise<(TaskAttempt & { task_name: string; reward_nova: number }) | undefined> {
  const { rows } = await client.query(
    `SELECT ta.*, t.name AS task_name, t.reward_nova FROM task_attempts ta
     JOIN tasks t ON t.id = ta.task_id
     WHERE ta.token = $1`,
    [token]
  );
  return rows[0];
}

export async function getPendingAttemptByToken(token: string, client: Queryable = pool): Promise<TaskAttempt | undefined> {
  const { rows } = await client.query(`SELECT * FROM task_attempts WHERE token = $1 AND status = 'pending'`, [token]);
  return rows[0];
}

export async function markAttemptCompleted(attemptId: string, client: Queryable = pool): Promise<void> {
  await client.query(`UPDATE task_attempts SET status = 'completed', completed_at = now() WHERE id = $1`, [attemptId]);
}

export async function listAllTasksAdmin(client: Queryable = pool): Promise<Task[]> {
  const { rows } = await client.query('SELECT * FROM tasks ORDER BY sort_order');
  return rows;
}

export async function updateTaskAdmin(
  id: string,
  patch: { reward_nova?: number; daily_limit?: number; active?: number; is_hot?: number },
  client: Queryable = pool
): Promise<void> {
  await client.query(
    `UPDATE tasks SET
       reward_nova = COALESCE($1, reward_nova),
       daily_limit = COALESCE($2, daily_limit),
       active = COALESCE($3, active),
       is_hot = COALESCE($4, is_hot)
     WHERE id = $5`,
    [patch.reward_nova ?? null, patch.daily_limit ?? null, patch.active ?? null, patch.is_hot ?? null, id]
  );
}

export async function sumTaskRewardOut(client: Queryable = pool): Promise<number> {
  const { rows } = await client.query(`SELECT COALESCE(SUM(amount), 0)::int AS s FROM coin_ledger WHERE reason = 'task_reward'`);
  return Number(rows[0].s);
}
