/**
 * Reports Controller
 * Handles HTTP requests for reporting and analytics
 */

import { Request, Response, NextFunction } from 'express';
import { reportsService } from '../services/reports.service';

export class ReportsController {
  /**
   * Get expense summary report
   */
  async getExpenseSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const report = await reportsService.getExpenseSummary(companyId, startDate, endDate);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get staff spending report
   */
  async getStaffSpending(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const staffId = req.query.staffId as string | undefined;

      // Staff users can only see their own reports
      const finalStaffId = userRole === 'Staff' ? userId : staffId;

      const report = await reportsService.getStaffSpending(companyId, finalStaffId);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get wallet balance history
   */
  async getWalletBalanceHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const walletId = req.query.walletId as string | undefined;
      const days = req.query.days ? parseInt(req.query.days as string) : 30;

      const report = await reportsService.getWalletBalanceHistory(companyId, walletId, days);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get approval trends
   */
  async getApprovalTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const days = req.query.days ? parseInt(req.query.days as string) : 30;

      const report = await reportsService.getApprovalTrends(companyId, days);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending approvals summary
   */
  async getPendingApprovals(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;

      const report = await reportsService.getPendingApprovals(companyId);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reportsController = new ReportsController();
