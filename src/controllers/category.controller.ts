import { Request, Response, NextFunction } from 'express';
import { categoryService, CategoryType } from '../services/category.service';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export class CategoryController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const type = req.params.type as CategoryType;

      const categories = await categoryService.getAll(companyId, type);

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryId = req.params.id as string;
      const companyId = req.user!.companyId;
      const type = req.params.type as CategoryType;

      const category = await categoryService.getById(categoryId, companyId, type);

      res.json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const type = req.params.type as CategoryType;
      const data = createCategorySchema.parse(req.body);

      const category = await categoryService.create(companyId, type, data);

      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryId = req.params.id as string;
      const companyId = req.user!.companyId;
      const type = req.params.type as CategoryType;
      const data = updateCategorySchema.parse(req.body);

      const category = await categoryService.update(categoryId, companyId, type, data);

      res.json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryId = req.params.id as string;
      const companyId = req.user!.companyId;
      const type = req.params.type as CategoryType;

      const result = await categoryService.delete(categoryId, companyId, type);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const categoryController = new CategoryController();
