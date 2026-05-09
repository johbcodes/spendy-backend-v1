import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import logger from '../utils/logger';

interface CreateClientData {
  itemNumber: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  brands?: string[];
}

interface UpdateClientData {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  brands?: string[];
  status?: string;
}

export class ClientService {
  async getAllClients(companyId: string) {
    const clients = await prisma.client.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    // Prisma already handles JSON parsing for Json type fields
    return clients;
  }

  async getClientById(clientId: string, companyId: string) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, companyId },
    });

    if (!client) {
      throw new ApiError(404, 'Client not found');
    }

    // Prisma already handles JSON parsing for Json type fields
    return client;
  }

  async createClient(companyId: string, data: CreateClientData) {
    // Check if item number already exists
    const existingClient = await prisma.client.findFirst({
      where: { companyId, itemNumber: data.itemNumber },
    });

    if (existingClient) {
      throw new ApiError(400, 'Client item number already exists');
    }

    const client = await prisma.client.create({
      data: {
        companyId,
        itemNumber: data.itemNumber,
        name: data.name,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        brands: data.brands || [],
        status: 'Active',
      },
    });

    logger.info(`Client created: ${client.name}`, { clientId: client.id, companyId });

    // Prisma already handles JSON parsing for Json type fields
    return client;
  }

  async updateClient(clientId: string, companyId: string, data: UpdateClientData) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, companyId },
    });

    if (!client) {
      throw new ApiError(404, 'Client not found');
    }

    // Prisma already handles JSON for Json type fields
    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: data,
    });

    logger.info(`Client updated: ${updatedClient.name}`, { clientId, companyId });

    return updatedClient;
  }

  async deleteClient(clientId: string, companyId: string) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, companyId },
    });

    if (!client) {
      throw new ApiError(404, 'Client not found');
    }

    await prisma.client.delete({
      where: { id: clientId },
    });

    logger.info(`Client deleted: ${client.name}`, { clientId, companyId });

    return { message: 'Client deleted successfully' };
  }

  async addBrandToClient(clientId: string, companyId: string, brandName: string) {
    const client = await this.getClientById(clientId, companyId);

    const brands = client.brands as string[];
    if (brands.includes(brandName)) {
      throw new ApiError(400, 'Brand already exists for this client');
    }

    brands.push(brandName);
    return this.updateClient(clientId, companyId, { brands });
  }

  async removeBrandFromClient(clientId: string, companyId: string, brandName: string) {
    const client = await this.getClientById(clientId, companyId);

    const brands = (client.brands as string[]).filter((b) => b !== brandName);
    if (brands.length === (client.brands as string[]).length) {
      throw new ApiError(404, 'Brand not found on this client');
    }

    return this.updateClient(clientId, companyId, { brands });
  }

  async getClientBrands(clientId: string, companyId: string) {
    const client = await this.getClientById(clientId, companyId);
    return { brands: client.brands as string[] };
  }
}

export const clientService = new ClientService();
