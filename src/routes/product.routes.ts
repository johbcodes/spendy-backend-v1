import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth';
import { enforceTenancy } from '../middleware/tenancy';
import { validate } from '../middleware/validator';
import { createProductSchema, updateProductSchema } from '../validators/product.validator';

const router = Router();

router.use(authenticate, enforceTenancy);

router.get('/', productController.getAllProducts.bind(productController));
router.get('/:id', productController.getProductById.bind(productController));

router.post('/', authorize('Admin', 'StoreManager'), validate(createProductSchema), productController.createProduct.bind(productController));
router.patch('/:id', authorize('Admin', 'StoreManager'), validate(updateProductSchema), productController.updateProduct.bind(productController));
router.put('/:id', authorize('Admin', 'StoreManager'), validate(updateProductSchema), productController.updateProduct.bind(productController));
router.delete('/:id', authorize('Admin', 'StoreManager'), productController.deleteProduct.bind(productController));

export default router;
