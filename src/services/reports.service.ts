/**
 * Reports Service
 * Handles reporting and analytics for expenses, wallets, and spending
 */

import prisma from '../config/database';

export class ReportsService {
  /**
   * Get expense summary report
   */
  async getExpenseSummary(companyId: string, startDate?: Date, endDate?: Date) {
    const where: any = { companyId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalExpenses, byStatus, byCategory, byStaff] = await Promise.all([
      // Total expenses
      prisma.expense.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      }),

      // By status
      prisma.expense.groupBy({
        by: ['status'],
        where,
        _sum: { amount: true },
        _count: true,
      }),

      // By category
      prisma.expense.groupBy({
        by: ['category'],
        where,
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: 10,
      }),

      // By staff member
      prisma.expense.groupBy({
        by: ['createdById'],
        where,
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
      }),
    ]);

    // Get staff member names
    const staffIds = byStaff.map((s) => s.createdById);
    const users = await prisma.user.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, firstName: true, lastName: true, role: true },
    });

    const staffMap = new Map(users.map((u) => [u.id, u]));
    const staffWithNames = byStaff.map((s) => {
      const user = staffMap.get(s.createdById);
      return {
        ...s,
        userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        userRole: user?.role || 'Unknown',
      };
    });

    return {
      total: {
        amount: totalExpenses._sum.amount || 0,
        count: totalExpenses._count,
      },
      byStatus,
      byCategory,
      byStaff: staffWithNames,
    };
  }

  /**
   * Get staff spending report
   */
  async getStaffSpending(companyId: string, staffId?: string) {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const where: any = {
      companyId,
      status: { in: ['Pending', 'Approved', 'Paid'] },
    };

    if (staffId) {
      where.createdById = staffId;
    } else {
      // Only get Staff users
      const staffUsers = await prisma.user.findMany({
        where: { companyId, role: 'Staff' },
        select: { id: true },
      });
      where.createdById = { in: staffUsers.map((u) => u.id) };
    }

    const [todayTotal, monthTotal, allTime, byUser] = await Promise.all([
      // Today's spending
      prisma.expense.aggregate({
        where: { ...where, createdAt: { gte: startOfDay } },
        _sum: { amount: true },
        _count: true,
      }),

      // This month's spending
      prisma.expense.aggregate({
        where: { ...where, createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: true,
      }),

      // All time spending
      prisma.expense.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      }),

      // By user (if not filtering by specific staff)
      staffId
        ? null
        : prisma.expense.groupBy({
            by: ['createdById'],
            where,
            _sum: { amount: true },
            _count: true,
            orderBy: { _sum: { amount: 'desc' } },
          }),
    ]);

    // Get user details if grouping by user
    let usersWithSpending = null;
    if (byUser) {
      const userIds = byUser.map((u) => u.createdById);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          dailyLimit: true,
          monthlyLimit: true,
        },
      });

      const userMap = new Map(users.map((u) => [u.id, u]));
      usersWithSpending = byUser.map((b) => {
        const user = userMap.get(b.createdById);
        return {
          userId: b.createdById,
          userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          email: user?.email,
          totalAmount: b._sum.amount || 0,
          totalCount: b._count,
          dailyLimit: user?.dailyLimit,
          monthlyLimit: user?.monthlyLimit,
        };
      });
    }

    return {
      today: {
        amount: todayTotal._sum.amount || 0,
        count: todayTotal._count,
      },
      thisMonth: {
        amount: monthTotal._sum.amount || 0,
        count: monthTotal._count,
      },
      allTime: {
        amount: allTime._sum.amount || 0,
        count: allTime._count,
      },
      byUser: usersWithSpending,
    };
  }

  /**
   * Get wallet balance history
   */
  async getWalletBalanceHistory(companyId: string, walletId?: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where: any = { companyId, createdAt: { gte: startDate } };
    if (walletId) {
      where.OR = [{ fromWalletId: walletId }, { toWalletId: walletId }];
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        fromWallet: { select: { name: true } },
        toWallet: { select: { name: true } },
      },
    });

    // Get current wallet balances
    const walletsWhere: any = { companyId };
    if (walletId) walletsWhere.id = walletId;

    const wallets = await prisma.wallet.findMany({
      where: walletsWhere,
      select: { id: true, name: true, balance: true },
    });

    return {
      transactions,
      currentBalances: wallets,
      period: { days, startDate, endDate: new Date() },
    };
  }

  /**
   * Get approval trends
   */
  async getApprovalTrends(companyId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalApprovals, byAction, averageApprovalTime] = await Promise.all([
      // Total approvals
      prisma.expenseApproval.count({
        where: { companyId, createdAt: { gte: startDate } },
      }),

      // By action
      prisma.expenseApproval.groupBy({
        by: ['action'],
        where: { companyId, createdAt: { gte: startDate } },
        _count: true,
      }),

      // Get expenses with approvals to calculate average time
      prisma.expense.findMany({
        where: {
          companyId,
          status: { in: ['Approved', 'Rejected'] },
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          createdAt: true,
          approvals: {
            select: { createdAt: true },
            take: 1,
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ]);

    // Calculate average approval time
    const approvalTimes = averageApprovalTime
      .filter((e) => e.approvals.length > 0)
      .map((e) => {
        const diff = e.approvals[0].createdAt.getTime() - e.createdAt.getTime();
        return diff / (1000 * 60 * 60); // Convert to hours
      });

    const avgTime =
      approvalTimes.length > 0
        ? approvalTimes.reduce((a, b) => a + b, 0) / approvalTimes.length
        : 0;

    return {
      totalApprovals,
      byAction,
      averageApprovalTimeHours: Math.round(avgTime * 100) / 100,
      period: { days, startDate, endDate: new Date() },
    };
  }

  /**
   * Get pending approvals summary
   */
  async getPendingApprovals(companyId: string) {
    const pending = await prisma.expense.findMany({
      where: {
        companyId,
        status: 'Pending',
        needsApproval: true,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalAmount = pending.reduce((sum, exp) => sum + exp.amount, 0);

    return {
      count: pending.length,
      totalAmount,
      expenses: pending,
    };
  }
}

export const reportsService = new ReportsService();
