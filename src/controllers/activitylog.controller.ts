import { Request, Response, NextFunction } from 'express';
import { ActivityLogService } from '../services/activitylog.service';

const activityLogService = new ActivityLogService();

export const getActivityLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const result = await activityLogService.getActivityLogs(req.companyId!, limit, offset);

    res.json({
      success: true,
      data: result.logs,
      meta: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (error) {
    next(error);
  }
};
