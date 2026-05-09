import Pusher from 'pusher';
import env from '../config/env';
import logger from '../utils/logger';

class PusherService {
  private client: Pusher | null = null;

  private getClient(): Pusher {
    if (!this.client) {
      if (!env.PUSHER_APP_ID || !env.PUSHER_KEY || !env.PUSHER_SECRET) {
        throw new Error('Pusher credentials not configured');
      }
      this.client = new Pusher({
        appId: env.PUSHER_APP_ID,
        key: env.PUSHER_KEY,
        secret: env.PUSHER_SECRET,
        cluster: env.PUSHER_CLUSTER,
        useTLS: true,
      });
    }
    return this.client;
  }

  async trigger(channel: string, event: string, data: unknown): Promise<void> {
    if (!env.PUSHER_APP_ID || !env.PUSHER_KEY || !env.PUSHER_SECRET) {
      logger.debug(`Pusher skipped (not configured): ${event} on ${channel}`);
      return;
    }
    try {
      await this.getClient().trigger(channel, event, data);
      logger.debug(`Pusher event fired: ${event} on ${channel}`);
    } catch (err) {
      logger.error(`Failed to trigger Pusher event ${event}`, { err });
    }
  }

  // ── User-scoped helpers ──────────────────────────────────────────────────────

  userChannel(userId: string) {
    return `private-user-${userId}`;
  }

  companyChannel(companyId: string) {
    return `private-company-${companyId}`;
  }

  async notifyUser(userId: string, event: string, data: unknown) {
    return this.trigger(this.userChannel(userId), event, data);
  }

  async notifyCompany(companyId: string, event: string, data: unknown) {
    return this.trigger(this.companyChannel(companyId), event, data);
  }

  authorizeChannel(socketId: string, channelName: string): { auth: string; channel_data?: string } {
    return this.getClient().authorizeChannel(socketId, channelName);
  }
}

export const pusherService = new PusherService();
