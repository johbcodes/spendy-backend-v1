import prisma from '../config/database';
import logger from '../utils/logger';
import { Prisma, TransactionType, TransactionStatus, InvoiceStatus, InvoiceDocumentType } from '@prisma/client';
import { emailService } from './email.service';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceLineItem {
  id: string;
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
  taxAmount?: number;
}

interface InvoicePayment {
  id: string;
  date: string;
  amount: number;
  method: string;
  reference?: string;
  notes?: string;
}

interface CreateInvoiceData {
  // Document Type
  documentType?: string; // Quote, Proforma, Invoice
  invoiceNumber?: string; // Allow custom invoice number

  // Client Information (for frontend invoices)
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;

  // Event Linkage
  eventId?: string;
  eventName?: string;

  // Legacy: Customer/Supplier (for simple backend invoices)
  customerName?: string;
  supplierName?: string;
  supplierId?: string;

  // Financial
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  discount?: number;
  discountType?: string; // percentage, fixed
  total: number;
  amountPaid?: number;
  balance?: number;
  currency?: string;

  // Payment Terms
  paymentTerms?: string;
  customPaymentTerms?: string;

  // Status
  status?: string;

  // Dates
  issueDate: string;
  dueDate?: string;

  // Items
  lineItems?: InvoiceLineItem[];
  items?: InvoiceItem[]; // Legacy field

  // Payments
  payments?: InvoicePayment[];

  // Metadata
  notes?: string;
  terms?: string; // Terms & Conditions
  paymentMethod?: string;
}

interface UpdateInvoiceData {
  // Document Type
  documentType?: string;

  // Client Information
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;

  // Event Linkage
  eventId?: string;
  eventName?: string;

  // Legacy fields
  customerName?: string;
  supplierName?: string;
  supplierId?: string;

  // Financial
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  discount?: number;
  discountType?: string;
  total?: number;
  amountPaid?: number;
  balance?: number;
  currency?: string;

  // Payment Terms
  paymentTerms?: string;
  customPaymentTerms?: string;

  // Status
  status?: string;

  // Dates
  issueDate?: string;
  dueDate?: string;

  // Items
  lineItems?: InvoiceLineItem[];
  items?: InvoiceItem[];

  // Payments
  payments?: InvoicePayment[];

  // Metadata
  notes?: string;
  terms?: string;
  paymentMethod?: string;
}

interface InvoiceQueryParams {
  status?: string;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
  limit?: string;
  offset?: string;
}

interface RecordPaymentData {
  amount: number;
  paymentMethod: string;
  walletId: string;
  notes?: string;
}

export class InvoiceService {
  async getAllInvoices(companyId: string, query: InvoiceQueryParams) {
    const limit = query.limit ? parseInt(query.limit) : 50;
    const offset = query.offset ? parseInt(query.offset) : 0;

    const where: Prisma.InvoiceWhereInput = {
      companyId,
      ...(query.status && { status: query.status as InvoiceStatus }),
      ...(query.supplierId && { supplierId: query.supplierId }),
      ...(query.startDate && {
        issueDate: {
          gte: new Date(query.startDate),
        },
      }),
      ...(query.endDate && {
        issueDate: {
          lte: new Date(query.endDate),
        },
      }),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          supplier: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      invoices,
      total,
      limit,
      offset,
    };
  }

