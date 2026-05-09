import { Router } from 'express';
import { inventoryController } from '../controllers/inventory.controller';
import { authenticate, authorize } from '../middleware/auth';
import { enforceTenancy } from '../middleware/tenancy';
import { validate } from '../middleware/validator';
import { createInventorySchema, updateInventorySchema } from '../validators/inventory.validator';

const router = Router();

router.use(authenticate, enforceTenancy);

router.get('/', inventoryController.getAllInventory.bind(inventoryController));
router.get('/:id', inventoryController.getInventoryById.bind(inventoryController));
router.get('/:id/checkouts', authorize('Admin', 'StoreManager'), inventoryController.getCheckouts.bind(inventoryController));

router.post('/', authorize('Admin', 'StoreManager'), validate(createInventorySchema), inventoryController.createInventory.bind(inventoryController));
router.patch('/:id', authorize('Admin', 'StoreManager'), validate(updateInventorySchema), inventoryController.updateInventory.bind(inventoryController));
router.put('/:id', authorize('Admin', 'StoreManager'), validate(updateInventorySchema), inventoryController.updateInventory.bind(inventoryController));
router.delete('/:id', authorize('Admin', 'StoreManager'), inventoryController.deleteInventory.bind(inventoryController));

// Checkout / checkin â€” Admin, Store Manager, Staff
router.post('/:id/checkout', authorize('Admin', 'StoreManager', 'Staff'), inventoryController.checkoutInventory.bind(inventoryController));
router.post('/checkin/:checkoutId', authorize('Admin', 'StoreManager', 'Staff'), inventoryController.checkinInventory.bind(inventoryController));

export default router;
