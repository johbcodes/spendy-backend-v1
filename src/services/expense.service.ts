import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';
import logger from '../utils/logger';

const LOW_BALANCE_THRESHOLD = 1000; // KES

async function checkLowBalance(
  walletId: string,
  companyId: string,
  walletName: string,
  currentBalance: number,
) {
  if (currentBalance < LOW_BALANCE_THRESHOLD) {
    notificationService
      .notifyLowWalletBalance(companyId, walletId, walletName, currentBalance, LOW_BALANCE_THRESHOLD)
      .catch((err: unknown) => logger.error('Low balance notification failed', { err }));
  }
}
import {
  ExpenseStatus,
  TransactionType,
  TransactionStatus,
  UserRole,
  WalletType,
} from '@prisma/client';
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
  ApproveExpenseInput,
  PayExpenseInput,
  GetExpensesQuery,
} from '../validators/expense.validator';

const CREATOR_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;

const EVENT_SELECT = {
  id: true,
  name: true,
  type: true,
  status: true,
} as const;

export class ExpenseService {
  async getAllExpenses(
    companyId: string,
    query: Partial<GetExpensesQuery> = {},
    userId?: string,
    userRole?: string,
  ) {
    const where: Record<string, unknown> = { companyId };

    if (userRole === UserRole.Staff && userId) {
      where.createdById = userId;
    } else if (userRole === UserRole.Approver && userId) {
      // Approvers only see expenses from events they created or lead
      const approverEvents = await prisma.event.findMany({
        where: {
          companyId,
          OR: [{ createdById: userId }, { projectLeadId: userId }],
        },
        select: { id: true },
      });
      where.eventId = { in: approverEvents.map((e) => e.id) };
    }

    if (query.status) where.status = query.status;
    if (query.eventId) where.eventId = query.eventId;
    if (query.category) where.category = query.category;
    if (query.needsApproval !== undefined) where.needsApproval = query.needsApproval;

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          createdBy: { select: CREATOR_SELECT },
          event: { select: EVENT_SELECT },
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: query.offset ?? 0,
        take: query.limit ?? 50,
      }),
      prisma.expense.count({ where }),
    ]);

    return { expenses, total, offset: query.offset ?? 0, limit: query.limit ?? 50 };
  }

  async getExpenseById(
    expenseId: string,
    companyId: string,
    userId?: string,
    userRole?: string,
  ) {
    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, companyId },
      include: {
        createdBy: { select: CREATOR_SELECT },
        event: { select: { ...EVENT_SELECT, budget: true, spent: true } },
        supplier: { select: { id: true, name: true, paymentMethod: true } },
        approvals: {
          include: { approvedBy: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!expense) throw new ApiError(404, 'Expense not found');

    if (userRole === UserRole.Staff && userId && expense.createdById !== userId) {
      throw new ApiError(403, 'You can only view your own expenses');
    }

    return expense;
  }

  async createExpense(companyId: string, userId: string, data: CreateExpenseInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        dailyLimit: true,
        monthlyLimit: true,
        requiresApprovalAbove: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) throw new ApiError(404, 'User not found');

    if (user.role === UserRole.Staff) {
      await this.checkSpendingLimits(companyId, userId, data.amount, user);

      // Determine if approval is needed
      if (user.requiresApprovalAbove && user.requiresApprovalAbove > 0) {
        data.needsApproval = data.amount >= user.requiresApprovalAbove;
      } else {
        data.needsApproval = true;
      }
    }

    if (data.eventId) {
      const event = await prisma.event.findFirst({ where: { id: data.eventId, companyId } });
      if (!event) throw new ApiError(404, 'Event not found');
      if (['Archived', 'Cancelled', 'Completed'].includes(event.status)) {
        throw new ApiError(400, `Cannot create expenses on ${event.status.toLowerCase()} events`);
      }
    }

    const expense = await prisma.expense.create({
      data: {
        companyId,
        createdById: userId,
        title: data.title,
        eventId: data.eventId,
        eventName: data.eventName,
        category: data.category,
        client: data.client,
        amount: data.amount,
        budget: data.budget,
        supplierId: data.supplierId,
        isBatch: data.isBatch ?? false,
        paymentMethod: data.paymentMethod,
        startDate: data.startDate ? new Date(data.startDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: ExpenseStatus.Pending,
        needsApproval: data.needsApproval ?? false,
        description: data.description,
        receipt: data.receipt,
        batchPaymentDetails: data.batchPaymentDetails ?? undefined,
      },
      include: {
        createdBy: { select: CREATOR_SELECT },
        event: { select: EVENT_SELECT },
        supplier: { select: { id: true, name: true } },
      },
    });

    if (expense.needsApproval) {
      notificationService
        .notifyExpenseSubmitted(
          companyId,
          expense.id,
          `${expense.createdBy.firstName} ${expense.createdBy.lastName}`,
          expense.amount,
          expense.title,
        )
        .catch((err: unknown) => logger.error('Failed to send expense submitted notification', { err }));
    }

    return expense;
  }

  async updateExpense(
    expenseId: string,
    companyId: string,
    data: UpdateExpenseInput,
    userId?: string,
    userRole?: string,
  ) {
    const existing = await prisma.expense.findFirst({ where: { id: expenseId, companyId } });
    if (!existing) throw new ApiError(404, 'Expense not found');

    if (userRole === UserRole.Staff && userId && existing.createdById !== userId) {
      throw new ApiError(403, 'You can only update your own expenses');
    }

    // Only Pending/Rejected expenses can be edited
    if (!([ ExpenseStatus.Pending, ExpenseStatus.Rejected] as ExpenseStatus[]).includes(existing.status)) {
      throw new ApiError(400, `Cannot edit an expense with status ${existing.status}`);
    }

    if (data.eventId) {
      const event = await prisma.event.findFirst({ where: { id: data.eventId, companyId } });
      if (!event) throw new ApiError(404, 'Event not found');
      if (['Archived', 'Cancelled', 'Completed'].includes(event.status)) {
        throw new ApiError(400, `Cannot link expenses to ${event.status.toLowerCase()} events`);
      }
    }

    return prisma.expense.update({
      where: { id: expenseId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.eventId !== undefined && { eventId: data.eventId }),
        ...(data.eventName !== undefined && { eventName: data.eventName }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.client !== undefined && { client: data.client }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.budget !== undefined && { budget: data.budget }),
        ...(data.supplierId !== undefined && { supplierId: data.supplierId }),
        ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
        ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
        ...(data.needsApproval !== undefined && { needsApproval: data.needsApproval }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.receipt !== undefined && { receipt: data.receipt }),
        ...(data.batchPaymentDetails !== undefined && { batchPaymentDetails: data.batchPaymentDetails }),
        // Re-open a rejected expense for re-submission
        ...(existing.status === ExpenseStatus.Rejected && { status: ExpenseStatus.Pending }),
      },
      include: {
        createdBy: { select: CREATOR_SELECT },
        event: { select: EVENT_SELECT },
        supplier: { select: { id: true, name: true } },
      },
    });
  }

  async deleteExpense(expenseId: string, companyId: string) {
    const existing = await prisma.expense.findFirst({ where: { id: expenseId, companyId } });
    if (!existing) throw new ApiError(404, 'Expense not found');

    if (([ExpenseStatus.Approved, ExpenseStatus.Paid] as ExpenseStatus[]).includes(existing.status)) {
      throw new ApiError(400, 'Cannot delete an approved or paid expense');
    }

    await prisma.expense.delete({ where: { id: expenseId } });
    return { message: 'Expense deleted successfully' };
  }

  async approveExpense(
    expenseId: string,
    companyId: string,
    approverId: string,
    approverRole: string,
    data: ApproveExpenseInput,
  ) {
    const expense = await this.getExpenseById(expenseId, companyId);

    if (expense.status !== ExpenseStatus.Pending) {
      throw new ApiError(400, `Expense is already ${expense.status.toLowerCase()}`);
    }

    // Self-approval rules per spec:
    // - No one can approve their own expense (except Admin can approve their own)
    // - Only Admin can approve an Approver's expense
    if (approverRole !== UserRole.Admin && expense.createdById === approverId) {
      throw new ApiError(403, 'You cannot approve your own expense');
    }
    if (expense.createdBy?.role === UserRole.Approver && approverRole !== UserRole.Admin) {
      throw new ApiError(403, "Only an Admin can approve an Approver's expense");
    }

    const isApproving = data.status === ExpenseStatus.Approved;
    const fundAmount = data.approvedAmount ?? expense.amount;

    if (isApproving && !data.walletId) {
      // Auto-resolve wallet from event type
      const walletType = expense.event?.type === 'Operation'
        ? WalletType.Operations
        : expense.event?.type === 'Activation'
          ? WalletType.Activation
          : WalletType.Events;

      const autoWallet = await prisma.wallet.findFirst({
        where: { companyId, type: walletType, status: 'Active' },
      }) ?? await prisma.wallet.findFirst({
        where: { companyId, type: WalletType.Events, status: 'Active' },
      }) ?? await prisma.wallet.findFirst({
        where: { companyId, type: WalletType.Main, status: 'Active' },
      });

      if (!autoWallet) {
        throw new ApiError(400, 'No wallet available for this expense. Please contact admin to create company wallets.');
      }
      data.walletId = autoWallet.id;
    }

    return prisma.$transaction(async (tx) => {
      const updatedExpense = await tx.expense.update({
        where: { id: expenseId },
        data: {
          status: data.status as ExpenseStatus,
          approvedAmount: isApproving ? fundAmount : null,
          sourceWalletId: isApproving ? data.walletId : null,
        },
        include: {
          createdBy: { select: CREATOR_SELECT },
          event: { select: EVENT_SELECT },
        },
      });

      if (isApproving && data.walletId) {
        const staffWallet = await tx.wallet.findFirst({
          where: { companyId, type: WalletType.Personal, ownerId: expense.createdById },
        });
        if (!staffWallet) throw new ApiError(404, 'Recipient personal wallet not found');

        const sourceWallet = await tx.wallet.findFirst({
          where: { id: data.walletId, companyId },
        });
        if (!sourceWallet) throw new ApiError(404, 'Source wallet not found');
        if (sourceWallet.balance < fundAmount) {
          throw new ApiError(400, `Insufficient balance in source wallet. Required: ${fundAmount}, Available: ${sourceWallet.balance}`);
        }

        await tx.wallet.update({
          where: { id: data.walletId },
          data: { balance: { decrement: fundAmount } },
        });

        checkLowBalance(data.walletId!, companyId, sourceWallet.name, sourceWallet.balance - fundAmount);

        await tx.wallet.update({
          where: { id: staffWallet.id },
          data: { balance: { increment: fundAmount } },
        });

        await tx.transaction.create({
          data: {
            companyId,
            type: TransactionType.EXPENSE_APPROVAL,
            status: TransactionStatus.Completed,
            amount: fundAmount,
            fromWalletId: data.walletId,
            toWalletId: staffWallet.id,
            expenseId,
            description: `Expense approval: ${expense.title}`,
            createdById: approverId,
          },
        });

        await tx.activityLog.create({
          data: {
            companyId,
            userId: approverId,
            action: 'EXPENSE_APPROVED',
            entityType: 'Expense',
            entityId: expenseId,
            details: `Approved "${expense.title}" — KES ${fundAmount} transferred to ${expense.createdBy?.firstName} ${expense.createdBy?.lastName}`,
          },
        });
      } else if (!isApproving) {
        await tx.activityLog.create({
          data: {
            companyId,
            userId: approverId,
            action: 'EXPENSE_REJECTED',
            entityType: 'Expense',
            entityId: expenseId,
            details: `Rejected "${expense.title}"${data.notes ? ` — ${data.notes}` : ''}`,
          },
        });
      }

      await tx.expenseApproval.create({
        data: {
          companyId,
          expenseId,
          approvedById: approverId,
          action: data.status,
          amount: fundAmount,
          walletId: data.walletId,
          notes: data.notes,
        },
      });

      const approver = await tx.user.findUnique({
        where: { id: approverId },
        select: { firstName: true, lastName: true },
      });
      const approverName = approver ? `${approver.firstName} ${approver.lastName}` : 'Approver';

      if (isApproving) {
        notificationService
          .notifyExpenseApproved(companyId, expense.createdById, expenseId, fundAmount, expense.title, approverName)
          .catch((err: unknown) => logger.error('Failed to send approval notification', { err }));
      } else {
        notificationService
          .notifyExpenseRejected(companyId, expense.createdById, expenseId, expense.amount, expense.title, approverName, data.notes)
          .catch((err: unknown) => logger.error('Failed to send rejection notification', { err }));
      }

      return updatedExpense;
    });
  }

  async payExpense(expenseId: string, companyId: string, userId: string, _data: PayExpenseInput) {
    const expense = await this.getExpenseById(expenseId, companyId);

    if (expense.status === ExpenseStatus.Paid) {
      throw new ApiError(400, 'Expense has already been paid');
    }

    if (expense.status !== ExpenseStatus.Approved) {
      throw new ApiError(400, 'Expense must be approved before payment');
    }

    // Payment comes from the creator's personal wallet
    const personalWallet = await prisma.wallet.findFirst({
      where: { companyId, type: WalletType.Personal, ownerId: userId },
    });
    if (!personalWallet) throw new ApiError(404, 'Personal wallet not found');

    const payAmount = expense.approvedAmount ?? expense.amount;
    if (personalWallet.balance < payAmount) {
      throw new ApiError(400, `Insufficient personal wallet balance. Required: ${payAmount}, Available: ${personalWallet.balance}`);
    }

    // Fetch global tariff for deduction from source wallet
    const config = await prisma.systemConfig.findFirst();
    const tariff = config
      ? config.tariffRate > 0
        ? payAmount * config.tariffRate
        : config.tariffFlat
      : 0;

    return prisma.$transaction(async (tx) => {
      // Deduct from personal wallet
      await tx.wallet.update({
        where: { id: personalWallet.id },
        data: { balance: { decrement: payAmount } },
      });

      checkLowBalance(personalWallet.id, companyId, 'Personal Wallet', personalWallet.balance - payAmount);

      // Outbound payment transaction record
      const transaction = await tx.transaction.create({
        data: {
          companyId,
          type: TransactionType.OUTBOUND_PAYMENT,
          status: TransactionStatus.Completed,
          amount: payAmount,
          tariffAmount: tariff,
          fromWalletId: personalWallet.id,
          expenseId,
          description: `Payment for: ${expense.title}`,
          category: expense.category ?? 'Expense',
          createdById: userId,
        },
      });

      // Deduct tariff from source wallet (not from personal wallet)
      if (tariff > 0 && expense.sourceWalletId) {
        const sourceWallet = await tx.wallet.findFirst({
          where: { id: expense.sourceWalletId, companyId },
        });

        if (sourceWallet && sourceWallet.balance >= tariff) {
          await tx.wallet.update({
            where: { id: expense.sourceWalletId },
            data: { balance: { decrement: tariff } },
          });

          await tx.transaction.create({
            data: {
              companyId,
              type: TransactionType.TARIFF,
              status: TransactionStatus.Completed,
              amount: tariff,
              fromWalletId: expense.sourceWalletId,
              expenseId,
              description: `Transaction fee for: ${expense.title}`,
              createdById: userId,
            },
          });
        } else {
          logger.warn('Tariff deduction skipped — insufficient source wallet balance', {
            expenseId,
            tariff,
            sourceWalletId: expense.sourceWalletId,
          });
        }
      }

      const updatedExpense = await tx.expense.update({
        where: { id: expenseId },
        data: { status: ExpenseStatus.Paid },
        include: {
          createdBy: { select: CREATOR_SELECT },
          event: { select: EVENT_SELECT },
        },
      });

      if (expense.eventId) {
        await tx.event.update({
          where: { id: expense.eventId },
          data: { spent: { increment: payAmount } },
        });
      }

      await tx.activityLog.create({
        data: {
          companyId,
          userId,
          action: 'EXPENSE_PAID',
          entityType: 'Expense',
          entityId: expenseId,
          details: `Paid "${expense.title}" — KES ${payAmount}${tariff > 0 ? ` (fee: ${tariff})` : ''}`,
        },
      });

      return { expense: updatedExpense, transaction };
    });
  }

  async batchApproveExpenses(
    companyId: string,
    approverId: string,
    approverRole: string,
    expenseIds: string[],
    action: Extract<ExpenseStatus, 'Approved' | 'Rejected'>,
    walletId?: string,
    notes?: string,
  ) {
    const expenses = await prisma.expense.findMany({
      where: { id: { in: expenseIds }, companyId },
      include: { createdBy: { select: CREATOR_SELECT } },
    });

    if (expenses.length !== expenseIds.length) {
      throw new ApiError(404, 'One or more expenses not found');
    }

    const errors: string[] = [];
    for (const exp of expenses) {
      if (exp.status !== ExpenseStatus.Pending) {
        errors.push(`"${exp.title}" is already ${exp.status.toLowerCase()}`);
      }
      if (approverRole !== UserRole.Admin && exp.createdById === approverId) {
        errors.push(`Cannot self-approve "${exp.title}"`);
      }
      if (exp.createdBy.role === UserRole.Approver && approverRole !== UserRole.Admin) {
        errors.push(`Only Admin can approve Approver expense "${exp.title}"`);
      }
    }
    if (errors.length > 0) {
      throw new ApiError(400, errors.join('; '));
    }

    if (action === ExpenseStatus.Approved) {
      if (!walletId) throw new ApiError(400, 'Source wallet is required for batch approval');
      const wallet = await prisma.wallet.findFirst({ where: { id: walletId, companyId } });
      if (!wallet) throw new ApiError(404, 'Source wallet not found');

      const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
      if (wallet.balance < totalAmount) {
        throw new ApiError(400, `Insufficient wallet balance. Required: ${totalAmount}, Available: ${wallet.balance}`);
      }
    }

    const results = await Promise.all(
      expenses.map((e) =>
        this.approveExpense(e.id, companyId, approverId, approverRole, {
          status: action,
          walletId,
          notes,
        }),
      ),
    );

    return { processed: results.length, action, expenses: results };
  }

  async bulkPayExpenses(companyId: string, userId: string, expenseIds: string[]) {
    const expenses = await prisma.expense.findMany({
      where: { id: { in: expenseIds }, companyId, status: ExpenseStatus.Approved },
      include: { createdBy: { select: CREATOR_SELECT } },
    });

    if (expenses.length !== expenseIds.length) {
      const foundIds = expenses.map((e) => e.id);
      const missing = expenseIds.filter((id) => !foundIds.includes(id));
      throw new ApiError(400, `Some expenses not found or not in Approved status: ${missing.join(', ')}`);
    }

    const personalWallet = await prisma.wallet.findFirst({
      where: { companyId, type: WalletType.Personal, ownerId: userId },
    });
    if (!personalWallet) throw new ApiError(404, 'Personal wallet not found');

    const results = await Promise.all(
      expenses.map((e) =>
        this.payExpense(e.id, companyId, userId, {}).catch((err) => ({
          expenseId: e.id,
          error: (err as Error).message,
        })),
      ),
    );

    const paid = results.filter((r) => !('error' in r));
    const failed = results.filter((r) => 'error' in r);

    logger.info(`Bulk pay: ${paid.length} paid, ${failed.length} failed`, { companyId, userId });
    return { paid: paid.length, failed, total: expenseIds.length };
  }

  async getApprovalChain(expenseId: string, companyId: string) {
    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, companyId },
      select: { id: true, title: true, amount: true, approvedAmount: true, status: true },
    });
    if (!expense) throw new ApiError(404, 'Expense not found');

    const approvals = await prisma.expenseApproval.findMany({
      where: { expenseId, companyId },
      include: {
        approvedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return { expense, approvals };
  }

  async getExpensesByEvent(
    eventId: string,
    companyId: string,
    userId?: string,
    userRole?: string,
  ) {
    const where: Record<string, unknown> = { eventId, companyId };
    if (userRole === UserRole.Staff && userId) {
      where.createdById = userId;
    }

    return prisma.expense.findMany({
      where,
      include: { createdBy: { select: CREATOR_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async checkSpendingLimits(
    companyId: string,
    userId: string,
    amount: number,
    user: { dailyLimit: number | null; monthlyLimit: number | null },
  ) {
    if (user.dailyLimit && user.dailyLimit > 0) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { _sum } = await prisma.expense.aggregate({
        where: {
          companyId,
          createdById: userId,
          createdAt: { gte: startOfDay },
          status: { in: [ExpenseStatus.Pending, ExpenseStatus.Approved, ExpenseStatus.Paid] },
        },
        _sum: { amount: true },
      });

      const todaySpent = _sum.amount ?? 0;
      if (todaySpent + amount > user.dailyLimit) {
        throw new ApiError(
          400,
          `Daily limit exceeded. Remaining today: KES ${(user.dailyLimit - todaySpent).toFixed(2)}`,
        );
      }
    }

    if (user.monthlyLimit && user.monthlyLimit > 0) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { _sum } = await prisma.expense.aggregate({
        where: {
          companyId,
          createdById: userId,
          createdAt: { gte: startOfMonth },
          status: { in: [ExpenseStatus.Pending, ExpenseStatus.Approved, ExpenseStatus.Paid] },
        },
        _sum: { amount: true },
      });

      const monthSpent = _sum.amount ?? 0;
      if (monthSpent + amount > user.monthlyLimit) {
        throw new ApiError(
          400,
          `Monthly limit exceeded. Remaining this month: KES ${(user.monthlyLimit - monthSpent).toFixed(2)}`,
        );
      }
    }
  }
}

export const expenseService = new ExpenseService();
