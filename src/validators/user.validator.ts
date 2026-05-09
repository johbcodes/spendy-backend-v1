import { z } from 'zod';
import { UserRole, UserStatus } from '@prisma/client';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phone: z.string().min(1, 'Phone is required'),
    country: z.string().min(1, 'Country is required'),
    role: z.nativeEnum(UserRole),
    modulesAssigned: z.array(z.string()).optional(),
    dailyLimit: z.number().min(0).optional(),
    monthlyLimit: z.number().min(0).optional(),
    requiresApprovalAbove: z.number().min(0).optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
    country: z.string().min(1).optional(),
    role: z.nativeEnum(UserRole).optional(),
    modulesAssigned: z.array(z.string()).optional(),
    profileImage: z.string().optional(),
    dailyLimit: z.number().min(0).optional(),
    monthlyLimit: z.number().min(0).optional(),
    requiresApprovalAbove: z.number().min(0).optional(),
  }),
});

export const toggleUserStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(UserStatus),
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
export type ToggleUserStatusInput = z.infer<typeof toggleUserStatusSchema>['body'];
