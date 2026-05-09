import nodemailer, { Transporter } from 'nodemailer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import env from '../config/env';
import logger from '../utils/logger';

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'email');

class EmailService {
  private transporter: Transporter | null = null;
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  private getTransporter(): Transporter {
    if (!this.transporter) {
      if (!env.SMTP_USER || !env.SMTP_PASS) {
        throw new Error('SMTP credentials not configured');
      }
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: parseInt(env.SMTP_PORT),
        secure: env.SMTP_PORT === '465',
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      });
    }
    return this.transporter;
  }

  private getTemplate(name: string): HandlebarsTemplateDelegate {
    if (!this.templates.has(name)) {
      const filePath = path.join(TEMPLATES_DIR, `${name}.hbs`);
      if (!fs.existsSync(filePath)) throw new Error(`Email template "${name}" not found`);
      const source = fs.readFileSync(filePath, 'utf-8');
      this.templates.set(name, Handlebars.compile(source));
    }
    return this.templates.get(name)!;
  }

  async sendEmail(to: string, subject: string, template: string, data: Record<string, unknown>) {
    if (!env.SMTP_USER || !env.SMTP_PASS) {
      logger.warn(`Email skipped (SMTP not configured): ${subject} → ${to}`);
      return;
    }
    try {
      const html = this.getTemplate(template)({ ...data, date: new Date().toLocaleString('en-KE') });
      await this.getTransporter().sendMail({ from: env.EMAIL_FROM, to, subject, html });
      logger.info(`Email sent: ${subject} → ${to}`);
    } catch (err) {
      logger.error(`Failed to send email "${subject}" to ${to}`, { err });
    }
  }

  // ── Convenience methods ──────────────────────────────────────────────────────

  async sendWalletFunded(to: string, data: {
    firstName: string;
    walletName: string;
    amount: number;
    newBalance: number;
    reference: string;
  }) {
    return this.sendEmail(to, `Wallet Funded: KES ${data.amount.toLocaleString()}`, 'wallet-funded', data);
  }

  async sendExpenseApproved(to: string, data: {
    firstName: string;
    expenseTitle: string;
    approvedAmount: number;
    approverName: string;
    notes?: string;
  }) {
    return this.sendEmail(to, `Expense Approved: ${data.expenseTitle}`, 'expense-approved', data);
  }

  async sendExpenseRejected(to: string, data: {
    firstName: string;
    expenseTitle: string;
    amount: number;
    approverName: string;
    reason?: string;
  }) {
    return this.sendEmail(to, `Expense Rejected: ${data.expenseTitle}`, 'expense-rejected', data);
  }

  async sendExpenseSubmitted(to: string, data: {
    firstName: string;
    staffName: string;
    expenseTitle: string;
    amount: number;
    category?: string;
    eventName?: string;
  }) {
    return this.sendEmail(to, `New Expense Request: ${data.expenseTitle}`, 'expense-submitted', data);
  }

  async sendWelcome(to: string, data: {
    firstName: string;
    email: string;
    password: string;
    role: string;
    createdByName: string;
    loginUrl?: string;
  }) {
    return this.sendEmail(to, 'Welcome to Spendy', 'welcome', {
      ...data,
      loginUrl: data.loginUrl ?? 'https://app.spendy.co.ke',
    });
  }
}

export const emailService = new EmailService();
