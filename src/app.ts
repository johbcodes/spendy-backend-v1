import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import env from './config/env';
import prisma from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import logger from './utils/logger';
import {
  mpesaService,
  MpesaSTKCallbackBody,
  MpesaC2BConfirmationBody,
  MpesaB2CResultBody,
} from './services/mpesa.service';
import { notificationService } from './services/notification.service';
import { smsService } from './services/sms.service';
import { pusherService } from './services/pusher.service';
import { authenticate } from './middleware/auth';

// Routes
import authRoutes from './routes/auth.routes';
import walletRoutes from './routes/wallet.routes';
import userRoutes from './routes/user.routes';
import transactionRoutes from './routes/transaction.routes';
import productRoutes from './routes/product.routes';
import supplierRoutes from './routes/supplier.routes';
import inventoryRoutes from './routes/inventory.routes';
import activityLogRoutes from './routes/activitylog.routes';
import invoiceRoutes from './routes/invoice.routes';
import eventRoutes from './routes/event.routes';
import expenseRoutes from './routes/expense.routes';
import clientRoutes from './routes/client.routes';
import categoryRoutes from './routes/category.routes';
import notificationRoutes from './routes/notification.routes';
import reportsRoutes from './routes/reports.routes';
import systemConfigRoutes from './routes/systemconfig.routes';

const app: Application = express();

// 1. Request correlation ID (must be first)
app.use(requestId);

// 2. Security headers
app.use(helmet());

// 3. CORS
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  }),
);

// 4. Response compression
app.use(compression());

// 5. Rate limiting on all API routes
const limiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS),
  max: parseInt(env.RATE_LIMIT_MAX_REQUESTS),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// 6. Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 7. Request logging
app.use((req: Request, _res, next) => {
  logger.info(`${req.method} ${req.path}`, { requestId: req.id });
  next();
});

