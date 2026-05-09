import AfricasTalking from 'africastalking';
import env from '../config/env';
import logger from '../utils/logger';

class SmsService {
  private at: ReturnType<typeof AfricasTalking> | null = null;

  private getClient() {
    if (!this.at) {
      if (!env.AT_API_KEY) throw new Error('Africa\'s Talking API key not configured');
      this.at = AfricasTalking({ apiKey: env.AT_API_KEY, username: env.AT_USERNAME });
    }
    return this.at;
  }

  async sendSMS(to: string | string[], message: string): Promise<void> {
    if (!env.AT_API_KEY) {
      logger.warn(`SMS skipped (AT not configured): ${message.slice(0, 40)}`);
      return;
    }
    try {
      const numbers = Array.isArray(to) ? to : [to];
      const validNumbers = numbers.map(n => n.startsWith('+') ? n : `+254${n.replace(/^0/, '')}`);

      const sms = this.getClient().SMS;
      const result = await sms.send({
        to: validNumbers,
        message,
        from: env.AT_SENDER_ID,
      });
      logger.info('SMS sent', { recipients: validNumbers.length, result: result.SMSMessageData?.Message });
    } catch (err) {
      logger.error('Failed to send SMS', { err, to });
    }
  }

  // ── Convenience methods ──────────────────────────────────────────────────────

  async notifyExpenseApproved(phone: string, name: string, title: string, amount: number) {
    return this.sendSMS(
      phone,
      `Hi ${name}, your expense "${title}" for KES ${amount.toLocaleString()} has been approved. Funds are now in your wallet. - Spendy`,
    );
  }

  async notifyExpenseRejected(phone: string, name: string, title: string, reason?: string) {
    const msg = reason
      ? `Hi ${name}, your expense "${title}" was rejected. Reason: ${reason} - Spendy`
      : `Hi ${name}, your expense "${title}" was rejected. Log in for details. - Spendy`;
    return this.sendSMS(phone, msg);
  }

  async notifyWalletFunded(phone: string, name: string, amount: number, walletName: string) {
    return this.sendSMS(
      phone,
      `Hi ${name}, KES ${amount.toLocaleString()} has been added to your ${walletName}. - Spendy`,
    );
  }

  async notifyMpesaPayment(phone: string, amount: number, reference: string) {
    return this.sendSMS(
      phone,
      `Spendy: KES ${amount.toLocaleString()} received. Ref: ${reference}. Your wallet has been credited.`,
    );
  }
}

export const smsService = new SmsService();
