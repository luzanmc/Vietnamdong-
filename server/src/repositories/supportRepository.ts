import { pool, type Queryable } from '../db/database.js';

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_role: 'user' | 'admin';
  message: string;
  created_at: string;
}

export async function createTicket(id: string, userId: string, subject: string, client: Queryable = pool): Promise<void> {
  await client.query('INSERT INTO support_tickets (id, user_id, subject) VALUES ($1, $2, $3)', [id, userId, subject]);
}

export async function addMessage(
  id: string,
  ticketId: string,
  senderRole: 'user' | 'admin',
  message: string,
  client: Queryable = pool
): Promise<void> {
  await client.query('INSERT INTO support_messages (id, ticket_id, sender_role, message) VALUES ($1, $2, $3, $4)', [
    id,
    ticketId,
    senderRole,
    message,
  ]);
  await client.query('UPDATE support_tickets SET updated_at = now() WHERE id = $1', [ticketId]);
}

export async function listTicketsForUser(userId: string, client: Queryable = pool): Promise<SupportTicket[]> {
  const { rows } = await client.query('SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
  return rows;
}

export async function getTicketForUser(id: string, userId: string, client: Queryable = pool): Promise<SupportTicket | undefined> {
  const { rows } = await client.query('SELECT * FROM support_tickets WHERE id = $1 AND user_id = $2', [id, userId]);
  return rows[0];
}

export async function getTicketById(id: string, client: Queryable = pool): Promise<SupportTicket | undefined> {
  const { rows } = await client.query('SELECT * FROM support_tickets WHERE id = $1', [id]);
  return rows[0];
}

export async function getMessagesForTicket(ticketId: string, client: Queryable = pool): Promise<SupportMessage[]> {
  const { rows } = await client.query('SELECT * FROM support_messages WHERE ticket_id = $1 ORDER BY created_at ASC', [ticketId]);
  return rows;
}

export async function listAllTicketsAdmin(client: Queryable = pool): Promise<(SupportTicket & { username: string })[]> {
  const { rows } = await client.query(`
    SELECT t.*, u.username FROM support_tickets t
    JOIN users u ON u.id = t.user_id
    ORDER BY CASE t.status WHEN 'open' THEN 0 ELSE 1 END, t.updated_at DESC
  `);
  return rows;
}

export async function closeTicket(id: string, client: Queryable = pool): Promise<void> {
  await client.query(`UPDATE support_tickets SET status = 'closed', updated_at = now() WHERE id = $1`, [id]);
}

export async function reopenTicket(id: string, client: Queryable = pool): Promise<void> {
  await client.query(`UPDATE support_tickets SET status = 'open', updated_at = now() WHERE id = $1`, [id]);
}
