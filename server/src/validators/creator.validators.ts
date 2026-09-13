import { z } from 'zod';

export const applyCreatorCodeSchema = z.object({
  code: z.string().trim().min(1),
});

export const createCreatorCodeSchema = z.object({
  code: z.string().trim().min(1),
  owner_username: z.string().trim().min(1),
  bonus_percent: z.coerce.number().int().min(1).max(100).optional(),
});
