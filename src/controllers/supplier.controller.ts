import { Request, Response, NextFunction } from 'express';
import { SupplierService } from '../services/supplier.service';

const supplierService = new SupplierService();

export class SupplierController {
  async getAllSuppliers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const suppliers = await supplierService.getAllSuppliers(req.companyId!);
      res.json({ success: true, data: suppliers });
    } catch (err) {
      next(err);
    }
  }

  async getSupplierById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const supplier = await supplierService.getSupplierById(req.params.id as string, req.companyId!);
      res.json({ success: true, data: supplier });
    } catch (err) {
      next(err);
    }
  }

  async createSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const supplier = await supplierService.createSupplier(req.companyId!, req.body);
      res.status(201).json({ success: true, message: 'Supplier created successfully', data: supplier });
    } catch (err) {
      next(err);
    }
  }

  async updateSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const supplier = await supplierService.updateSupplier(req.params.id as string, req.companyId!, req.body);
      res.json({ success: true, message: 'Supplier updated successfully', data: supplier });
    } catch (err) {
      next(err);
    }
  }

  async deleteSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await supplierService.deleteSupplier(req.params.id as string, req.companyId!);
      res.json({ success: true, message: 'Supplier deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const supplierController = new SupplierController();
