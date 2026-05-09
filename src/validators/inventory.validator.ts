import { z } from 'zod';

export const createInventorySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Inventory name is required'),
    category: z.string().optional(),
    quantity: z.number().min(0).optional(),
    unit: z.string().optional(),
    location: z.string().optional(),
    price: z.number().min(0).optional(),
    cost: z.number().min(0).optional(),
    sku: z.string().optional(),
    supplier: z.string().optional(),
  }),
});

export const updateInventorySchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    category: z.string().optional(),
    quantity: z.number().min(0).optional(),
    unit: z.string().optional(),
    location: z.string().optional(),
    checkedOut: z.number().min(0).optional(),
    checkedIn: z.number().min(0).optional(),
    checkoutStatus: z.string().optional(),
    conditionCounts: z.any().optional(),
    price: z.number().min(0).optional(),
    cost: z.number().min(0).optional(),
    sku: z.string().optional(),
    supplier: z.string().optional(),
    lastRestocked: z.date().optional(),
    status: z.enum(['Active', 'Inactive']).optional(),
  }),
});
