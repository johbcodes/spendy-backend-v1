import { Router } from 'express';
import { supplierController } from '../controllers/supplier.controller';
import { authenticate, authorize } from '../middleware/auth';
import { enforceTenancy } from '../middleware/tenancy';
import { validate } from '../middleware/validator';
import { createSupplierSchema, updateSupplierSchema } from '../validators/supplier.validator';

const router = Router();

router.use(authenticate, enforceTenancy);

router.get('/', supplierController.getAllSuppliers.bind(supplierController));
router.get('/:id', supplierController.getSupplierById.bind(supplierController));
router.post('/', authorize('Admin', 'StoreManager'), validate(createSupplierSchema), supplierController.createSupplier.bind(supplierController));
router.patch('/:id', authorize('Admin', 'StoreManager'), validate(updateSupplierSchema), supplierController.updateSupplier.bind(supplierController));
router.put('/:id', authorize('Admin', 'StoreManager'), validate(updateSupplierSchema), supplierController.updateSupplier.bind(supplierController));
router.delete('/:id', authorize('Admin', 'StoreManager'), supplierController.deleteSupplier.bind(supplierController));

export default router;
