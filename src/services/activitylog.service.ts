import prisma from '../config/database';

interface ActivityLogData {
  companyId: string;
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class ActivityLogService {
  async getActivityLogs(
    companyId: string,
    limit: number = 50,
    offset: number = 0,
    userId?: string
  ) {
    const where: any = { companyId };
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return { logs, total, limit, offset };
  }

  async log(data: ActivityLogData) {
    return prisma.activityLog.create({
      data: {
        companyId: data.companyId,
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        details: data.details,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }
}

export const activityLogService = new ActivityLogService();
