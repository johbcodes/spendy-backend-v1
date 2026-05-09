import { Request, Response, NextFunction } from 'express';
import { transactionService } from '../services/transaction.service';

export class TransactionController {
  async getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await transactionService.getTransactions(req.companyId!, req.query as Record<string, string>);
      res.json({
        success: true,
        data: result.transactions,
        meta: { total: result.total, limit: result.limit, offset: result.offset },
      });
    } catch (error) {
      next(error);
    }
  }

  async getTransactionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transaction = await transactionService.getTransactionById(req.params.id as string, req.companyId!);

      if (!transaction) {
        res.status(404).json({ success: false, message: 'Transaction not found' });
        return;
      }

      res.json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  }

  async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const csv = await transactionService.exportCsv(req.companyId!, req.query as Record<string, string>);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="transactions-${Date.now()}.csv"`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }
}

export const transactionController = new TransactionController();
