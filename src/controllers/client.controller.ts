import { Request, Response, NextFunction } from 'express';
import { clientService } from '../services/client.service';
import { z } from 'zod';

const createClientSchema = z.object({
  itemNumber: z.string().min(1),
  name: z.string().min(1),
  contactPerson: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  brands: z.array(z.string()).optional(),
});

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  contactPerson: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  brands: z.array(z.string()).optional(),
  status: z.string().optional(),
});

const addBrandSchema = z.object({
  brandName: z.string().min(1),
});

export class ClientController {
  async getAllClients(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const clients = await clientService.getAllClients(companyId);

      res.json({
        success: true,
        data: clients,
      });
    } catch (error) {
      next(error);
    }
  }

  async getClientById(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.params.id as string;
      const companyId = req.user!.companyId;

      const client = await clientService.getClientById(clientId, companyId);

      res.json({
        success: true,
        data: client,
      });
    } catch (error) {
      next(error);
    }
  }

  async createClient(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const data = createClientSchema.parse(req.body);

      const client = await clientService.createClient(companyId, data);

      res.status(201).json({
        success: true,
        data: client,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateClient(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.params.id as string;
      const companyId = req.user!.companyId;
      const data = updateClientSchema.parse(req.body);

      const client = await clientService.updateClient(clientId, companyId, data);

      res.json({
        success: true,
        data: client,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteClient(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.params.id as string;
      const companyId = req.user!.companyId;

      const result = await clientService.deleteClient(clientId, companyId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async addBrandToClient(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.params.id as string;
      const companyId = req.user!.companyId;
      const { brandName } = addBrandSchema.parse(req.body);

      const client = await clientService.addBrandToClient(clientId, companyId, brandName);

      res.json({ success: true, data: client });
    } catch (error) {
      next(error);
    }
  }

  async removeBrandFromClient(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.params.id as string;
      const brandName = req.params.brand as string;
      const companyId = req.user!.companyId;

      const client = await clientService.removeBrandFromClient(clientId, companyId, decodeURIComponent(brandName));

      res.json({ success: true, data: client });
    } catch (error) {
      next(error);
    }
  }

  async getClientBrands(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.params.id as string;
      const companyId = req.user!.companyId;

      const result = await clientService.getClientBrands(clientId, companyId);

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const clientController = new ClientController();
