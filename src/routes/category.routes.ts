import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// View categories (all roles)
router.get('/:type', categoryController.getAll.bind(categoryController));
router.get('/:type/:id', categoryController.getById.bind(categoryController));

// Manage categories (Admin, Store Manager)
router.post('/:type', authorize('Admin', 'StoreManager'), categoryController.create.bind(categoryController));
router.patch('/:type/:id', authorize('Admin', 'StoreManager'), categoryController.update.bind(categoryController));
router.put('/:type/:id', authorize('Admin', 'StoreManager'), categoryController.update.bind(categoryController));
router.delete('/:type/:id', authorize('Admin', 'StoreManager'), categoryController.delete.bind(categoryController));

export default router;
