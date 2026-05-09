import { z } from 'zod';

const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Item description is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  total: z.number().min(0, 'Total must be non-negative'),
});

const invoiceLineItemSchema = z.object({
  id: z.string().optional(),
  itemName: z.string().optional(),
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  amount: z.number(),
  taxRate: z.number().optional(),
  taxAmount: z.number().optional(),
});

export const createInvoiceSchema = z.object({
  body: z.object({
    // Document Type
    documentType: z.string().optional(),
    invoiceNumber: z.string().optional(),

    // Client Information
    clientId: z.string().optional(),
    clientName: z.string().optional(),
    clientEmail: z.string().optional(),
    clientPhone: z.string().optional(),
    clientAddress: z.string().optional(),

    // Event Linkage
    eventId: z.string().optional(),
    eventName: z.string().optional(),

    // Legacy fields
    customerName: z.string().optional(),
    supplierName: z.string().optional(),
    supplierId: z.string().optional(),

    // Financial
    subtotal: z.number().optional(),
    taxRate: z.number().optional(),
    taxAmount: z.number().optional(),
    discount: z.number().optional(),
    discountType: z.string().optional(),
    total: z.number().min(0, 'Total amount must be non-negative'),
    amountPaid: z.number().optional(),
    balance: z.number().optional(),
    currency: z.string().optional(),

    // Payment Terms
    paymentTerms: z.string().optional(),
    customPaymentTerms: z.string().optional(),

    // Status
    status: z.string().optional(),

    // Dates
    issueDate: z.string().min(1, 'Issue date is required'),
    dueDate: z.string().optional(),

    // Items - support both lineItems (frontend) and items (legacy)
    lineItems: z.array(invoiceLineItemSchema).optional(),
    items: z.array(invoiceItemSchema).optional(),

    // Payments
    payments: z.array(z.any()).optional(),

    // Metadata
    notes: z.string().optional(),
    terms: z.string().optional(),
    paymentMethod: z.string().optional(),
  }),
});

export const updateInvoiceSchema = z.object({
  body: z.object({
    // Document Type
    documentType: z.string().optional(),
    invoiceNumber: z.string().optional(),

    // Client Information
    clientId: z.string().optional(),
    clientName: z.string().optional(),
    clientEmail: z.string().optional(),
    clientPhone: z.string().optional(),
    clientAddress: z.string().optional(),

    // Event Linkage
    eventId: z.string().optional(),
    eventName: z.string().optional(),

    // Legacy fields
    customerName: z.string().optional(),
    supplierName: z.string().optional(),
    supplierId: z.string().optional(),

    // Financial
    subtotal: z.number().optional(),
    taxRate: z.number().optional(),
    taxAmount: z.number().optional(),
    discount: z.number().optional(),
    discountType: z.string().optional(),
    total: z.number().min(0, 'Total amount must be non-negative').optional(),
    amountPaid: z.number().optional(),
    balance: z.number().optional(),
    currency: z.string().optional(),

    // Payment Terms
    paymentTerms: z.string().optional(),
    customPaymentTerms: z.string().optional(),

    // Status
    status: z.enum(['Pending', 'Paid', 'Partially Paid', 'Overdue', 'Draft', 'Sent', 'Cancelled']).optional(),

    // Dates
    issueDate: z.string().optional(),
    dueDate: z.string().optional(),

    // Items
    lineItems: z.array(invoiceLineItemSchema).optional(),
    items: z.array(invoiceItemSchema).optional(),

    // Payments
    payments: z.array(z.any()).optional(),

    // Metadata
    notes: z.string().optional(),
    terms: z.string().optional(),
    paymentMethod: z.string().optional(),
  }),
});

export const recordPaymentSchema = z.object({
  body: z.object({
    amount: z.number().min(0.01, 'Payment amount must be greater than 0'),
    paymentMethod: z.string().min(1, 'Payment method is required'),
    walletId: z.string().min(1, 'Wallet ID is required'),
    notes: z.string().optional(),
  }),
});

export const getInvoicesSchema = z.object({
  query: z.object({
    status: z.enum(['Pending', 'Paid', 'Partially Paid', 'Overdue', 'Draft', 'Sent', 'Cancelled']).optional(),
    supplierId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
  }),
});
