import cron from 'node-cron';
import prisma from '../config/database';
import logger from '../utils/logger';
import { EventStatus } from '@prisma/client';
import { mpesaService } from './mpesa.service';

const TERMINAL = [EventStatus.Archived, EventStatus.Cancelled, EventStatus.Completed];

async function archiveExpiredEventsImpl() {
  const now = new Date();
  const result = await prisma.event.updateMany({
    where: { endDate: { lt: now }, status: { notIn: TERMINAL } },
    data: { status: EventStatus.Archived },
  });
  if (result.count > 0) {
    logger.info(`Archived ${result.count} expired event(s)`);
  }
  return result;
}

export function scheduleEventArchiving() {
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('Running event archiving cron job...');
      await archiveExpiredEventsImpl();
    } catch (err) {
      logger.error('Error in event archiving cron job', { err });
    }
  });
  logger.info('Event archiving cron job scheduled (runs daily at midnight)');
}

export async function archiveExpiredEvents() {
  try {
    return await archiveExpiredEventsImpl();
  } catch (err) {
    logger.error('Error archiving expired events', { err });
    throw err;
  }
}

export function scheduleMpesaReconciliation() {
  // Every 15 minutes — queries Safaricom for STK requests pending > 5 min
  cron.schedule('*/15 * * * *', async () => {
    try {
      await mpesaService.reconcilePendingTopups();
    } catch (err) {
      logger.error('Error in M-Pesa reconciliation cron', { err });
    }
  });
  logger.info('M-Pesa reconciliation cron scheduled (every 15 minutes)');
}

export function initializeCronJobs() {
  scheduleEventArchiving();
  scheduleMpesaReconciliation();
  logger.info('All cron jobs initialized');
}
