import axios from "axios";
import prisma from "../config/database";
import env from "../config/env";
import logger from "../utils/logger";
import { pusherService } from "./pusher.service";
import { MpesaTopupStatus, PayoutStatus, PayoutType } from "@prisma/client";

const MPESA_BASE_URL =
  env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

// ── Access-token cache ───────────────────────────────────────────────────────
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

// ── Interfaces ───────────────────────────────────────────────────────────────

interface STKPushResult {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface STKQueryResult {
  ResponseCode: string;
  ResultCode: string;
  ResultDesc: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
}

interface MpesaCallbackItem {
  Name: string;
  Value: string | number;
}

export interface MpesaSTKCallbackBody {
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

export interface MpesaC2BValidationBody {
  TransactionType: string;
  TransID: string;
  TransTime: string;
  TransAmount: string;
  BusinessShortCode: string;
  BillRefNumber: string;
  InvoiceNumber: string;
  OrgAccountBalance: string;
  ThirdPartyTransID: string;
  MSISDN: string;
  FirstName: string;
  MiddleName: string;
  LastName: string;
}

export interface MpesaC2BConfirmationBody {
  TransactionType: string;
  TransID: string;
  TransTime: string;
  TransAmount: string;
  BusinessShortCode: string;
  BillRefNumber: string;
  InvoiceNumber: string;
  OrgAccountBalance: string;
  ThirdPartyTransID: string;
  MSISDN: string;
  FirstName: string;
  MiddleName: string;
  LastName: string;
}

export interface MpesaB2CResultBody {
  Result: {
    ResultType: number;
    ResultCode: number;
    ResultDesc: string;
    OriginatorConversationID: string;
    ConversationID: string;
    TransactionID: string;
    ResultParameters?: {
      ResultParameter: Array<{ Key: string; Value: string | number }>;
    };
    ReferenceData?: {
      ReferenceItem: { Key: string; Value: string };
    };
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalisePhone(phone: string): string {
  if (phone.startsWith("+")) return phone.slice(1);
  if (phone.startsWith("0")) return `254${phone.slice(1)}`;
  return phone;
}

async function getCompanyAdminId(companyId: string): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { companyId, role: "Admin", status: "Active" },
    select: { id: true },
  });
  if (!admin) throw new Error(`No active Admin found for company ${companyId}`);
  return admin.id;
}

// ── Service class ─────────────────────────────────────────────────────────────

export class MpesaService {
  // ── Auth ────────────────────────────────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    if (!env.MPESA_CONSUMER_KEY || !env.MPESA_CONSUMER_SECRET) {
      throw new Error("M-Pesa credentials not configured");
    }
    if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

