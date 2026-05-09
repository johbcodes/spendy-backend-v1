import { PrismaClient } from '@prisma/client';
import { ApiError } from '../middleware/errorHandler';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export type CategoryType = 'event' | 'activation' | 'expense' | 'operation' | 'supplier' | 'inventory';

interface CreateCategoryData {
  name: string;
  description?: string;
}

interface UpdateCategoryData {
  name?: string;
  description?: string;
}

export class CategoryService {
  async getAll(companyId: string, type: CategoryType) {
    switch (type) {
      case 'event':
        return await prisma.eventCategory.findMany({
          where: { companyId },
          orderBy: { name: 'asc' },
        });
      case 'activation':
        return await prisma.activationCategory.findMany({
          where: { companyId },
          orderBy: { name: 'asc' },
        });
      case 'expense':
        return await prisma.expenseCategory.findMany({
          where: { companyId },
          orderBy: { name: 'asc' },
        });
      case 'operation':
        return await prisma.operationCategory.findMany({
          where: { companyId },
          orderBy: { name: 'asc' },
        });
      case 'supplier':
        return await prisma.supplierCategory.findMany({
          where: { companyId },
          orderBy: { name: 'asc' },
        });
      case 'inventory':
        return await prisma.inventoryCategory.findMany({
          where: { companyId },
          orderBy: { name: 'asc' },
        });
      default:
        throw new ApiError(400, `Invalid category type: ${type}`);
    }
  }

  async getById(categoryId: string, companyId: string, type: CategoryType) {
    let category;

    switch (type) {
      case 'event':
        category = await prisma.eventCategory.findFirst({
          where: { id: categoryId, companyId },
        });
        break;
      case 'activation':
        category = await prisma.activationCategory.findFirst({
          where: { id: categoryId, companyId },
        });
        break;
      case 'expense':
        category = await prisma.expenseCategory.findFirst({
          where: { id: categoryId, companyId },
        });
        break;
      case 'operation':
        category = await prisma.operationCategory.findFirst({
          where: { id: categoryId, companyId },
        });
        break;
      case 'supplier':
        category = await prisma.supplierCategory.findFirst({
          where: { id: categoryId, companyId },
        });
        break;
      case 'inventory':
        category = await prisma.inventoryCategory.findFirst({
          where: { id: categoryId, companyId },
        });
        break;
      default:
        throw new ApiError(400, `Invalid category type: ${type}`);
    }

    if (!category) {
      throw new ApiError(404, `${type} category not found`);
    }

    return category;
  }

  async create(companyId: string, type: CategoryType, data: CreateCategoryData) {
    // Check if category name already exists and create
    switch (type) {
      case 'event': {
        const existing = await prisma.eventCategory.findFirst({
          where: { companyId, name: data.name },
        });
        if (existing) {
          throw new ApiError(400, `${type} category with this name already exists`);
        }
        const category = await prisma.eventCategory.create({
          data: {
            companyId,
            name: data.name,
            description: data.description,
          },
        });
        logger.info(`${type} category created: ${category.name}`, { categoryId: category.id, companyId });
        return category;
      }
      case 'activation': {
        const existing = await prisma.activationCategory.findFirst({
          where: { companyId, name: data.name },
        });
        if (existing) {
          throw new ApiError(400, `${type} category with this name already exists`);
        }
        const category = await prisma.activationCategory.create({
          data: {
            companyId,
            name: data.name,
            description: data.description,
          },
        });
        logger.info(`${type} category created: ${category.name}`, { categoryId: category.id, companyId });
        return category;
      }
      case 'expense': {
        const existing = await prisma.expenseCategory.findFirst({
          where: { companyId, name: data.name },
        });
        if (existing) {
          throw new ApiError(400, `${type} category with this name already exists`);
        }
        const category = await prisma.expenseCategory.create({
          data: {
            companyId,
            name: data.name,
            description: data.description,
          },
        });
        logger.info(`${type} category created: ${category.name}`, { categoryId: category.id, companyId });
        return category;
      }
      case 'operation': {
        const existing = await prisma.operationCategory.findFirst({
          where: { companyId, name: data.name },
        });
        if (existing) {
          throw new ApiError(400, `${type} category with this name already exists`);
        }
        const category = await prisma.operationCategory.create({
          data: {
            companyId,
            name: data.name,
            description: data.description,
          },
        });
        logger.info(`${type} category created: ${category.name}`, { categoryId: category.id, companyId });
        return category;
      }
      case 'supplier': {
        const existing = await prisma.supplierCategory.findFirst({
          where: { companyId, name: data.name },
        });
        if (existing) {
          throw new ApiError(400, `${type} category with this name already exists`);
        }
        const category = await prisma.supplierCategory.create({
          data: {
            companyId,
            name: data.name,
            description: data.description,
          },
        });
        logger.info(`${type} category created: ${category.name}`, { categoryId: category.id, companyId });
        return category;
      }
      case 'inventory': {
        const existing = await prisma.inventoryCategory.findFirst({
          where: { companyId, name: data.name },
        });
        if (existing) {
          throw new ApiError(400, `${type} category with this name already exists`);
        }
        const category = await prisma.inventoryCategory.create({
          data: {
            companyId,
            name: data.name,
            description: data.description,
          },
        });
        logger.info(`${type} category created: ${category.name}`, { categoryId: category.id, companyId });
        return category;
      }
      default:
        throw new ApiError(400, `Invalid category type: ${type}`);
    }
  }

