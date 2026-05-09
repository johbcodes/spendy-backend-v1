import prisma from '../config/database';
import logger from '../utils/logger';
import { emailService } from './email.service';
import { smsService } from './sms.service';
import { pusherService } from './pusher.service';
import { UserRole, UserStatus } from '@prisma/client';

export interface CreateNotificationInput {
  companyId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  async createNotification(data: CreateNotificationInput) {
    const notification = await prisma.notification.create({
      data: {
        companyId: data.companyId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: (data.metadata ?? {}) as any,
        isRead: false,
      },
    });

    // Push real-time event to user's private channel
    pusherService
      .notifyUser(data.userId, 'notification.new', {
        id: notification.id,
        type: data.type,
        title: data.title,
        message: data.message,
        entityType: data.entityType,
        entityId: data.entityId,
      })
      .catch((err) => logger.error('Pusher trigger failed', { err }));

    return notification;
  }

  // ── Expense notifications ────────────────────────────────────────────────────

  async notifyExpenseSubmitted(
    companyId: string,
    expenseId: string,
    staffName: string,
    amount: number,
    title: string,
    category?: string,
    eventName?: string,
  ) {
    const admins = await prisma.user.findMany({
      where: { companyId, role: UserRole.Admin, status: UserStatus.Active },
      select: { id: true, firstName: true, email: true },
    });

    return Promise.all(
      admins.map(async (admin) => {
        await this.createNotification({
          companyId,
          userId: admin.id,
          type: 'EXPENSE_SUBMITTED',
          title: 'New Expense Request',
          message: `${staffName} submitted "${title}" for KES ${amount.toLocaleString()}`,
          entityType: 'Expense',
          entityId: expenseId,
          metadata: { staffName, amount, title, category, eventName },
        });

        emailService
          .sendExpenseSubmitted(admin.email, {
            firstName: admin.firstName,
            staffName,
            expenseTitle: title,
            amount,
            category,
            eventName,
          })
          .catch((err) => logger.error('Email failed: expense-submitted', { err }));
      }),
    );
  }

  async notifyExpenseApproved(
    companyId: string,
    staffId: string,
    expenseId: string,
    amount: number,
    title: string,
    approverName: string,
    notes?: string,
  ) {
    const staff = await prisma.user.findUnique({
      where: { id: staffId },
      select: { firstName: true, email: true, phone: true },
    });
    if (!staff) return;

    await this.createNotification({
      companyId,
      userId: staffId,
      type: 'EXPENSE_APPROVED',
      title: 'Expense Approved',
      message: `Your expense "${title}" (KES ${amount.toLocaleString()}) was approved by ${approverName}.`,
      entityType: 'Expense',
      entityId: expenseId,
      metadata: { amount, title, approverName, notes },
    });

    emailService
      .sendExpenseApproved(staff.email, {
        firstName: staff.firstName,
        expenseTitle: title,
        approvedAmount: amount,
        approverName,
        notes,
      })
      .catch((err) => logger.error('Email failed: expense-approved', { err }));

    if (staff.phone) {
      smsService
        .notifyExpenseApproved(staff.phone, staff.firstName, title, amount)
        .catch((err) => logger.error('SMS failed: expense-approved', { err }));
    }
  }

  async notifyExpenseRejected(
    companyId: string,
    staffId: string,
    expenseId: string,
    amount: number,
    title: string,
    approverName: string,
    reason?: string,
  ) {
    const staff = await prisma.user.findUnique({
      where: { id: staffId },
      select: { firstName: true, email: true, phone: true },
    });
    if (!staff) return;

    await this.createNotification({
      companyId,
      userId: staffId,
      type: 'EXPENSE_REJECTED',
      title: 'Expense Rejected',
      message: `Your expense "${title}" (KES ${amount.toLocaleString()}) was rejected by ${approverName}${reason ? `: ${reason}` : ''}.`,
      entityType: 'Expense',
      entityId: expenseId,
      metadata: { amount, title, approverName, reason },
    });

    emailService
      .sendExpenseRejected(staff.email, {
        firstName: staff.firstName,
        expenseTitle: title,
        amount,
        approverName,
        reason,
      })
      .catch((err) => logger.error('Email failed: expense-rejected', { err }));

    if (staff.phone) {
      smsService
        .notifyExpenseRejected(staff.phone, staff.firstName, title, reason)
        .catch((err) => logger.error('SMS failed: expense-rejected', { err }));
    }
  }

  async notifyWalletFunded(
    companyId: string,
    ownerId: string,
    walletId: string,
    walletName: string,
    amount: number,
    newBalance: number,
    reference: string,
  ) {
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { firstName: true, email: true, phone: true },
    });
    if (!owner) return;

    await this.createNotification({
      companyId,
      userId: ownerId,
      type: 'WALLET_FUNDED',
      title: 'Wallet Funded',
      message: `KES ${amount.toLocaleString()} added to ${walletName}. New balance: KES ${newBalance.toLocaleString()}.`,
      entityType: 'Wallet',
      entityId: walletId,
      metadata: { walletName, amount, newBalance, reference },
    });

    emailService
      .sendWalletFunded(owner.email, {
        firstName: owner.firstName,
        walletName,
        amount,
        newBalance,
        reference,
      })
      .catch((err) => logger.error('Email failed: wallet-funded', { err }));

    if (owner.phone) {
      smsService
        .notifyWalletFunded(owner.phone, owner.firstName, amount, walletName)
        .catch((err) => logger.error('SMS failed: wallet-funded', { err }));
    }
  }

  async notifyLowWalletBalance(
    companyId: string,
    walletId: string,
    walletName: string,
    currentBalance: number,
    threshold: number,
  ) {
    const users = await prisma.user.findMany({
      where: { companyId, role: { in: [UserRole.Admin, UserRole.StoreManager] }, status: UserStatus.Active },
      select: { id: true },
    });

    return Promise.all(
      users.map((u) =>
        this.createNotification({
          companyId,
          userId: u.id,
          type: 'LOW_WALLET_BALANCE',
          title: 'Low Wallet Balance Alert',
          message: `${walletName} is low: KES ${currentBalance.toLocaleString()} (threshold: KES ${threshold.toLocaleString()})`,
          entityType: 'Wallet',
          entityId: walletId,
          metadata: { walletName, currentBalance, threshold },
        }),
      ),
    );
  }

  // ── Read/query helpers ───────────────────────────────────────────────────────

  async getUserNotifications(userId: string, companyId: string, limit = 50, offset = 0) {
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId, companyId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where: { userId, companyId } }),
    ]);
    return { notifications, total, unread: await this.getUnreadCount(userId, companyId) };
  }

  async getUnreadCount(userId: string, companyId: string) {
    return prisma.notification.count({ where: { userId, companyId, isRead: false } });
  }

  async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string, companyId: string) {
    return prisma.notification.updateMany({
      where: { userId, companyId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async deleteNotification(notificationId: string, userId: string) {
    return prisma.notification.deleteMany({ where: { id: notificationId, userId } });
  }
}

export const notificationService = new NotificationService();
