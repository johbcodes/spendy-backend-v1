import { z } from 'zod';
import { EventStatus } from '@prisma/client';

const documentSchema = z.object({
  name: z.string().min(1, 'Document name is required'),
  url: z.string().min(1, 'Document URL is required'),
  type: z.string().optional(),
});

export const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  type: z.string().min(1, 'Event type is required'),
  category: z.string().optional(),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  brand: z.string().optional(),
  projectLeadId: z.string().uuid('Project lead must be a valid user ID').optional(),
  budget: z.number().min(0, 'Budget must be non-negative').default(0),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  status: z.nativeEnum(EventStatus).default(EventStatus.Planning),
  location: z.string().optional(),
  documents: z.array(documentSchema).optional(),
  // Activation-only fields
  product: z.string().optional(),
  campaignName: z.string().optional(),
  activationChannel: z.string().optional(),
});

export const updateEventSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  category: z.string().optional(),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  brand: z.string().optional(),
  projectLeadId: z.string().uuid().optional(),
  budget: z.number().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.nativeEnum(EventStatus).optional(),
  location: z.string().optional(),
  documents: z.array(documentSchema).optional(),
  // Activation-only fields
  product: z.string().optional(),
  campaignName: z.string().optional(),
  activationChannel: z.string().optional(),
});

export const getEventsQuerySchema = z.object({
  status: z.nativeEnum(EventStatus).optional(),
  type: z.string().optional(),
  clientId: z.string().optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type GetEventsQuery = z.infer<typeof getEventsQuerySchema>;