  async update(categoryId: string, companyId: string, type: CategoryType, data: UpdateCategoryData) {
    switch (type) {
      case 'event': {
        const category = await prisma.eventCategory.findFirst({
          where: { id: categoryId, companyId },
        });
        if (!category) {
          throw new ApiError(404, `${type} category not found`);
        }
        if (data.name && data.name !== category.name) {
          const existing = await prisma.eventCategory.findFirst({
            where: { companyId, name: data.name },
          });
          if (existing) {
            throw new ApiError(400, `${type} category with this name already exists`);
          }
        }
        const updated = await prisma.eventCategory.update({
          where: { id: categoryId },
          data,
        });
        logger.info(`${type} category updated: ${updated.name}`, { categoryId, companyId });
        return updated;
      }
      case 'activation': {
        const category = await prisma.activationCategory.findFirst({
          where: { id: categoryId, companyId },
        });
        if (!category) {
          throw new ApiError(404, `${type} category not found`);
        }
        if (data.name && data.name !== category.name) {
          const existing = await prisma.activationCategory.findFirst({
            where: { companyId, name: data.name },
          });
          if (existing) {
            throw new ApiError(400, `${type} category with this name already exists`);
          }
        }
        const updated = await prisma.activationCategory.update({
          where: { id: categoryId },
          data,
        });
        logger.info(`${type} category updated: ${updated.name}`, { categoryId, companyId });
        return updated;
      }
      case 'expense': {
        const category = await prisma.expenseCategory.findFirst({
          where: { id: categoryId, companyId },
        });
        if (!category) {
          throw new ApiError(404, `${type} category not found`);
        }
        if (data.name && data.name !== category.name) {
          const existing = await prisma.expenseCategory.findFirst({
            where: { companyId, name: data.name },
          });
          if (existing) {
            throw new ApiError(400, `${type} category with this name already exists`);
          }
        }
        const updated = await prisma.expenseCategory.update({
          where: { id: categoryId },
          data,
        });
        logger.info(`${type} category updated: ${updated.name}`, { categoryId, companyId });
        return updated;
      }
      case 'operation': {
        const category = await prisma.operationCategory.findFirst({
          where: { id: categoryId, companyId },
        });
        if (!category) {
          throw new ApiError(404, `${type} category not found`);
        }
        if (data.name && data.name !== category.name) {
          const existing = await prisma.operationCategory.findFirst({
            where: { companyId, name: data.name },
          });
          if (existing) {
            throw new ApiError(400, `${type} category with this name already exists`);
          }
        }
        const updated = await prisma.operationCategory.update({
          where: { id: categoryId },
          data,
        });
        logger.info(`${type} category updated: ${updated.name}`, { categoryId, companyId });
        return updated;
      }
      case 'supplier': {
        const category = await prisma.supplierCategory.findFirst({
          where: { id: categoryId, companyId },
        });
        if (!category) {
          throw new ApiError(404, `${type} category not found`);
        }
        if (data.name && data.name !== category.name) {
          const existing = await prisma.supplierCategory.findFirst({
            where: { companyId, name: data.name },
          });
          if (existing) {
            throw new ApiError(400, `${type} category with this name already exists`);
          }
        }
        const updated = await prisma.supplierCategory.update({
          where: { id: categoryId },
          data,
        });
        logger.info(`${type} category updated: ${updated.name}`, { categoryId, companyId });
        return updated;
      }
      case 'inventory': {
        const category = await prisma.inventoryCategory.findFirst({
          where: { id: categoryId, companyId },
        });
        if (!category) {
          throw new ApiError(404, `${type} category not found`);
        }
        if (data.name && data.name !== category.name) {
          const existing = await prisma.inventoryCategory.findFirst({
            where: { companyId, name: data.name },
          });
          if (existing) {
            throw new ApiError(400, `${type} category with this name already exists`);
          }
        }
        const updated = await prisma.inventoryCategory.update({
          where: { id: categoryId },
          data,
        });
        logger.info(`${type} category updated: ${updated.name}`, { categoryId, companyId });
        return updated;
      }
      default:
        throw new ApiError(400, `Invalid category type: ${type}`);
    }
  }

