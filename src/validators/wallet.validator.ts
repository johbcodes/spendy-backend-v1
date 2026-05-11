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

export const topupSchema = z.object({
  body: z.object({
    phone: z.string().min(9, 'Invalid phone number'),
    amount: z.number().positive('Amount must be positive').min(1, 'Minimum top-up is KES 1'),
  }),
});

export const setMpesaRefSchema = z.object({
  body: z.object({
    mpesaAccountRef: z
      .string()
      .min(3, 'Account reference must be at least 3 characters')
      .max(20, 'Account reference must be at most 20 characters')
      .regex(/^[A-Z0-9]+$/, 'Account reference must be uppercase alphanumeric only'),
  }),
});

export const b2cPayoutSchema = z.object({
  body: z.object({
    fromWalletId: z.string().uuid('Invalid wallet ID'),
    phone: z.string().min(9, 'Invalid phone number'),
    amount: z.number().positive('Amount must be positive'),
    remarks: z.string().max(100).optional(),
    expenseId: z.string().uuid().optional(),
  }),
});

export const b2bPayoutSchema = z.object({
  body: z.object({
    fromWalletId: z.string().uuid('Invalid wallet ID'),
    type: z.enum(['B2B_PAYBILL', 'B2B_TILL']),
    recipient: z.string().min(4, 'Invalid paybill/till number'),
    amount: z.number().positive('Amount must be positive'),
    accountReference: z.string().min(1, 'Account reference is required'),
    remarks: z.string().max(100).optional(),
    expenseId: z.string().uuid().optional(),
  }),
});
