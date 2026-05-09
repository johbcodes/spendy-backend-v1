import { z } from 'zod';
import { ExpenseStatus } from '@prisma/client';

const batchPaymentItemSchema = z.object({
  name: z.string(),
  idNumber: z.string().optional(),
  phone: z.string().optional(),
  paybillNumber: z.string().optional(),
  accountNumber: z.string().optional(),
  tillNumber: z.string().optional(),
  amount: z.number().positive(),
  reference: z.string(),
  paymentMethod: z.enum(['mpesa', 'paybill', 'till', 'bank']).optional(),
});

export const createExpenseSchema = z.object({
  title: z.string().min(1, 'Expense title is required'),
  eventId: z.string().optional(),
  eventName: z.string().optional(),
  category: z.string().optional(),
  client: z.string().optional(),
  amount: z.number().positive('Amount must be greater than 0'),
  budget: z.number().min(0).optional(),
  supplierId: z.string().optional(),
  isBatch: z.boolean().default(false),
  paymentMethod: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  needsApproval: z.boolean().optional(),
  description: z.string().optional(),
  receipt: z.string().optional(),
  batchPaymentDetails: z.array(batchPaymentItemSchema).optional(),
});

export const updateExpenseSchema = z.object({
  title: z.string().min(1).optional(),
  eventId: z.string().optional(),
  eventName: z.string().optional(),
  category: z.string().optional(),
  client: z.string().optional(),
  amount: z.number().positive().optional(),
  budget: z.number().min(0).optional(),
  supplierId: z.string().optional(),
  paymentMethod: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  needsApproval: z.boolean().optional(),
  description: z.string().optional(),
  receipt: z.string().optional(),
  batchPaymentDetails: z.array(batchPaymentItemSchema).optional(),
});

export const approveExpenseSchema = z.object({
  status: z.nativeEnum(ExpenseStatus).refine(
    (s) => s === ExpenseStatus.Approved || s === ExpenseStatus.Rejected,
    { message: 'Status must be Approved or Rejected' },
  ),
  approvedAmount: z.number().positive().optional(),
  walletId: z.string().optional(),
  notes: z.string().optional(),
});

export const payExpenseSchema = z.object({
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

export const getExpensesQuerySchema = z.object({
  status: z.nativeEnum(ExpenseStatus).optional(),
  eventId: z.string().optional(),
  category: z.string().optional(),
  needsApproval: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ApproveExpenseInput = z.infer<typeof approveExpenseSchema>;
export type PayExpenseInput = z.infer<typeof payExpenseSchema>;
export type GetExpensesQuery = z.infer<typeof getExpensesQuerySchema>;
