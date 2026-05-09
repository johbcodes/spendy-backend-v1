import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { systemConfigController } from '../controllers/systemconfig.controller';

const router = Router();

router.use(authenticate);

router.get('/', authorize('Superadmin', 'Admin'), systemConfigController.getConfig.bind(systemConfigController));
router.patch('/', authorize('Superadmin'), systemConfigController.updateConfig.bind(systemConfigController));

export default router;
