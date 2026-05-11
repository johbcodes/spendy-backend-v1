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
  topupSchema,
  setMpesaRefSchema,
  b2cPayoutSchema,
  b2bPayoutSchema,
} from '../validators/wallet.validator';

const router = Router();
const walletController = new WalletController();

router.use(authenticate, enforceTenancy);

// ── Wallets CRUD ─────────────────────────────────────────────────────────────
router.get('/', walletController.getAllWallets.bind(walletController));
router.get('/:id', walletController.getWalletById.bind(walletController));
router.get('/:id/transactions', walletController.getWalletTransactions.bind(walletController));

router.post(
  '/',
  authorize('Admin', 'StoreManager'),
  validate(createWalletSchema),
  walletController.createWallet.bind(walletController),
);
router.patch(
  '/:id',
  authorize('Admin', 'StoreManager'),
  validate(updateWalletSchema),
  walletController.updateWallet.bind(walletController),
);
router.delete(
  '/:id',
  authorize('Admin', 'StoreManager'),
  walletController.deleteWallet.bind(walletController),
);

// ── Manual fund ──────────────────────────────────────────────────────────────
router.post(
  '/:id/fund',
  authorize('Admin', 'StoreManager', 'Approver'),
  validate(fundWalletSchema),
  walletController.fundWallet.bind(walletController),
);

// ── Internal transfer ────────────────────────────────────────────────────────
router.post(
  '/transfer',
  authorize('Admin', 'StoreManager', 'Approver'),
  validate(transferSchema),
  walletController.transfer.bind(walletController),
);

// ── M-Pesa top-up (STK push) — any authenticated user can top up ─────────────
router.post(
  '/topup',
  validate(topupSchema),
  walletController.initiateTopup.bind(walletController),
);
router.get(
  '/topup-requests/:requestId',
  walletController.getTopupStatus.bind(walletController),
);

// ── Company M-Pesa account reference ─────────────────────────────────────────
router.get(
  '/mpesa-ref',
  walletController.getMpesaRef.bind(walletController),
);
router.put(
  '/mpesa-ref',
  authorize('Admin'),
  validate(setMpesaRefSchema),
  walletController.setMpesaRef.bind(walletController),
);
router.post(
  '/mpesa-ref/auto-assign',
  authorize('Admin'),
  walletController.autoAssignMpesaRef.bind(walletController),
);

// ── Payouts ──────────────────────────────────────────────────────────────────
router.post(
  '/payouts/b2c',
  authorize('Admin', 'Approver'),
  validate(b2cPayoutSchema),
  walletController.initiateB2CPayout.bind(walletController),
);
router.post(
  '/payouts/b2b',
  authorize('Admin', 'Approver'),
  validate(b2bPayoutSchema),
  walletController.initiateB2BPayout.bind(walletController),
);
router.get(
  '/payout-requests/:requestId',
  authorize('Admin', 'Approver'),
  walletController.getPayoutStatus.bind(walletController),
);

export default router;
