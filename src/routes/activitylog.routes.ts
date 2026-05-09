import { Router } from 'express';
import * as activityLogController from '../controllers/activitylog.controller';
import { authenticate } from '../middleware/auth';
import { enforceTenancy } from '../middleware/tenancy';

const router = Router();

router.use(authenticate, enforceTenancy);

router.get('/', activityLogController.getActivityLogs);

export default router;
