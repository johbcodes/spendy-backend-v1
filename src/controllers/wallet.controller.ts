import { Request, Response, NextFunction } from 'express';
import { WalletService } from '../services/wallet.service';
import { ApiError } from '../middleware/errorHandler';

const walletService = new WalletService();

export class WalletController {
  // ── CRUD ─────────────────────────────────────────────────────────────────────

  async createWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.companyId!;
      const wallet = await walletService.createWallet(companyId, req.body);
      res.status(201).json({ success: true, message: 'Wallet created successfully', data: wallet });
    } catch (error) { next(error); }
  }

  async getAllWallets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.companyId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const wallets = await walletService.getAllWallets(companyId, userId, userRole);
      res.json({ success: true, data: wallets });
    } catch (error) { next(error); }
  }

  async getWalletById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const companyId = req.companyId!;
      const wallet = await walletService.getWalletById(id, companyId);
      res.json({ success: true, data: wallet });
    } catch (error) { next(error); }
  }

  async updateWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const companyId = req.companyId!;
      const wallet = await walletService.updateWallet(id, companyId, req.body);
      res.json({ success: true, message: 'Wallet updated successfully', data: wallet });
    } catch (error) { next(error); }
  }

  async deleteWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const companyId = req.companyId!;
      await walletService.deleteWallet(id, companyId);
      res.json({ success: true, message: 'Wallet deleted successfully' });
    } catch (error) { next(error); }
  }

  // ── Manual fund ──────────────────────────────────────────────────────────────

  async fundWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const companyId = req.companyId!;
      const userId = req.user!.userId;
      const { amount, description } = req.body;
      const result = await walletService.fundWallet(id, companyId, userId, amount, description);
      res.json({ success: true, message: 'Wallet funded successfully', data: result });
    } catch (error) { next(error); }
  }

  // ── Transfer ─────────────────────────────────────────────────────────────────

  async transfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.companyId!;
      const userId = req.user!.userId;
      const { fromWalletId, toWalletId, amount, description } = req.body;
      const transaction = await walletService.transferBetweenWallets(
        fromWalletId, toWalletId, companyId, userId, amount, description,
      );
      res.json({ success: true, message: 'Transfer completed successfully', data: transaction });
    } catch (error) { next(error); }
  }

  // ── M-Pesa top-up (STK push) ─────────────────────────────────────────────────

  async initiateTopup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.companyId!;
      const userId = req.user!.userId;
      const { phone, amount } = req.body;
      if (!phone || !amount) throw new ApiError(400, 'phone and amount are required');

      const result = await walletService.initiateTopup(
        companyId, userId, phone as string, Number(amount),
      );

      res.json({
        success: true,
        message: 'STK push sent — please complete the payment on your phone',
        data: result,
      });
    } catch (error) { next(error); }
  }

  async getTopupStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = req.params.requestId as string;
      const companyId = req.companyId!;
      const request = await walletService.getTopupRequest(requestId, companyId);
      res.json({ success: true, data: request });
    } catch (error) { next(error); }
  }

  // ── Company M-Pesa account reference ─────────────────────────────────────────

  async getMpesaRef(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.companyId!;
      const data = await walletService.getCompanyMpesaRef(companyId);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async setMpesaRef(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.companyId!;
      const { mpesaAccountRef } = req.body;
      if (!mpesaAccountRef) throw new ApiError(400, 'mpesaAccountRef is required');
      const data = await walletService.setCompanyMpesaRef(companyId, mpesaAccountRef as string);
      res.json({ success: true, message: 'M-Pesa account reference updated', data });
    } catch (error) { next(error); }
  }

  async autoAssignMpesaRef(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.companyId!;
      const data = await walletService.autoAssignMpesaRef(companyId);
      res.json({ success: true, message: 'M-Pesa account reference assigned', data });
    } catch (error) { next(error); }
  }

  // ── Payouts ──────────────────────────────────────────────────────────────────

  async initiateB2CPayout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.companyId!;
      const userId = req.user!.userId;
      const { fromWalletId, phone, amount, remarks, expenseId } = req.body;
      if (!fromWalletId || !phone || !amount) {
        throw new ApiError(400, 'fromWalletId, phone and amount are required');
      }
      const result = await walletService.initiateB2CPayout(
        companyId, userId, fromWalletId, phone, Number(amount),
        remarks ?? 'Payout via Spendy', expenseId,
      );
      res.json({
        success: true,
        message: 'Payout initiated — awaiting M-Pesa confirmation',
        data: result,
      });
    } catch (error) { next(error); }
  }

  async initiateB2BPayout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.companyId!;
      const userId = req.user!.userId;
      const { fromWalletId, type, recipient, amount, accountReference, remarks, expenseId } = req.body;
      if (!fromWalletId || !type || !recipient || !amount || !accountReference) {
        throw new ApiError(400, 'fromWalletId, type, recipient, amount and accountReference are required');
      }
      if (type !== 'B2B_PAYBILL' && type !== 'B2B_TILL') {
        throw new ApiError(400, 'type must be B2B_PAYBILL or B2B_TILL');
      }
      const result = await walletService.initiateB2BPayout(
        companyId, userId, fromWalletId, type, recipient,
        Number(amount), accountReference, remarks ?? 'Payout via Spendy', expenseId,
      );
      res.json({
        success: true,
        message: 'B2B payout initiated — awaiting M-Pesa confirmation',
        data: result,
      });
    } catch (error) { next(error); }
  }

  async getPayoutStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = req.params.requestId as string;
      const companyId = req.companyId!;
      const request = await walletService.getPayoutRequest(requestId, companyId);
      res.json({ success: true, data: request });
    } catch (error) { next(error); }
  }

  // ── Transactions ─────────────────────────────────────────────────────────────

  async getWalletTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const companyId = req.companyId!;
      const transactions = await walletService.getWalletTransactions(id, companyId);
      res.json({ success: true, data: transactions });
    } catch (error) { next(error); }
  }
}
