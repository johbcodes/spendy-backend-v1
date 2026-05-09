import { Request, Response, NextFunction } from 'express';
import { InvoiceService } from '../services/invoice.service';

const invoiceService = new InvoiceService();

export const getAllInvoices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await invoiceService.getAllInvoices(req.companyId!, req.query);

    res.json({
      success: true,
      data: result.invoices,
      meta: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id as string, req.companyId!);

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invoice = await invoiceService.createInvoice(req.companyId!, req.body, req.user!.userId);

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const updateInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invoice = await invoiceService.updateInvoice(
      req.params.id as string,
      req.companyId!,
      req.body,
      req.user!.userId
    );

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await invoiceService.deleteInvoice(req.params.id as string, req.companyId!, req.user!.userId);

    res.json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const recordPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await invoiceService.recordPayment(
      req.params.id as string,
      req.companyId!,
      req.body,
      req.user!.userId
    );

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