// Health check (no auth, no rate limit)
app.get('/health', async (_req: Request, res: Response) => {
  let dbOk = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbOk = false;
  }
  res.status(dbOk ? 200 : 503).json({
    success: dbOk,
    db: dbOk ? 'connected' : 'error',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use(`/api/${env.API_VERSION}/auth`, authRoutes);
app.use(`/api/${env.API_VERSION}/wallets`, walletRoutes);
app.use(`/api/${env.API_VERSION}/users`, userRoutes);
app.use(`/api/${env.API_VERSION}/transactions`, transactionRoutes);
app.use(`/api/${env.API_VERSION}/products`, productRoutes);
app.use(`/api/${env.API_VERSION}/suppliers`, supplierRoutes);
app.use(`/api/${env.API_VERSION}/inventory`, inventoryRoutes);
app.use(`/api/${env.API_VERSION}/invoices`, invoiceRoutes);
app.use(`/api/${env.API_VERSION}/activity-logs`, activityLogRoutes);
app.use(`/api/${env.API_VERSION}/events`, eventRoutes);
app.use(`/api/${env.API_VERSION}/expenses`, expenseRoutes);
app.use(`/api/${env.API_VERSION}/clients`, clientRoutes);
app.use(`/api/${env.API_VERSION}/categories`, categoryRoutes);
app.use(`/api/${env.API_VERSION}/notifications`, notificationRoutes);
app.use(`/api/${env.API_VERSION}/reports`, reportsRoutes);
app.use(`/api/${env.API_VERSION}/system-config`, systemConfigRoutes);

// Pusher channel auth — requires JWT, used by frontend Pusher client
app.post('/api/pusher/auth', authenticate, (req: Request, res: Response) => {
  const { socket_id, channel_name } = req.body as { socket_id: string; channel_name: string };

  if (!socket_id || !channel_name) {
    res.status(400).json({ success: false, message: 'socket_id and channel_name are required' });
    return;
  }

  // Only allow users to subscribe to their own private channel or their company channel
  const userId = req.user!.userId;
  const companyId = req.user!.companyId;
  const allowed =
    channel_name === `private-user-${userId}` ||
    channel_name === `private-company-${companyId}`;

  if (!allowed) {
    res.status(403).json({ success: false, message: 'Not authorised for this channel' });
    return;
  }

  try {
    const authResponse = pusherService.authorizeChannel(socket_id, channel_name);
    res.json(authResponse);
  } catch {
    res.status(500).json({ success: false, message: 'Pusher not configured' });
  }
});

// ── M-Pesa Callbacks — no auth, Safaricom posts directly ─────────────────────
// Always ack 200 first, then process async so Safaricom never times out.

// STK Push result (alias covers misconfigured MPESA_CALLBACK_URL pointing to /api/v1/mpesa/callback)
app.post(['/api/mpesa/stkpush/callback', '/api/v1/mpesa/callback'], async (req: Request, res: Response) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  try {
    const result = await mpesaService.handleSTKCallback(req.body as MpesaSTKCallbackBody);
    if (result) {
      const mainWallet = await prisma.wallet.findFirst({
        where: { companyId: result.companyId, type: 'Main' },
        select: { id: true, name: true, balance: true },
      });
      const mpesaRef = (req.body as MpesaSTKCallbackBody)
        .Body.stkCallback.CallbackMetadata?.Item
        .find(i => i.Name === 'MpesaReceiptNumber')?.Value as string | undefined;

      // Notify all Admins in the company
      const admins = await prisma.user.findMany({
        where: { companyId: result.companyId, role: 'Admin', status: 'Active' },
        select: { id: true, phone: true },
      });
      for (const admin of admins) {
        notificationService
          .notifyWalletFunded(
            result.companyId,
            admin.id,
            result.walletId,
            mainWallet?.name ?? 'Main Wallet',
            result.amount,
            mainWallet?.balance ?? 0,
            mpesaRef ?? 'MPESA',
          )
          .catch((err) => logger.error('STK notify failed', { err }));

        if (admin.phone && mpesaRef) {
          smsService
            .notifyMpesaPayment(admin.phone, result.amount, mpesaRef)
            .catch((err) => logger.error('STK SMS failed', { err }));
        }
      }
    }
  } catch (err) {
    logger.error('STK callback processing error', { err });
  }
});

// C2B Validation — must respond within 5 seconds; accept all payments
app.post('/api/mpesa/c2b/validate', (_req: Request, res: Response) => {
  res.json({ ResultCode: '0', ResultDesc: 'Accepted' });
});

// C2B Confirmation — passive paybill payment landed
app.post('/api/mpesa/c2b/confirm', async (req: Request, res: Response) => {
  res.json({ ResultCode: '0', ResultDesc: 'Accepted' });
  try {
    const result = await mpesaService.handleC2BConfirmation(
      req.body as MpesaC2BConfirmationBody,
    );
    if (result) {
      const mainWallet = await prisma.wallet.findFirst({
        where: { companyId: result.companyId, type: 'Main' },
        select: { id: true, name: true, balance: true },
      });
      const admins = await prisma.user.findMany({
        where: { companyId: result.companyId, role: 'Admin', status: 'Active' },
        select: { id: true, phone: true },
      });
      for (const admin of admins) {
        notificationService
          .notifyWalletFunded(
            result.companyId,
            admin.id,
            result.walletId,
            mainWallet?.name ?? 'Main Wallet',
            result.amount,
            mainWallet?.balance ?? 0,
            (req.body as MpesaC2BConfirmationBody).TransID,
          )
          .catch((err) => logger.error('C2B notify failed', { err }));

        if (admin.phone) {
          smsService
            .notifyMpesaPayment(
              admin.phone,
              result.amount,
              (req.body as MpesaC2BConfirmationBody).TransID,
            )
            .catch((err) => logger.error('C2B SMS failed', { err }));
        }
      }
    }
  } catch (err) {
    logger.error('C2B confirmation processing error', { err });
  }
});

// B2C / B2B payout result
app.post('/api/mpesa/b2c/result', async (req: Request, res: Response) => {
  res.json({ ResultCode: '0', ResultDesc: 'Accepted' });
  try {
    await mpesaService.handlePayoutResult(req.body as MpesaB2CResultBody);
  } catch (err) {
    logger.error('B2C result processing error', { err });
  }
});

// B2C / B2B payout timeout
app.post('/api/mpesa/b2c/timeout', async (req: Request, res: Response) => {
  res.json({ ResultCode: '0', ResultDesc: 'Accepted' });
  try {
    await mpesaService.handlePayoutTimeout(req.body as MpesaB2CResultBody);
  } catch (err) {
    logger.error('B2C timeout processing error', { err });
  }
});

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