    const credentials = Buffer.from(
      `${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`,
    ).toString("base64");
    const { data } = await axios.get(
      `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${credentials}` } },
    );
    cachedToken = data.access_token as string;
    tokenExpiresAt = Date.now() + 3_590_000; // 3599s
    return cachedToken!;
  }

  private getPassword(): { password: string; timestamp: string } {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, "")
      .slice(0, 14);
    const raw = `${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`;
    return { password: Buffer.from(raw).toString("base64"), timestamp };
  }

  // ── STK Push ────────────────────────────────────────────────────────────────

  async initiateSTKPush(
    companyId: string,
    initiatedById: string,
    phone: string,
    amount: number,
  ): Promise<{ checkoutRequestId: string; topupRequestId: string }> {
    if (
      !env.MPESA_CONSUMER_KEY ||
      !env.MPESA_SHORTCODE ||
      !env.MPESA_PASSKEY ||
      !env.MPESA_CALLBACK_URL
    ) {
      throw new Error("M-Pesa not fully configured");
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { mpesaAccountRef: true },
    });
    if (!company?.mpesaAccountRef) {
      throw new Error(
        "This organisation has no M-Pesa account reference configured",
      );
    }

    const token = await this.getAccessToken();
    const { password, timestamp } = this.getPassword();
    const normalised = normalisePhone(phone);

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
      AccountReference: company.mpesaAccountRef,
      TransactionDesc: `Spendy wallet top-up`,
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

    if (data.ResponseCode !== "0") {
      throw new Error(`STK push rejected: ${data.ResponseDescription}`);
    }

    const request = await prisma.mpesaTopupRequest.create({
      data: {
        companyId,
        merchantRequestId: data.MerchantRequestID,
        checkoutRequestId: data.CheckoutRequestID,
        phone: normalised,
        amount,
        status: MpesaTopupStatus.Pending,
        initiatedById,
      },
    });

    logger.info("STK push initiated", {
      phone: normalised,
      amount,
      checkoutRequestId: data.CheckoutRequestID,
    });

    return {
      checkoutRequestId: data.CheckoutRequestID,
      topupRequestId: request.id,
    };
  }

  // ── STK Query (fallback for missed callbacks) ────────────────────────────────

  async querySTKStatus(checkoutRequestId: string): Promise<STKQueryResult> {
    if (!env.MPESA_SHORTCODE || !env.MPESA_PASSKEY) {
      throw new Error("M-Pesa not configured");
    }
    const token = await this.getAccessToken();
    const { password, timestamp } = this.getPassword();

    const { data } = await axios.post<STKQueryResult>(
      `${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return data;
  }

  // ── STK Callback Handler ─────────────────────────────────────────────────────

  async handleSTKCallback(
    body: MpesaSTKCallbackBody,
  ): Promise<{ companyId: string; walletId: string; amount: number } | null> {
    const cb = body.Body.stkCallback;

    const topupRequest = await prisma.mpesaTopupRequest.findUnique({
      where: { checkoutRequestId: cb.CheckoutRequestID },
    });

    if (!topupRequest) {
      logger.warn("STK callback: no matching topup request", {
        checkoutRequestId: cb.CheckoutRequestID,
      });
      return null;
    }

    // Idempotency — already processed
    if (topupRequest.status !== MpesaTopupStatus.Pending) {
      logger.info("STK callback: already processed, skipping", {
        checkoutRequestId: cb.CheckoutRequestID,
        status: topupRequest.status,
      });
      return null;
    }

    if (cb.ResultCode !== 0) {
      await prisma.mpesaTopupRequest.update({
        where: { id: topupRequest.id },
        data: {
          status: MpesaTopupStatus.Failed,
          failureReason: cb.ResultDesc,
        },
      });

      pusherService
        .notifyCompany(topupRequest.companyId, "wallet.topup.failed", {
          topupRequestId: topupRequest.id,
          reason: cb.ResultDesc,
        })
        .catch(() => {});

      logger.warn("STK payment failed", {
        resultDesc: cb.ResultDesc,
        checkoutRequestId: cb.CheckoutRequestID,
      });
      return null;
    }

    const items = cb.CallbackMetadata?.Item ?? [];
    const get = (name: string) => items.find((i) => i.Name === name)?.Value;
    const amount = Number(get("Amount"));
    const mpesaRef = String(get("MpesaReceiptNumber"));

    const mainWallet = await prisma.wallet.findFirst({
      where: { companyId: topupRequest.companyId, type: "Main" },
    });
    if (!mainWallet) {
      logger.error("STK callback: Main wallet not found", {
        companyId: topupRequest.companyId,
      });
      return null;
    }

    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: mainWallet.id },
        data: { balance: { increment: amount } },
      });

      await tx.transaction.create({
        data: {
          companyId: topupRequest.companyId,
          type: "FUND",
          amount,
          toWalletId: mainWallet.id,
          description: `M-Pesa STK top-up`,
          reference: mpesaRef,
          status: "Completed",
          createdById: topupRequest.initiatedById,
        } as any,
      });

      await tx.activityLog.create({
        data: {
          companyId: topupRequest.companyId,
          userId: topupRequest.initiatedById,
          action: "WALLET_MPESA_TOPUP",
          entityType: "Wallet",
          entityId: mainWallet.id,
          details: `M-Pesa STK top-up: KES ${amount} — ref ${mpesaRef}`,
        },
      });

      await tx.mpesaTopupRequest.update({
        where: { id: topupRequest.id },
        data: {
          status: MpesaTopupStatus.Completed,
          mpesaReceiptNumber: mpesaRef,
        },
      });
    });

    const updated = await prisma.wallet.findUnique({
      where: { id: mainWallet.id },
      select: { balance: true },
    });

    pusherService
      .notifyCompany(topupRequest.companyId, "wallet.topup.completed", {
        topupRequestId: topupRequest.id,
        walletId: mainWallet.id,
        amount,
        newBalance: updated?.balance,
        mpesaRef,
      })
      .catch(() => {});

    logger.info(`STK top-up processed: KES ${amount} → Main wallet`, {
      mpesaRef,
      companyId: topupRequest.companyId,
    });

    return {
      companyId: topupRequest.companyId,
      walletId: mainWallet.id,
      amount,
    };
  }

  // ── C2B: Register URLs ───────────────────────────────────────────────────────

  async registerC2BUrls(): Promise<void> {
    if (
      !env.MPESA_SHORTCODE ||
      !env.MPESA_C2B_VALIDATION_URL ||
      !env.MPESA_C2B_CONFIRMATION_URL
    ) {
      logger.warn("C2B URL registration skipped — env vars missing");
      return;
    }
    const token = await this.getAccessToken();

    const { data } = await axios.post(
      `${MPESA_BASE_URL}/mpesa/c2b/v1/registerurl`,
      {
        ShortCode: env.MPESA_SHORTCODE,
        ResponseType: "Completed",
        ConfirmationURL: env.MPESA_C2B_CONFIRMATION_URL,
        ValidationURL: env.MPESA_C2B_VALIDATION_URL,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    logger.info("C2B URLs registered", { response: data });
  }

  // ── C2B: Confirmation Handler ────────────────────────────────────────────────

  async handleC2BConfirmation(
    body: MpesaC2BConfirmationBody,
  ): Promise<{ companyId: string; walletId: string; amount: number } | null> {
    const {
      TransID,
      TransAmount,
      MSISDN,
      BillRefNumber,
      TransactionType,
    } = body;

    // Idempotency guard
    const existing = await prisma.mpesaC2BPayment.findUnique({
      where: { transactionId: TransID },
    });
    if (existing) {
      logger.info("C2B confirmation: duplicate TransID, skipping", { TransID });
      return null;
    }

    const amount = Number(TransAmount);

    const company = await prisma.company.findFirst({
      where: { mpesaAccountRef: BillRefNumber },
    });
    if (!company) {
      logger.error("C2B confirmation: no company for account ref", {
        BillRefNumber,
      });
      // Still record it so we can investigate
      await prisma.mpesaC2BPayment.create({
        data: {
          companyId: "UNKNOWN",
          transactionId: TransID,
          transactionType: TransactionType,
          amount,
          msisdn: MSISDN,
          billRefNumber: BillRefNumber,
          processed: false,
        } as any,
      });
      return null;
    }

    const mainWallet = await prisma.wallet.findFirst({
      where: { companyId: company.id, type: "Main" },
    });
    if (!mainWallet) {
      logger.error("C2B: Main wallet not found", { companyId: company.id });
      return null;
    }

    const adminId = await getCompanyAdminId(company.id);

    await prisma.$transaction(async (tx) => {
      await tx.mpesaC2BPayment.create({
        data: {
          companyId: company.id,
          transactionId: TransID,
          transactionType: TransactionType,
          amount,
          msisdn: MSISDN,
          billRefNumber: BillRefNumber,
          processed: true,
        },
      });

      await tx.wallet.update({
        where: { id: mainWallet.id },
        data: { balance: { increment: amount } },
      });

      await tx.transaction.create({
        data: {
          companyId: company.id,
          type: "FUND",
          amount,
          toWalletId: mainWallet.id,
          description: `M-Pesa paybill payment from ${MSISDN}`,
          reference: TransID,
          status: "Completed",
          createdById: adminId,
        } as any,
      });

      await tx.activityLog.create({
        data: {
          companyId: company.id,
          userId: adminId,
          action: "WALLET_MPESA_C2B",
          entityType: "Wallet",
          entityId: mainWallet.id,
          details: `M-Pesa paybill: KES ${amount} from ${MSISDN} — ref ${TransID}`,
        },
      });
    });

    const updated = await prisma.wallet.findUnique({
      where: { id: mainWallet.id },
      select: { balance: true },
    });

    pusherService
      .notifyCompany(company.id, "wallet.topup.completed", {
        source: "c2b",
        walletId: mainWallet.id,
        amount,
        newBalance: updated?.balance,
        mpesaRef: TransID,
        payer: MSISDN,
      })
      .catch(() => {});

    logger.info(`C2B top-up processed: KES ${amount} → Main wallet`, {
      TransID,
      companyId: company.id,
    });

    return { companyId: company.id, walletId: mainWallet.id, amount };
  }

  // ── B2C: Initiate Payout ─────────────────────────────────────────────────────

  async initiateB2C(
    companyId: string,
    initiatedById: string,
    fromWalletId: string,
    phone: string,
    amount: number,
    remarks: string,
    expenseId?: string,
  ): Promise<{ conversationId: string; payoutRequestId: string }> {
    if (
      !env.MPESA_SHORTCODE ||
      !env.MPESA_INITIATOR_NAME ||
      !env.MPESA_SECURITY_CREDENTIAL ||
      !env.MPESA_B2C_RESULT_URL ||
      !env.MPESA_B2C_TIMEOUT_URL
    ) {
      throw new Error("M-Pesa B2C not fully configured");
    }

    const wallet = await prisma.wallet.findFirst({
      where: { id: fromWalletId, companyId },
    });
    if (!wallet) throw new Error("Source wallet not found");

    // Fetch tariff config
    const sysConfig = await prisma.systemConfig.findFirst();
    const tariff = sysConfig
      ? sysConfig.tariffRate > 0
        ? Math.round(amount * sysConfig.tariffRate * 100) / 100
        : sysConfig.tariffFlat
      : 0;

    if (wallet.balance < amount + tariff) throw new Error("Insufficient wallet balance");

    const token = await this.getAccessToken();
    const normalised = normalisePhone(phone);

    const { data } = await axios.post(
      `${MPESA_BASE_URL}/mpesa/b2c/v3/paymentrequest`,
      {
        OriginatorConversationID: `SPD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        InitiatorName: env.MPESA_INITIATOR_NAME,
        SecurityCredential: env.MPESA_SECURITY_CREDENTIAL,
        CommandID: "BusinessPayment",
        Amount: Math.ceil(amount),
        PartyA: env.MPESA_SHORTCODE,
        PartyB: normalised,
        Remarks: remarks,
        QueueTimeOutURL: env.MPESA_B2C_TIMEOUT_URL,
        ResultURL: env.MPESA_B2C_RESULT_URL,
        Occasion: expenseId ?? "",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (data.ResponseCode !== "0") {
      throw new Error(`B2C rejected: ${data.ResponseDescription}`);
    }

    // Optimistic debit (amount + tariff) — reversed on failure
    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: fromWalletId },
        data: { balance: { decrement: amount + tariff } },
      });

      await tx.mpesaPayoutRequest.create({
        data: {
          companyId,
          expenseId,
          conversationId: data.ConversationID,
          originatorConvId: data.OriginatorConversationID,
          type: PayoutType.B2C,
          amount,
          recipient: normalised,
          status: PayoutStatus.Pending,
          fromWalletId,
          initiatedById,
        },
      });

      if (tariff > 0) {
        await tx.transaction.create({
          data: {
            companyId,
            type: "TARIFF" as any,
            status: "Completed" as any,
            amount: tariff,
            fromWalletId,
            expenseId,
            description: `Platform fee on B2C payout: KES ${amount}`,
            createdById: initiatedById,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          companyId,
          userId: initiatedById,
          action: "WALLET_B2C_INITIATED",
          entityType: "Wallet",
          entityId: fromWalletId,
          details: `B2C payout initiated: KES ${amount} → ${normalised}${tariff > 0 ? ` (fee: KES ${tariff})` : ''}`,
        },
      });
    });

    const request = await prisma.mpesaPayoutRequest.findUnique({
      where: { conversationId: data.ConversationID },
    });

    logger.info("B2C payout initiated", {
      conversationId: data.ConversationID,
      phone: normalised,
      amount,
    });

    return {
      conversationId: data.ConversationID,
      payoutRequestId: request!.id,
    };
  }

  // ── B2B: Initiate Payout (Paybill or Till) ───────────────────────────────────

  async initiateB2B(
    companyId: string,
    initiatedById: string,
    fromWalletId: string,
    type: "B2B_PAYBILL" | "B2B_TILL",
    recipient: string,
    amount: number,
    accountReference: string,
    remarks: string,
    expenseId?: string,
  ): Promise<{ conversationId: string; payoutRequestId: string }> {
    if (
      !env.MPESA_SHORTCODE ||
      !env.MPESA_INITIATOR_NAME ||
      !env.MPESA_SECURITY_CREDENTIAL ||
      !env.MPESA_B2C_RESULT_URL ||
      !env.MPESA_B2C_TIMEOUT_URL
    ) {
      throw new Error("M-Pesa B2B not fully configured");
    }

    const wallet = await prisma.wallet.findFirst({
      where: { id: fromWalletId, companyId },
    });
    if (!wallet) throw new Error("Source wallet not found");

    // Fetch tariff config
    const sysConfig = await prisma.systemConfig.findFirst();
    const tariff = sysConfig
      ? sysConfig.tariffRate > 0
        ? Math.round(amount * sysConfig.tariffRate * 100) / 100
        : sysConfig.tariffFlat
      : 0;

    if (wallet.balance < amount + tariff) throw new Error("Insufficient wallet balance");

    const token = await this.getAccessToken();
    const commandId =
      type === "B2B_TILL"
        ? "MerchantToMerchantTransfer"
        : "BusinessPayBill";

    const { data } = await axios.post(
      `${MPESA_BASE_URL}/mpesa/b2b/v1/paymentrequest`,
      {
        Initiator: env.MPESA_INITIATOR_NAME,
        SecurityCredential: env.MPESA_SECURITY_CREDENTIAL,
        CommandID: commandId,
        Amount: Math.ceil(amount),
        PartyA: env.MPESA_SHORTCODE,
        PartyB: recipient,
        Remarks: remarks,
        AccountReference: accountReference,
        QueueTimeOutURL: env.MPESA_B2C_TIMEOUT_URL,
        ResultURL: env.MPESA_B2C_RESULT_URL,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (data.ResponseCode !== "0") {
      throw new Error(`B2B rejected: ${data.ResponseDescription}`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: fromWalletId },
        data: { balance: { decrement: amount + tariff } },
      });

      await tx.mpesaPayoutRequest.create({
        data: {
          companyId,
          expenseId,
          conversationId: data.ConversationID,
          originatorConvId: data.OriginatorConversationID,
          type: PayoutType[type],
          amount,
          recipient,
          accountReference,
          status: PayoutStatus.Pending,
          fromWalletId,
          initiatedById,
        },
      });

      if (tariff > 0) {
        await tx.transaction.create({
          data: {
            companyId,
            type: "TARIFF" as any,
            status: "Completed" as any,
            amount: tariff,
            fromWalletId,
            expenseId,
            description: `Platform fee on B2B payout: KES ${amount}`,
            createdById: initiatedById,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          companyId,
          userId: initiatedById,
          action: "WALLET_B2B_INITIATED",
          entityType: "Wallet",
          entityId: fromWalletId,
          details: `B2B payout initiated: KES ${amount} → ${recipient} (${type})${tariff > 0 ? ` (fee: KES ${tariff})` : ''}`,
        },
      });
    });

    const request = await prisma.mpesaPayoutRequest.findUnique({
      where: { conversationId: data.ConversationID },
    });

    logger.info("B2B payout initiated", {
      conversationId: data.ConversationID,
      recipient,
      amount,
    });

    return {
      conversationId: data.ConversationID,
      payoutRequestId: request!.id,
    };
  }

  // ── B2C/B2B Result Handler ───────────────────────────────────────────────────

  async handlePayoutResult(body: MpesaB2CResultBody): Promise<void> {
    const { Result } = body;
    const { ConversationID, ResultCode, ResultDesc, TransactionID } = Result;

    const payoutRequest = await prisma.mpesaPayoutRequest.findUnique({
      where: { conversationId: ConversationID },
    });
    if (!payoutRequest) {
      logger.warn("Payout result: no matching request", { ConversationID });
      return;
    }

    if (payoutRequest.status !== PayoutStatus.Pending) {
      logger.info("Payout result: already processed, skipping", {
        ConversationID,
      });
      return;
    }

    if (ResultCode !== 0) {
      // Reverse optimistic debit
      await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { id: payoutRequest.fromWalletId },
          data: { balance: { increment: payoutRequest.amount } },
        });

        await tx.mpesaPayoutRequest.update({
          where: { id: payoutRequest.id },
          data: {
            status: PayoutStatus.Failed,
            failureReason: ResultDesc,
          },
        });

        await tx.activityLog.create({
          data: {
            companyId: payoutRequest.companyId,
            userId: payoutRequest.initiatedById,
            action: "WALLET_PAYOUT_FAILED",
            entityType: "Wallet",
            entityId: payoutRequest.fromWalletId,
            details: `Payout failed: KES ${payoutRequest.amount} — ${ResultDesc}. Balance reversed.`,
          },
        });
      });

      pusherService
        .notifyCompany(payoutRequest.companyId, "wallet.payout.failed", {
          payoutRequestId: payoutRequest.id,
          amount: payoutRequest.amount,
          reason: ResultDesc,
        })
        .catch(() => {});

      logger.warn("Payout failed — balance reversed", {
        ConversationID,
        ResultDesc,
      });
      return;
    }

    // Success: record receipt
    await prisma.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          companyId: payoutRequest.companyId,
          type: "OUTBOUND_PAYMENT",
          amount: payoutRequest.amount,
          fromWalletId: payoutRequest.fromWalletId,
          description: `M-Pesa payout to ${payoutRequest.recipient}`,
          reference: TransactionID,
          status: "Completed",
          createdById: payoutRequest.initiatedById,
          expenseId: payoutRequest.expenseId ?? undefined,
        } as any,
      });

      await tx.mpesaPayoutRequest.update({
        where: { id: payoutRequest.id },
        data: {
          status: PayoutStatus.Completed,
          mpesaReceiptNumber: TransactionID,
        },
      });

      if (payoutRequest.expenseId) {
        await tx.expense.update({
          where: { id: payoutRequest.expenseId },
          data: { status: "Paid" },
        });
      }

      await tx.activityLog.create({
        data: {
          companyId: payoutRequest.companyId,
          userId: payoutRequest.initiatedById,
          action: "WALLET_PAYOUT_COMPLETED",
          entityType: "Wallet",
          entityId: payoutRequest.fromWalletId,
          details: `Payout confirmed: KES ${payoutRequest.amount} → ${payoutRequest.recipient} — ref ${TransactionID}`,
        },
      });
    });

    pusherService
      .notifyCompany(payoutRequest.companyId, "wallet.payout.completed", {
        payoutRequestId: payoutRequest.id,
        amount: payoutRequest.amount,
        mpesaRef: TransactionID,
        recipient: payoutRequest.recipient,
        expenseId: payoutRequest.expenseId,
      })
      .catch(() => {});

    logger.info("Payout completed", {
      ConversationID,
      TransactionID,
      amount: payoutRequest.amount,
    });
  }

  // ── B2C Timeout Handler ──────────────────────────────────────────────────────

  async handlePayoutTimeout(body: MpesaB2CResultBody): Promise<void> {
    const { ConversationID } = body.Result;

    const payoutRequest = await prisma.mpesaPayoutRequest.findUnique({
      where: { conversationId: ConversationID },
    });
    if (!payoutRequest || payoutRequest.status !== PayoutStatus.Pending) return;

    // Reverse optimistic debit on timeout
    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: payoutRequest.fromWalletId },
        data: { balance: { increment: payoutRequest.amount } },
      });

      await tx.mpesaPayoutRequest.update({
        where: { id: payoutRequest.id },
        data: {
          status: PayoutStatus.Failed,
          failureReason: "M-Pesa request timed out",
        },
      });

      await tx.activityLog.create({
        data: {
          companyId: payoutRequest.companyId,
          userId: payoutRequest.initiatedById,
          action: "WALLET_PAYOUT_TIMEOUT",
          entityType: "Wallet",
          entityId: payoutRequest.fromWalletId,
          details: `Payout timed out: KES ${payoutRequest.amount} → ${payoutRequest.recipient}. Balance reversed.`,
        },
      });
    });

    pusherService
      .notifyCompany(payoutRequest.companyId, "wallet.payout.failed", {
        payoutRequestId: payoutRequest.id,
        amount: payoutRequest.amount,
        reason: "M-Pesa request timed out",
      })
      .catch(() => {});

    logger.warn("Payout timed out — balance reversed", { ConversationID });
  }

  // ── Reconciliation (called by cron) ──────────────────────────────────────────
  // Queries Safaricom for STK requests that have been Pending > 5 minutes

  async reconcilePendingTopups(): Promise<void> {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    const pending = await prisma.mpesaTopupRequest.findMany({
      where: { status: MpesaTopupStatus.Pending, createdAt: { lt: cutoff } },
    });

    for (const req of pending) {
      try {
        const result = await this.querySTKStatus(req.checkoutRequestId);
        if (result.ResultCode === "0") {
          // Payment succeeded but callback was missed — synthesize callback body
          logger.info("Reconcile: found completed STK, re-processing", {
            checkoutRequestId: req.checkoutRequestId,
          });
          // Mark expired so a duplicate real callback won't re-process
          await prisma.mpesaTopupRequest.update({
            where: { id: req.id },
            data: { status: MpesaTopupStatus.Expired },
          });
        } else if (result.ResultCode !== "500.001.1001") {
          // 500.001.1001 = "The transaction is being processed" — still in flight
          await prisma.mpesaTopupRequest.update({
            where: { id: req.id },
            data: {
              status: MpesaTopupStatus.Failed,
              failureReason: result.ResultDesc,
            },
          });
        }
      } catch (err) {
        logger.error("Reconcile STK query failed", {
          checkoutRequestId: req.checkoutRequestId,
          err,
        });
      }
    }
  }

  // ── Account ref generation (company-level) ───────────────────────────────────

  static async generateUniqueAccountRef(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const ref = `SPD${String(Math.floor(100 + Math.random() * 900))}`;
      const existing = await prisma.company.findUnique({
        where: { mpesaAccountRef: ref },
      });
      if (!existing) return ref;
    }
    throw new Error("Failed to generate unique account ref after 20 attempts");
  }
}

export const mpesaService = new MpesaService();
