import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventory.service';

const inventoryService = new InventoryService();

export class InventoryController {
  async getAllInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const inventory = await inventoryService.getAllInventory(req.companyId!);
      res.json({ success: true, data: inventory });
    } catch (err) {
      next(err);
    }
  }

  async getInventoryById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const item = await inventoryService.getInventoryById(req.params.id as string, req.companyId!);
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  async createInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const item = await inventoryService.createInventory(req.companyId!, req.body);
      res.status(201).json({ success: true, message: 'Inventory item created successfully', data: item });
    } catch (err) {
      next(err);
    }
  }

  async updateInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const item = await inventoryService.updateInventory(req.params.id as string, req.companyId!, req.body);
      res.json({ success: true, message: 'Inventory item updated successfully', data: item });
    } catch (err) {
      next(err);
    }
  }

  async deleteInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await inventoryService.deleteInventory(req.params.id as string, req.companyId!);
      res.json({ success: true, message: 'Inventory item deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  async checkoutInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const checkout = await inventoryService.checkoutInventory(
        req.params.id as string,
        req.companyId!,
        req.user!.userId,
        req.body,
      );
      res.status(201).json({ success: true, message: 'Items checked out successfully', data: checkout });
    } catch (err) {
      next(err);
    }
  }

  async checkinInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const checkin = await inventoryService.checkinInventory(
        req.params.checkoutId as string,
        req.companyId!,
        req.user!.userId,
        req.body,
      );
      res.json({ success: true, message: 'Items checked in successfully', data: checkin });
    } catch (err) {
      next(err);
    }
  }

  async getCheckouts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const checkouts = await inventoryService.getCheckouts(req.params.id as string, req.companyId!);
      res.json({ success: true, data: checkouts });
    } catch (err) {
      next(err);
    }
  }
}

export const inventoryController = new InventoryController();