  async getInvoiceById(invoiceId: string, companyId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        companyId,
      },
      include: {
        supplier: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        transactions: {
          include: {
            fromWallet: true,
            toWallet: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    return invoice;
  }

  async createInvoice(companyId: string, data: CreateInvoiceData, createdById: string) {
    // Use provided invoice number or generate one
    let invoiceNumber = data.invoiceNumber;

    if (!invoiceNumber) {
      // Generate invoice number based on document type
      const docPrefix = data.documentType === 'Quote' ? 'QT' :
                       data.documentType === 'Proforma' ? 'PF' : 'INV';

      const lastInvoice = await prisma.invoice.findFirst({
        where: {
          companyId,
          documentType: (data.documentType as InvoiceDocumentType | undefined) ?? InvoiceDocumentType.Invoice
        },
        orderBy: { createdAt: 'desc' },
        select: { invoiceNumber: true },
      });

      let nextNumber = 1;
      if (lastInvoice) {
        const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      invoiceNumber = `${docPrefix}-${String(nextNumber).padStart(4, '0')}`;
    }

    // Validate supplier if provided
    if (data.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: {
          id: data.supplierId,
          companyId,
        },
      });

      if (!supplier) {
        throw new Error('Supplier not found');
      }
    }

    // Calculate balance if not provided
    const balance = data.balance !== undefined ? data.balance : (data.total - (data.amountPaid || 0));

    const invoice = await prisma.invoice.create({
      data: {
        companyId,
        invoiceNumber,
        documentType: (data.documentType as InvoiceDocumentType | undefined) ?? InvoiceDocumentType.Invoice,

        // Client information
        clientId: data.clientId,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        clientAddress: data.clientAddress,

        // Event linkage
        eventId: data.eventId,
        eventName: data.eventName,

        // Legacy fields
        customerName: data.customerName,
        supplierName: data.supplierName,
        supplierId: data.supplierId,

        // Financial
        subtotal: data.subtotal,
        taxRate: data.taxRate || 0,
        taxAmount: data.taxAmount || 0,
        discount: data.discount || 0,
        discountType: data.discountType,
        total: data.total,
        amountPaid: data.amountPaid || 0,
        balance: balance,
        currency: data.currency || 'KES',

        // Payment terms
        paymentTerms: data.paymentTerms,
        customPaymentTerms: data.customPaymentTerms,

        // Status
        status: (data.status as InvoiceStatus | undefined) ?? InvoiceStatus.Draft,

        // Dates
        issueDate: new Date(data.issueDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,

        // Items
        lineItems: (data.lineItems || []) as any,
        items: data.items as any,

        // Payments
        payments: (data.payments || []) as any,

        // Metadata
        notes: data.notes,
        terms: data.terms,
        paymentMethod: data.paymentMethod,
        createdById,
      } as any,
      include: {
        supplier: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        companyId,
        userId: createdById,
        action: 'INVOICE_CREATED',
        entityType: 'Invoice',
        entityId: invoice.id,
        details: `${data.documentType || 'Invoice'} ${invoiceNumber} created for ${data.clientName || data.customerName || data.supplierName || 'Unknown'}`,
      },
    });

    logger.info(`${data.documentType || 'Invoice'} created: ${invoiceNumber}`);

    return invoice;
  }

  async updateInvoice(
    invoiceId: string,
    companyId: string,
    data: UpdateInvoiceData,
    updatedById: string
  ) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        companyId,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Validate supplier if provided
    if (data.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: {
          id: data.supplierId,
          companyId,
        },
      });

      if (!supplier) {
        throw new Error('Supplier not found');
      }
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        // Document type
        ...(data.documentType !== undefined && { documentType: data.documentType as InvoiceDocumentType }),

        // Client information
        ...(data.clientId !== undefined && { clientId: data.clientId }),
        ...(data.clientName !== undefined && { clientName: data.clientName }),
        ...(data.clientEmail !== undefined && { clientEmail: data.clientEmail }),
        ...(data.clientPhone !== undefined && { clientPhone: data.clientPhone }),
        ...(data.clientAddress !== undefined && { clientAddress: data.clientAddress }),

        // Event linkage
        ...(data.eventId !== undefined && { eventId: data.eventId }),
        ...(data.eventName !== undefined && { eventName: data.eventName }),

        // Legacy fields
        ...(data.customerName !== undefined && { customerName: data.customerName }),
        ...(data.supplierName !== undefined && { supplierName: data.supplierName }),
        ...(data.supplierId !== undefined && { supplierId: data.supplierId }),

        // Financial
        ...(data.subtotal !== undefined && { subtotal: data.subtotal }),
        ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
        ...(data.taxAmount !== undefined && { taxAmount: data.taxAmount }),
        ...(data.discount !== undefined && { discount: data.discount }),
        ...(data.discountType !== undefined && { discountType: data.discountType }),
        ...(data.total !== undefined && { total: data.total }),
        ...(data.amountPaid !== undefined && { amountPaid: data.amountPaid }),
        ...(data.balance !== undefined && { balance: data.balance }),
        ...(data.currency !== undefined && { currency: data.currency }),

        // Payment terms
        ...(data.paymentTerms !== undefined && { paymentTerms: data.paymentTerms }),
        ...(data.customPaymentTerms !== undefined && { customPaymentTerms: data.customPaymentTerms }),

        // Status
        ...(data.status !== undefined && { status: data.status }),

        // Dates
        ...(data.issueDate !== undefined && { issueDate: new Date(data.issueDate) }),
        ...(data.dueDate !== undefined && { dueDate: new Date(data.dueDate) }),

        // Items
        ...(data.lineItems !== undefined && { lineItems: data.lineItems as any }),
        ...(data.items !== undefined && { items: data.items as any }),

        // Payments
        ...(data.payments !== undefined && { payments: data.payments as any }),

        // Metadata
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.terms !== undefined && { terms: data.terms }),
        ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
      } as any,
      include: {
        supplier: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        companyId,
        userId: updatedById,
        action: 'INVOICE_UPDATED',
        entityType: 'Invoice',
        entityId: invoice.id,
        details: `Invoice ${invoice.invoiceNumber} updated`,
      },
    });

    logger.info(`Invoice updated: ${invoice.invoiceNumber}`);

    return updatedInvoice;
  }

  async deleteInvoice(invoiceId: string, companyId: string, deletedById: string) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        companyId,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Check if invoice has transactions
    const transactionCount = await prisma.transaction.count({
      where: { invoiceId },
    });

    if (transactionCount > 0) {
      throw new Error('Cannot delete invoice with associated transactions');
    }

    await prisma.invoice.delete({
      where: { id: invoiceId },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        companyId,
        userId: deletedById,
        action: 'INVOICE_DELETED',
        entityType: 'Invoice',
        entityId: invoice.id,
        details: `Invoice ${invoice.invoiceNumber} deleted`,
      },
    });

    logger.info(`Invoice deleted: ${invoice.invoiceNumber}`);
  }

  async recordPayment(
    invoiceId: string,
    companyId: string,
    data: RecordPaymentData,
    userId: string
  ) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        companyId,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Validate wallet
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: data.walletId,
        companyId,
      },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const remainingAmount = invoice.total - invoice.amountPaid;

    if (data.amount > remainingAmount) {
      throw new Error('Payment amount exceeds remaining invoice amount');
    }

    if (wallet.balance < data.amount) {
      throw new Error('Insufficient wallet balance');
    }

    // Calculate new paid amount and status
    const newPaidAmount = invoice.amountPaid + data.amount;
    let newStatus: InvoiceStatus = InvoiceStatus.PartiallyPaid;
    if (newPaidAmount >= invoice.total) newStatus = InvoiceStatus.Paid;

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          companyId,
          type: TransactionType.OUTBOUND_PAYMENT,
          amount: data.amount,
          fromWalletId: data.walletId,
          description: `Payment for invoice ${invoice.invoiceNumber}`,
          reference: invoice.invoiceNumber,
          invoiceId: invoice.id,
          status: TransactionStatus.Completed,
          createdById: userId,
        },
      });

      // Update wallet balance
      await tx.wallet.update({
        where: { id: data.walletId },
        data: {
          balance: {
            decrement: data.amount,
          },
        },
      });

      // Update invoice
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newPaidAmount,
          status: newStatus,
          paymentMethod: data.paymentMethod,
        },
        include: {
          supplier: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          transactions: true,
        },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          companyId,
          userId,
          action: 'INVOICE_PAYMENT_RECORDED',
          entityType: 'Invoice',
          entityId: invoice.id,
          details: `Payment of ${data.amount} recorded for invoice ${invoice.invoiceNumber}`,
        },
      });

      return { invoice: updatedInvoice, transaction };
    });

    logger.info(`Payment recorded for invoice: ${invoice.invoiceNumber}, amount: ${data.amount}`);

    const creator = result.invoice.createdBy;
    const statusLabel = newStatus === InvoiceStatus.Paid ? 'fully paid' : 'partially paid';
    emailService
      .sendEmail(
        creator.email,
        `Invoice ${invoice.invoiceNumber} — payment received`,
        'invoice-payment',
        {
          firstName: creator.firstName,
          invoiceNumber: invoice.invoiceNumber,
          amount: data.amount.toLocaleString(),
          statusLabel,
          amountPaid: newPaidAmount.toLocaleString(),
          total: invoice.total.toLocaleString(),
          reference: invoice.invoiceNumber,
        },
      )
      .catch((err) => logger.error('Invoice payment email failed', { err }));

    return result;
  }
}
