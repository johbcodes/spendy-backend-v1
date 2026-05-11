import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { WalletType, WalletStatus, TransactionType, TransactionStatus } from '@prisma/client';
import { notificationService } from './notification.service';
import { mpesaService, MpesaService } from './mpesa.service';

const LOW_BALANCE_THRESHOLD = 1000; // KES

interface CreateWalletData {
  name: string;
  type: WalletType;
  ownerId?: string;
}

interface UpdateWalletData {
  name?: string;
  status?: WalletStatus;
}

export class WalletService {
  async createWallet(companyId: string, data: CreateWalletData) {
    const wallet = await prisma.wallet.create({
      data: {
        companyId,
        name: data.name,
        type: data.type,
        ownerId: data.ownerId,
        balance: 0,
        currency: 'KES',
        isDefault: false,
        status: WalletStatus.Active,
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    logger.info(`Wallet created: ${wallet.name} for company: ${companyId}`);
    return wallet;
  }

  async getAllWallets(companyId: string, userId: string, userRole: string) {
    if (userRole === 'Staff') {
      return prisma.wallet.findMany({
        where: { companyId, type: WalletType.Personal, ownerId: userId },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return prisma.wallet.findMany({
      where: { companyId },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getWalletById(walletId: string, companyId: string) {
    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, companyId },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
        transactionsFrom: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            toWallet: { select: { name: true } },
            createdBy: { select: { firstName: true, lastName: true } },
          },
        },
        transactionsTo: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            fromWallet: { select: { name: true } },
            createdBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!wallet) throw new ApiError(404, 'Wallet not found');
    return wallet;
  }

  async updateWallet(walletId: string, companyId: string, data: UpdateWalletData) {
    const wallet = await prisma.wallet.findFirst({ where: { id: walletId, companyId } });
    if (!wallet) throw new ApiError(404, 'Wallet not found');

    const updated = await prisma.wallet.update({ where: { id: walletId }, data });
    logger.info(`Wallet updated: ${walletId}`);
    return updated;
  }

  async deleteWallet(walletId: string, companyId: string) {
    const wallet = await prisma.wallet.findFirst({ where: { id: walletId, companyId } });
    if (!wallet) throw new ApiError(404, 'Wallet not found');

    if (wallet.isDefault) throw new ApiError(400, 'Cannot delete default wallet');
    if (wallet.balance > 0) throw new ApiError(400, 'Cannot delete wallet with balance. Transfer funds first.');

    await prisma.wallet.delete({ where: { id: walletId } });
    logger.info(`Wallet deleted: ${walletId}`);
  }

  async fundWallet(
    walletId: string,
    companyId: string,
    userId: string,
    amount: number,
    description?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findFirst({ where: { id: walletId, companyId } });
      if (!wallet) throw new ApiError(404, 'Wallet not found');

      const updatedWallet = await tx.wallet.update({
        where: { id: walletId },
        data: { balance: { increment: amount } },
      });

      const transaction = await tx.transaction.create({
        data: {
          companyId,
          type: TransactionType.FUND,
          amount,
          toWalletId: walletId,
          description: description ?? 'Wallet funding',
          status: TransactionStatus.Completed,
          createdById: userId,
        },
      });

      await tx.activityLog.create({
        data: {
          companyId,
          userId,
          action: 'WALLET_FUNDED',
          entityType: 'Wallet',
          entityId: walletId,
          details: `Funded ${wallet.name} with KES ${amount}`,
        },
      });

      logger.info(`Wallet funded: ${walletId}, amount: ${amount}`);

      if (wallet.ownerId) {
        notificationService
          .notifyWalletFunded(
            companyId,
            wallet.ownerId,
            walletId,
            wallet.name,
            amount,
            updatedWallet.balance,
            transaction.reference ?? 'MANUAL',
          )
          .catch((err) => logger.error('Notify wallet funded failed', { err }));
      }

      return { wallet: updatedWallet, transaction };
    });
  }

  async transferBetweenWallets(
    fromWalletId: string,
    toWalletId: string,
    companyId: string,
    userId: string,
    amount: number,
    description?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const fromWallet = await tx.wallet.findFirst({ where: { id: fromWalletId, companyId } });
      const toWallet = await tx.wallet.findFirst({ where: { id: toWalletId, companyId } });

      if (!fromWallet) throw new ApiError(404, 'Source wallet not found');
      if (!toWallet) throw new ApiError(404, 'Destination wallet not found');
      if (fromWallet.balance < amount) throw new ApiError(400, 'Insufficient balance');

      await tx.wallet.update({
        where: { id: fromWalletId },
        data: { balance: { decrement: amount } },
      });

      const projectedBalance = fromWallet.balance - amount;
      if (projectedBalance < LOW_BALANCE_THRESHOLD) {
        notificationService
          .notifyLowWalletBalance(companyId, fromWalletId, fromWallet.name, projectedBalance, LOW_BALANCE_THRESHOLD)
          .catch((err) => logger.error('Low balance notification failed', { err }));
      }

      await tx.wallet.update({
        where: { id: toWalletId },
        data: { balance: { increment: amount } },
      });

      const transaction = await tx.transaction.create({
        data: {
          companyId,
          type: TransactionType.TRANSFER,
          amount,
          fromWalletId,
          toWalletId,
          description: description ?? 'Wallet transfer',
          status: TransactionStatus.Completed,
          createdById: userId,
        },
        include: {
          fromWallet: { select: { name: true } },
          toWallet: { select: { name: true } },
        },
      });

      await tx.activityLog.create({
        data: {
          companyId,
          userId,
          action: 'WALLET_TRANSFER',
          entityType: 'Transaction',
          entityId: transaction.id,
          details: `Transferred KES ${amount} from ${fromWallet.name} to ${toWallet.name}`,
        },
      });

      logger.info(`Wallet transfer: ${fromWalletId} -> ${toWalletId}, amount: ${amount}`);
      return transaction;
    });
  }

  async getWalletTransactions(walletId: string, companyId: string) {
    const wallet = await prisma.wallet.findFirst({ where: { id: walletId, companyId } });
    if (!wallet) throw new ApiError(404, 'Wallet not found');

    return prisma.transaction.findMany({
      where: {
        OR: [{ fromWalletId: walletId }, { toWalletId: walletId }],
        companyId,
      },
      include: {
        fromWallet: { select: { name: true } },
        toWallet: { select: { name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── M-Pesa top-up (STK push) ─────────────────────────────────────────────────

  async initiateTopup(
    companyId: string,
    userId: string,
    phone: string,
    amount: number,
  ) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { mpesaAccountRef: true },
    });
    if (!company?.mpesaAccountRef) {
      throw new ApiError(400, 'No M-Pesa account reference configured for this organisation. Contact your admin.');
    }
    return mpesaService.initiateSTKPush(companyId, userId, phone, amount);
  }

  async getTopupRequest(requestId: string, companyId: string) {
    const req = await prisma.mpesaTopupRequest.findFirst({
      where: { id: requestId, companyId },
      select: {
        id: true,
        status: true,
        amount: true,
        phone: true,
        mpesaReceiptNumber: true,
        failureReason: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!req) throw new ApiError(404, 'Top-up request not found');
    return req;
  }

  // ── Company account ref management ──────────────────────────────────────────

  async getCompanyMpesaRef(companyId: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { mpesaAccountRef: true },
    });
    if (!company) throw new ApiError(404, 'Company not found');
    return { mpesaAccountRef: company.mpesaAccountRef };
  }

  async setCompanyMpesaRef(companyId: string, mpesaAccountRef: string) {
    const existing = await prisma.company.findFirst({
      where: { mpesaAccountRef, NOT: { id: companyId } },
    });
    if (existing) throw new ApiError(409, 'This account reference is already in use by another organisation');

    return prisma.company.update({
      where: { id: companyId },
      data: { mpesaAccountRef },
      select: { id: true, name: true, mpesaAccountRef: true },
    });
  }

  async autoAssignMpesaRef(companyId: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { mpesaAccountRef: true },
    });
    if (!company) throw new ApiError(404, 'Company not found');
    if (company.mpesaAccountRef) return { mpesaAccountRef: company.mpesaAccountRef };

    const ref = await MpesaService.generateUniqueAccountRef();

    return prisma.company.update({
      where: { id: companyId },
      data: { mpesaAccountRef: ref },
      select: { id: true, name: true, mpesaAccountRef: true },
    });
  }

  // ── Payouts ──────────────────────────────────────────────────────────────────

  async initiateB2CPayout(
    companyId: string,
    userId: string,
    fromWalletId: string,
    phone: string,
    amount: number,
    remarks: string,
    expenseId?: string,
  ) {
    return mpesaService.initiateB2C(
      companyId,
      userId,
      fromWalletId,
      phone,
      amount,
      remarks,
      expenseId,
    );
  }

  async initiateB2BPayout(
    companyId: string,
    userId: string,
    fromWalletId: string,
    type: 'B2B_PAYBILL' | 'B2B_TILL',
    recipient: string,
    amount: number,
    accountReference: string,
    remarks: string,
    expenseId?: string,
  ) {
    return mpesaService.initiateB2B(
      companyId,
      userId,
      fromWalletId,
      type,
      recipient,
      amount,
      accountReference,
      remarks,
      expenseId,
    );
  }

  async getPayoutRequest(requestId: string, companyId: string) {
    const req = await prisma.mpesaPayoutRequest.findFirst({
      where: { id: requestId, companyId },
      select: {
        id: true,
        status: true,
        type: true,
        amount: true,
        recipient: true,
        accountReference: true,
        mpesaReceiptNumber: true,
        failureReason: true,
        expenseId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!req) throw new ApiError(404, 'Payout request not found');
    return req;
  }
}

export const walletService = new WalletService();
