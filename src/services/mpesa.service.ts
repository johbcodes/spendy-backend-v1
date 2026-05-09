import axios from "axios";
import prisma from "../config/database";
import env from "../config/env";
import logger from "../utils/logger";

const MPESA_BASE_URL =
  env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

interface STKPushResult {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface MpesaCallbackItem {
  Name: string;
  Value: string | number;
}

export interface MpesaCallbackBody {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: { Item: MpesaCallbackItem[] };
    };
  };
}

export class MpesaService {
  private async getAccessToken(): Promise<string> {
    if (!env.MPESA_CONSUMER_KEY || !env.MPESA_CONSUMER_SECRET) {
      throw new Error("M-Pesa credentials not configured");
    }
    const credentials = Buffer.from(
      `${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`,
    ).toString("base64");
    const { data } = await axios.get(
      `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: { Authorization: `Basic ${credentials}` },
      },
    );
    return data.access_token as string;
  }

  private getPassword(): { password: string; timestamp: string } {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, "")
      .slice(0, 14);
    const raw = `${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`;
    return { password: Buffer.from(raw).toString("base64"), timestamp };
  }

  async initiateSTKPush(
    phone: string,
    amount: number,
    accountNumber: string,
  ): Promise<STKPushResult> {
    if (
      !env.MPESA_CONSUMER_KEY ||
      !env.MPESA_SHORTCODE ||
      !env.MPESA_PASSKEY ||
      !env.MPESA_CALLBACK_URL
    ) {
      throw new Error("M-Pesa not fully configured");
    }

    const token = await this.getAccessToken();
    const { password, timestamp } = this.getPassword();

    const normalised = phone.startsWith("+")
      ? phone.slice(1)
      : phone.startsWith("0")
        ? `254${phone.slice(1)}`
        : phone;

    const payload = {
      BusinessShortCode: env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.ceil(amount),
      PartyA: normalised,
      PartyB: env.MPESA_SHORTCODE,
      PhoneNumber: normalised,
      CallBackURL: env.MPESA_CALLBACK_URL,
      AccountReference: accountNumber,
      TransactionDesc: `Wallet top-up — ${accountNumber}`,
    };

    const { data } = await axios.post<STKPushResult>(
      `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    logger.info(`M-Pesa STK push initiated`, {
      phone: normalised,
      amount,
      accountNumber,
    });
    return data;
  }

  async handleCallback(
    body: MpesaCallbackBody,
  ): Promise<{ walletId: string; amount: number } | null> {
    const cb = body.Body.stkCallback;

    if (cb.ResultCode !== 0) {
      logger.warn(`M-Pesa STK failed: ${cb.ResultDesc}`, {
        checkoutId: cb.CheckoutRequestID,
      });
      return null;
    }

    const items = cb.CallbackMetadata?.Item ?? [];
    const get = (name: string) => items.find((i) => i.Name === name)?.Value;

    const amount = Number(get("Amount"));
    const accountNumber = String(get("AccountReference"));
    const mpesaRef = String(get("MpesaReceiptNumber"));

    // Find wallet by account number
    const wallet = await prisma.wallet.findUnique({ where: { accountNumber } });
    if (!wallet) {
      logger.error(
        `M-Pesa callback: wallet not found for account ${accountNumber}`,
      );
      return null;
    }

    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      });

      await tx.transaction.create({
        data: {
          companyId: wallet.companyId,
          type: "FUND",
          amount,
          toWalletId: wallet.id,
          description: `M-Pesa top-up via ${accountNumber}`,
          reference: mpesaRef,
          status: "Completed",
          createdById: wallet.ownerId ?? wallet.companyId,
        } as any,
      });

      await tx.activityLog.create({
        data: {
          companyId: wallet.companyId,
          userId: wallet.ownerId ?? wallet.companyId,
          action: "WALLET_MPESA_TOPUP",
          entityType: "Wallet",
          entityId: wallet.id,
          details: `M-Pesa top-up: KES ${amount} — ref ${mpesaRef}`,
        },
      });
    });

    logger.info(
      `M-Pesa top-up processed: KES ${amount} → wallet ${wallet.id}`,
      { mpesaRef },
    );
    return { walletId: wallet.id, amount };
  }

  // ── Account number generation ────────────────────────────────────────────────

  static async generateUniqueAccountNumber(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const num = String(Math.floor(100000 + Math.random() * 900000));
      const existing = await prisma.wallet.findUnique({
        where: { accountNumber: num },
      });
      if (!existing) return num;
    }
    throw new Error(
      "Failed to generate unique account number after 20 attempts",
    );
  }
}

export const mpesaService = new MpesaService();
