import { Router } from 'express';
import { transactionController } from '../controllers/transaction.controller';
import { authenticate, authorize } from '../middleware/auth';
import { enforceTenancy } from '../middleware/tenancy';
import { validate } from '../middleware/validator';
import { getTransactionsSchema } from '../validators/transaction.validator';

const router = Router();

router.use(authenticate, enforceTenancy);

router.get('/', validate(getTransactionsSchema), transactionController.getTransactions.bind(transactionController));
router.get('/export', authorize('Admin', 'StoreManager', 'Approver'), transactionController.exportCsv.bind(transactionController));
router.get('/:id', transactionController.getTransactionById.bind(transactionController));

export default router;
