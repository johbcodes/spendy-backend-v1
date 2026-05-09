import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import logger from '../utils/logger';

interface CreateProductData {
  name: string;
  sku?: string;
  category?: string;
  price: number;
  cost?: number;
  stock?: number;
  unit?: string;
}

interface UpdateProductData {
  name?: string;
  sku?: string;
  category?: string;
  price?: number;
  cost?: number;
  stock?: number;
  unit?: string;
  status?: string;
}

export class ProductService {
  async getAllProducts(companyId: string) {
    return await prisma.product.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProductById(productId: string, companyId: string) {
    const product = await prisma.product.findFirst({
      where: { id: productId, companyId },
    });

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    return product;
  }

  async createProduct(companyId: string, data: CreateProductData) {
    // Check if SKU already exists (if provided)
    if (data.sku) {
      const existing = await prisma.product.findFirst({
        where: { companyId, sku: data.sku },
      });

      if (existing) {
        throw new ApiError(400, 'Product with this SKU already exists');
      }
    }

    const product = await prisma.product.create({
      data: {
        companyId,
        name: data.name,
        sku: data.sku,
        category: data.category,
        price: data.price,
        cost: data.cost,
        stock: data.stock || 0,
        unit: data.unit || 'pcs',
        status: 'Active',
      },
    });

    logger.info(`Product created: ${product.name}`, { productId: product.id, companyId });

    return product;
  }

  async updateProduct(productId: string, companyId: string, data: UpdateProductData) {
    const product = await prisma.product.findFirst({
      where: { id: productId, companyId },
    });

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Check SKU uniqueness if updating
    if (data.sku && data.sku !== product.sku) {
      const existing = await prisma.product.findFirst({
        where: { companyId, sku: data.sku },
      });

      if (existing) {
        throw new ApiError(400, 'Product with this SKU already exists');
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data,
    });

    logger.info(`Product updated: ${updatedProduct.name}`, { productId, companyId });

    return updatedProduct;
  }

  async deleteProduct(productId: string, companyId: string) {
    const product = await prisma.product.findFirst({
      where: { id: productId, companyId },
    });

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    logger.info(`Product deleted: ${product.name}`, { productId, companyId });
  }
}

export const productService = new ProductService();
