/**
 * Expense Controller
 * Handles HTTP requests for expense operations
 */

import { Request, Response, NextFunction } from 'express';
import { expenseService } from '../services/expense.service';
import { createExpenseSchema, updateExpenseSchema, approveExpenseSchema, payExpenseSchema, getExpensesQuerySchema } from '../validators/expense.validator';
import { activityLogService } from '../services/activitylog.service';

export class ExpenseController {
  /**
   * Get all expenses
   * Staff users can only see their own expenses
   */
  async getAllExpenses(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const query = getExpensesQuerySchema.parse(req.query);

      const expenses = await expenseService.getAllExpenses(companyId, query, userId, userRole);

      res.json({
        success: true,
        data: expenses,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get expense by ID
   * Staff users can only view their own expenses
   */
  async getExpenseById(req: Request, res: Response, next: NextFunction) {
    try {
      const expenseId = req.params.id as string;
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const expense = await expenseService.getExpenseById(expenseId, companyId, userId, userRole);

      res.json({
        success: true,
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new expense
   */
  async createExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const data = createExpenseSchema.parse(req.body);

      const expense = await expenseService.createExpense(companyId, userId, data);

      // Log activity
      await activityLogService.log({
        companyId,
        userId,
        action: 'EXPENSE_CREATED',
        entityType: 'Expense',
        entityId: expense.id,
        details: `Expense "${expense.title}" created (Amount: ${expense.amount})`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        success: true,
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an expense
   * Staff users can only update their own expenses
   */
  async updateExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const expenseId = req.params.id as string;
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const data = updateExpenseSchema.parse(req.body);

      const expense = await expenseService.updateExpense(expenseId, companyId, data, userId, userRole);

      // Log activity
      await activityLogService.log({
        companyId,
        userId,
        action: 'EXPENSE_UPDATED',
        entityType: 'Expense',
        entityId: expense.id,
        details: `Expense "${expense.title}" updated`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete an expense
   * Staff users can only delete their own expenses
   */
  async deleteExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const expenseId = req.params.id as string;
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      // Get expense title before deletion (validates ownership for staff)
      const expense = await expenseService.getExpenseById(expenseId, companyId, userId, userRole);

      const result = await expenseService.deleteExpense(expenseId, companyId);

      // Log activity
      await activityLogService.log({
        companyId,
        userId,
        action: 'EXPENSE_DELETED',
        entityType: 'Expense',
        entityId: expenseId,
        details: `Expense "${expense.title}" deleted`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve or reject an expense
   */
  async approveExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const expenseId = req.params.id as string;
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const data = approveExpenseSchema.parse(req.body);

      const expense = await expenseService.approveExpense(expenseId, companyId, userId, req.user!.role, data);

      // Activity logging is now handled in the service
      res.json({
        success: true,
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Pay an expense
   */
  async payExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const expenseId = req.params.id as string;
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const data = payExpenseSchema.parse(req.body);

      const result = await expenseService.payExpense(expenseId, companyId, userId, data);

      // Log activity
      await activityLogService.log({
        companyId,
        userId,
        action: 'EXPENSE_PAID',
        entityType: 'Expense',
        entityId: result.expense.id,
        details: `Expense "${result.expense.title}" paid (Amount: ${result.expense.amount})`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get expenses by event
   * Staff users can only see their own expenses
   */
  async getExpensesByEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.eventId as string;
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const expenses = await expenseService.getExpensesByEvent(eventId, companyId, userId, userRole);

      res.json({
        success: true,
        data: expenses,
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkPay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const { expenseIds } = req.body as { expenseIds: string[] };

      if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
        res.status(400).json({ success: false, message: 'expenseIds must be a non-empty array' });
        return;
      }

      const result = await expenseService.bulkPayExpenses(companyId, userId, expenseIds);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getApprovalChain(req: Request, res: Response, next: NextFunction) {
    try {
      const expenseId = req.params.id as string;
      const companyId = req.user!.companyId;
      const result = await expenseService.getApprovalChain(expenseId, companyId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Batch approve/reject expenses
   */
  async batchApprove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const { expenseIds, action, walletId, notes } = req.body;

      // Validate input
      if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'expenseIds must be a non-empty array',
        });
        return;
      }

      if (!action || !['Approved', 'Rejected'].includes(action)) {
        res.status(400).json({
          success: false,
          message: 'action must be either "Approved" or "Rejected"',
        });
        return;
      }

      const result = await expenseService.batchApproveExpenses(
        companyId,
        userId,
        req.user!.role,
        expenseIds,
        action,
        walletId,
        notes
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const expenseController = new ExpenseController();
