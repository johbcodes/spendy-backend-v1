/**
 * Notification Controller
 * Handles HTTP requests for notification operations
 */

import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';

export class NotificationController {
  /**
   * Get user notifications
   */
  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const companyId = req.user!.companyId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const notifications = await notificationService.getUserNotifications(userId, companyId, limit);

      res.json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const companyId = req.user!.companyId;

      const count = await notificationService.getUnreadCount(userId, companyId);

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const notificationId = req.params.id as string;
      const userId = req.user!.userId;

      await notificationService.markAsRead(notificationId, userId);

      res.json({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const companyId = req.user!.companyId;

      await notificationService.markAllAsRead(userId, companyId);

      res.json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const notificationId = req.params.id as string;
      const userId = req.user!.userId;

      await notificationService.deleteNotification(notificationId, userId);

      res.json({
        success: true,
        message: 'Notification deleted',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
