import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { authenticate, authorize } from '../middleware/auth';
import { enforceTenancy } from '../middleware/tenancy';
import { validate } from '../middleware/validator';
import {
  createWalletSchema,
  updateWalletSchema,
  fundWalletSchema,
  transferSchema,
} from '../validators/wallet.validator';

const router = Router();
const walletController = new WalletController();

// All routes require authentication and tenancy enforcement
router.use(authenticate, enforceTenancy);

// Get all wallets (all roles)
router.get('/', walletController.getAllWallets.bind(walletController));

// Get wallet by ID (all roles)
router.get('/:id', walletController.getWalletById.bind(walletController));

// Get wallet transactions (all roles)
router.get('/:id/transactions', walletController.getWalletTransactions.bind(walletController));

// Create wallet (Admin, Store Manager)
router.post(
  '/',
  authorize('Admin', 'StoreManager'),
  validate(createWalletSchema),
  walletController.createWallet.bind(walletController)
);

// Update wallet (Admin, Store Manager)
router.patch(
  '/:id',
  authorize('Admin', 'StoreManager'),
  validate(updateWalletSchema),
  walletController.updateWallet.bind(walletController)
);

// Delete wallet (Admin, Store Manager)
router.delete(
  '/:id',
  authorize('Admin', 'StoreManager'),
  walletController.deleteWallet.bind(walletController)
);

// Fund wallet (Admin, Store Manager, Approver)
router.post(
  '/:id/fund',
  authorize('Admin', 'StoreManager', 'Approver'),
  validate(fundWalletSchema),
  walletController.fundWallet.bind(walletController)
);

// Transfer between wallets (Admin, Store Manager, Approver)
router.post(
  '/transfer',
  authorize('Admin', 'StoreManager', 'Approver'),
  validate(transferSchema),
  walletController.transfer.bind(walletController)
);

// Initiate M-Pesa STK push top-up for a wallet (all authenticated users)
router.post('/:id/topup', walletController.initiateTopup.bind(walletController));

export default router;
