import { z } from 'zod';

export const withdrawSchema = z.object({
  amount_nova: z.coerce.number().positive(),
  method: z.enum(['momo', 'bank', 'card']),
  destination: z.string().trim().min(1, 'Thiếu thông tin tài khoản nhận tiền'),
});

export const transferSchema = z.object({
  to_username: z.string().trim().min(1),
  amount_nova: z.coerce.number().positive(),
});
