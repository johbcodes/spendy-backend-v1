import { Router } from 'express';
import * as invoiceController from '../controllers/invoice.controller';
import { authenticate, authorize } from '../middleware/auth';
import { enforceTenancy } from '../middleware/tenancy';
import { validate } from '../middleware/validator';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  recordPaymentSchema,
  getInvoicesSchema,
} from '../validators/invoice.validator';

const router = Router();

router.use(authenticate, enforceTenancy);

// View invoices (all roles)
router.get('/', validate(getInvoicesSchema), invoiceController.getAllInvoices);
router.get('/:id', invoiceController.getInvoiceById);

// Manage invoices (Admin, Store Manager)
router.post('/', authorize('Admin', 'StoreManager'), validate(createInvoiceSchema), invoiceController.createInvoice);
router.patch('/:id', authorize('Admin', 'StoreManager'), validate(updateInvoiceSchema), invoiceController.updateInvoice);
router.put('/:id', authorize('Admin', 'StoreManager'), validate(updateInvoiceSchema), invoiceController.updateInvoice);
router.delete('/:id', authorize('Admin', 'StoreManager'), invoiceController.deleteInvoice);
router.post('/:id/payment', authorize('Admin', 'StoreManager'), validate(recordPaymentSchema), invoiceController.recordPayment);

export default router;
