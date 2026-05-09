import { Router } from 'express';
import { clientController } from '../controllers/client.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// View clients (all roles)
router.get('/', clientController.getAllClients.bind(clientController));
router.get('/:id', clientController.getClientById.bind(clientController));

// Manage clients (Admin, Store Manager)
router.post('/', authorize('Admin', 'StoreManager'), clientController.createClient.bind(clientController));
router.patch('/:id', authorize('Admin', 'StoreManager'), clientController.updateClient.bind(clientController));
router.put('/:id', authorize('Admin', 'StoreManager'), clientController.updateClient.bind(clientController));
router.delete('/:id', authorize('Admin', 'StoreManager'), clientController.deleteClient.bind(clientController));
router.get('/:id/brands', clientController.getClientBrands.bind(clientController));
router.post('/:id/brands', authorize('Admin', 'StoreManager'), clientController.addBrandToClient.bind(clientController));
router.delete('/:id/brands/:brand', authorize('Admin', 'StoreManager'), clientController.removeBrandFromClient.bind(clientController));

export default router;