  async delete(categoryId: string, companyId: string, type: CategoryType) {
    switch (type) {
      case 'event': {
        const category = await prisma.eventCategory.findFirst({
          where: { id: categoryId, companyId },
        });
        if (!category) {
          throw new ApiError(404, `${type} category not found`);
        }
        await prisma.eventCategory.delete({
          where: { id: categoryId },
        });
        logger.info(`${type} category deleted: ${category.name}`, { categoryId, companyId });
        return { message: `${type} category deleted successfully` };
      }
      case 'activation': {
        const category = await prisma.activationCategory.findFirst({
          where: { id: categoryId, companyId },
        });
        if (!category) {
          throw new ApiError(404, `${type} category not found`);
        }
        await prisma.activationCategory.delete({
          where: { id: categoryId },
        });
        logger.info(`${type} category deleted: ${category.name}`, { categoryId, companyId });
        return { message: `${type} category deleted successfully` };
      }
      case 'expense': {
        const category = await prisma.expenseCategory.findFirst({
          where: { id: categoryId, companyId },
        });
        if (!category) {
          throw new ApiError(404, `${type} category not found`);
        }
        await prisma.expenseCategory.delete({
          where: { id: categoryId },
        });
        logger.info(`${type} category deleted: ${category.name}`, { categoryId, companyId });
        return { message: `${type} category deleted successfully` };
      }
      case 'operation': {
        const category = await prisma.operationCategory.findFirst({
          where: { id: categoryId, companyId },
        });
        if (!category) {
          throw new ApiError(404, `${type} category not found`);
        }
        await prisma.operationCategory.delete({
          where: { id: categoryId },
        });
        logger.info(`${type} category deleted: ${category.name}`, { categoryId, companyId });
        return { message: `${type} category deleted successfully` };
      }
      case 'supplier': {
        const category = await prisma.supplierCategory.findFirst({
          where: { id: categoryId, companyId },
        });
        if (!category) {
          throw new ApiError(404, `${type} category not found`);
        }
        await prisma.supplierCategory.delete({
          where: { id: categoryId },
        });
        logger.info(`${type} category deleted: ${category.name}`, { categoryId, companyId });
        return { message: `${type} category deleted successfully` };
      }
      case 'inventory': {
        const category = await prisma.inventoryCategory.findFirst({
          where: { id: categoryId, companyId },
        });
        if (!category) {
          throw new ApiError(404, `${type} category not found`);
        }
        await prisma.inventoryCategory.delete({
          where: { id: categoryId },
        });
        logger.info(`${type} category deleted: ${category.name}`, { categoryId, companyId });
        return { message: `${type} category deleted successfully` };
      }
      default:
        throw new ApiError(400, `Invalid category type: ${type}`);
    }
  }
}

export const categoryService = new CategoryService();
