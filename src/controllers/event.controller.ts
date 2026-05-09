import { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/event.service';
import { createEventSchema, updateEventSchema, getEventsQuerySchema } from '../validators/event.validator';
import { activityLogService } from '../services/activitylog.service';
import { EventStatus } from '@prisma/client';

export class EventController {
  async getAllEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const query = getEventsQuerySchema.parse(req.query);
      const events = await eventService.getAllEvents(companyId, query);
      res.json({ success: true, data: events });
    } catch (err) {
      next(err);
    }
  }

  async getEventById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await eventService.getEventById(req.params.id as string, req.user!.companyId);
      res.json({ success: true, data: event });
    } catch (err) {
      next(err);
    }
  }

  async createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const data = createEventSchema.parse(req.body);
      const event = await eventService.createEvent(companyId, userId, data);

      await activityLogService.log({
        companyId,
        userId,
        action: 'EVENT_CREATED',
        entityType: 'Event',
        entityId: event.id,
        details: `Event "${event.name}" created`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') as string | undefined,
      });

      res.status(201).json({ success: true, data: event });
    } catch (err) {
      next(err);
    }
  }

  async updateEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const data = updateEventSchema.parse(req.body);
      const event = await eventService.updateEvent(req.params.id as string, companyId, data);

      await activityLogService.log({
        companyId,
        userId,
        action: 'EVENT_UPDATED',
        entityType: 'Event',
        entityId: event.id,
        details: `Event "${event.name}" updated`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') as string | undefined,
      });

      res.json({ success: true, data: event });
    } catch (err) {
      next(err);
    }
  }

  async deleteEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const eventId = req.params.id as string;
      const event = await eventService.getEventById(eventId, companyId);
      const result = await eventService.deleteEvent(eventId, companyId);

      await activityLogService.log({
        companyId,
        userId,
        action: 'EVENT_DELETED',
        entityType: 'Event',
        entityId: eventId,
        details: `Event "${event.name}" deleted`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') as string | undefined,
      });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getEventStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await eventService.getEventStats(req.params.id as string, req.user!.companyId);
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }

  async changeEventStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const { status } = req.body;

      const validStatuses = Object.values(EventStatus);
      if (!status || !validStatuses.includes(status as EventStatus)) {
        res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
        return;
      }

      const event = await eventService.updateEvent(req.params.id as string, companyId, { status });

      await activityLogService.log({
        companyId,
        userId,
        action: 'EVENT_STATUS_CHANGED',
        entityType: 'Event',
        entityId: event.id,
        details: `Event "${event.name}" status changed to "${status}"`,
        ipAddress: req.ip,
      });

      res.json({ success: true, message: 'Event status updated successfully', data: event });
    } catch (err) {
      next(err);
    }
  }
}

export const eventController = new EventController();
