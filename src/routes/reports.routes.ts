/**
 * Reports Routes
 * Defines all reporting and analytics API endpoints
 */

import { Router } from 'express';
import { reportsController } from '../controllers/reports.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/reports/expenses/summary
 * @desc    Get expense summary report
 * @access  Private (Admin, Store Manager)
 */
router.get('/expenses/summary', authorize('Admin', 'StoreManager'), reportsController.getExpenseSummary.bind(reportsController));

/**
 * @route   GET /api/v1/reports/staff-spending
 * @desc    Get staff spending report (Staff can only see their own)
 * @access  Private
 */
router.get('/staff-spending', reportsController.getStaffSpending.bind(reportsController));

/**
 * @route   GET /api/v1/reports/wallet-balance-history
 * @desc    Get wallet balance history
 * @access  Private (Admin, Store Manager, Approver)
 */
router.get('/wallet-balance-history', authorize('Admin', 'StoreManager', 'Approver'), reportsController.getWalletBalanceHistory.bind(reportsController));

/**
 * @route   GET /api/v1/reports/approval-trends
 * @desc    Get expense approval trends
 * @access  Private (Admin, Store Manager)
 */
router.get('/approval-trends', authorize('Admin', 'StoreManager'), reportsController.getApprovalTrends.bind(reportsController));

/**
 * @route   GET /api/v1/reports/pending-approvals
 * @desc    Get pending approvals summary
 * @access  Private (Admin)
 */
router.get('/pending-approvals', authorize('Admin'), reportsController.getPendingApprovals.bind(reportsController));

export default router;
