import { z } from 'zod';

export const getTransactionsSchema = z.object({
  query: z.object({
    type: z.enum(['TRANSFER', 'FUND', 'EXPENSE', 'REFUND']).optional(),
    walletId: z.string().uuid().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
  }),
});
