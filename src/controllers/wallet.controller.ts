import { Request, Response, NextFunction } from 'express';
import { WalletService } from '../services/wallet.service';
import { mpesaService } from '../services/mpesa.service';
import { ApiError } from '../middleware/errorHandler';

const walletService = new WalletService();

export class WalletController {
  async createWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.companyId!;
      const wallet = await walletService.createWallet(companyId, req.body);

      res.status(201).json({
        success: true,
        message: 'Wallet created successfully',
        data: wallet,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllWallets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.companyId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const wallets = await walletService.getAllWallets(companyId, userId, userRole);

      res.status(200).json({
        success: true,
        data: wallets,
      });
    } catch (error) {
      next(error);
    }
  }

  async getWalletById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const companyId = req.companyId!;

      const wallet = await walletService.getWalletById(id, companyId);

      res.status(200).json({
        success: true,
        data: wallet,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const companyId = req.companyId!;

      const wallet = await walletService.updateWallet(id, companyId, req.body);

      res.status(200).json({
        success: true,
        message: 'Wallet updated successfully',
        data: wallet,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const companyId = req.companyId!;

      await walletService.deleteWallet(id, companyId);

      res.status(200).json({
        success: true,
        message: 'Wallet deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async fundWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { amount, description } = req.body;
      const companyId = req.companyId!;
      const userId = req.user!.userId;

      const result = await walletService.fundWallet(
        id,
        companyId,
        userId,
        amount,
        description
      );

      res.status(200).json({
        success: true,
        message: 'Wallet funded successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async transfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fromWalletId, toWalletId, amount, description } = req.body;
      const companyId = req.companyId!;
      const userId = req.user!.userId;

      const transaction = await walletService.transferBetweenWallets(
        fromWalletId,
        toWalletId,
        companyId,
        userId,
        amount,
        description
      );

      res.status(200).json({
        success: true,
        message: 'Transfer completed successfully',
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  async initiateTopup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const walletId = req.params.id as string;
      const companyId = req.companyId!;
      const { phone, amount } = req.body;

      const wallet = await walletService.getWalletById(walletId, companyId);
      if (!wallet.accountNumber) {
        throw new ApiError(400, 'This wallet has no account number configured for M-Pesa top-up');
      }
      if (!phone || !amount) {
        throw new ApiError(400, 'phone and amount are required');
      }

      const result = await mpesaService.initiateSTKPush(phone as string, Number(amount), wallet.accountNumber);

      res.json({
        success: true,
        message: 'STK push initiated — please complete the payment on your phone',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getWalletTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const companyId = req.companyId!;

      const transactions = await walletService.getWalletTransactions(id, companyId);

      res.status(200).json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      next(error);
    }
  }
}
