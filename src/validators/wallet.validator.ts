import { z } from 'zod';

export const createWalletSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Wallet name is required'),
    type: z.enum(['Main', 'Operations', 'Events', 'Activation', 'Personal']),
    ownerId: z.string().uuid().optional(),
  }),
});

export const updateWalletSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    status: z.enum(['Active', 'Suspended']).optional(),
  }),
});

export const fundWalletSchema = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be positive'),
    description: z.string().optional(),
  }),
});

export const transferSchema = z.object({
  body: z.object({
    fromWalletId: z.string().uuid('Invalid wallet ID'),
    toWalletId: z.string().uuid('Invalid wallet ID'),
    amount: z.number().positive('Amount must be positive'),
    description: z.string().optional(),
  }),
});
