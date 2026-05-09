import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import logger from '../utils/logger';

interface CreateSupplierData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  category?: string;
  contactPerson?: string;
  paymentMethod?: string;
  servicesProvided?: string;
  mpesaPhone?: string;
  paybillNumber?: string;
  paybillAccount?: string;
  tillNumber?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  branchName?: string;
  swiftCode?: string;
  businessType?: string;
  kraPin?: string;
  documents?: any[];
}

interface UpdateSupplierData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: string;
  category?: string;
  contactPerson?: string;
  paymentMethod?: string;
  servicesProvided?: string;
  mpesaPhone?: string;
  paybillNumber?: string;
  paybillAccount?: string;
  tillNumber?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  branchName?: string;
  swiftCode?: string;
  businessType?: string;
  kraPin?: string;
  documents?: any[];
}

export class SupplierService {
  async getAllSuppliers(companyId: string) {
    return prisma.supplier.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSupplierById(supplierId: string, companyId: string) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, companyId },
      include: {
        invoices: {
          select: { id: true, invoiceNumber: true, total: true, status: true, issueDate: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!supplier) throw new ApiError(404, 'Supplier not found');
    return supplier;
  }

  async createSupplier(companyId: string, data: CreateSupplierData) {
    const supplier = await prisma.supplier.create({
      data: {
        companyId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        category: data.category,
        contactPerson: data.contactPerson,
        paymentMethod: data.paymentMethod,
        servicesProvided: data.servicesProvided,
        mpesaPhone: data.mpesaPhone,
        paybillNumber: data.paybillNumber,
        paybillAccount: data.paybillAccount,
        tillNumber: data.tillNumber,
        bankName: data.bankName,
        accountName: data.accountName,
        accountNumber: data.accountNumber,
        branchName: data.branchName,
        swiftCode: data.swiftCode,
        businessType: data.businessType,
        kraPin: data.kraPin,
        documents: (data.documents ?? []) as any,
        status: 'Active',
      },
    });

    logger.info(`Supplier created: ${supplier.name}`, { supplierId: supplier.id, companyId });
    return supplier;
  }

  async updateSupplier(supplierId: string, companyId: string, data: UpdateSupplierData) {
    const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, companyId } });
    if (!supplier) throw new ApiError(404, 'Supplier not found');

    const updated = await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.contactPerson !== undefined && { contactPerson: data.contactPerson }),
        ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
        ...(data.servicesProvided !== undefined && { servicesProvided: data.servicesProvided }),
        ...(data.mpesaPhone !== undefined && { mpesaPhone: data.mpesaPhone }),
        ...(data.paybillNumber !== undefined && { paybillNumber: data.paybillNumber }),
        ...(data.paybillAccount !== undefined && { paybillAccount: data.paybillAccount }),
        ...(data.tillNumber !== undefined && { tillNumber: data.tillNumber }),
        ...(data.bankName !== undefined && { bankName: data.bankName }),
        ...(data.accountName !== undefined && { accountName: data.accountName }),
        ...(data.accountNumber !== undefined && { accountNumber: data.accountNumber }),
        ...(data.branchName !== undefined && { branchName: data.branchName }),
        ...(data.swiftCode !== undefined && { swiftCode: data.swiftCode }),
        ...(data.businessType !== undefined && { businessType: data.businessType }),
        ...(data.kraPin !== undefined && { kraPin: data.kraPin }),
        ...(data.documents !== undefined && { documents: data.documents as any }),
      },
    });

    logger.info(`Supplier updated: ${updated.name}`, { supplierId, companyId });
    return updated;
  }

  async deleteSupplier(supplierId: string, companyId: string) {
    const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, companyId } });
    if (!supplier) throw new ApiError(404, 'Supplier not found');

    await prisma.supplier.delete({ where: { id: supplierId } });
    logger.info(`Supplier deleted: ${supplier.name}`, { supplierId, companyId });
  }
}

export const supplierService = new SupplierService();
