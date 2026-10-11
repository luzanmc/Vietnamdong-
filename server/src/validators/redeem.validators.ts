import { z } from 'zod';

export const redeemOrderSchema = z.object({
  item_id: z.string().trim().min(1),
  destination: z.string().trim().min(1, 'Vui lòng nhập thông tin nhận thưởng'),
});
