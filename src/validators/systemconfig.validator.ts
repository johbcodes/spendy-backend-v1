import { z } from 'zod';

export const updateSystemConfigSchema = z.object({
  tariffRate: z.number().min(0).max(1).optional(),
  tariffFlat: z.number().min(0).optional(),
});

export type UpdateSystemConfigInput = z.infer<typeof updateSystemConfigSchema>;
