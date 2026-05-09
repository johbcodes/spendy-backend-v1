import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Product name is required'),
    sku: z.string().optional(),
    category: z.string().optional(),
    price: z.number().positive('Price must be positive'),
    cost: z.number().positive().optional(),
    stock: z.number().int().min(0).optional(),
    unit: z.string().optional(),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    sku: z.string().optional(),
    category: z.string().optional(),
    price: z.number().positive().optional(),
    cost: z.number().positive().optional(),
    stock: z.number().int().min(0).optional(),
    unit: z.string().optional(),
    status: z.enum(['Active', 'Inactive']).optional(),
  }),
});
