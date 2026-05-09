import { Router } from 'express';
import { expenseController } from '../controllers/expense.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', expenseController.getAllExpenses.bind(expenseController));
router.post('/', expenseController.createExpense.bind(expenseController));
router.get('/event/:eventId', expenseController.getExpensesByEvent.bind(expenseController));

// batch routes must come before /:id to avoid route collision
router.post('/batch-approve', authorize('Admin', 'Approver'), expenseController.batchApprove.bind(expenseController));
router.post('/bulk-pay', expenseController.bulkPay.bind(expenseController));

router.get('/:id', expenseController.getExpenseById.bind(expenseController));
router.get('/:id/approvals', expenseController.getApprovalChain.bind(expenseController));
router.patch('/:id', expenseController.updateExpense.bind(expenseController));
router.delete('/:id', expenseController.deleteExpense.bind(expenseController));

// Approvers can approve/reject; pay is restricted to the expense creator (enforced in controller)
router.post('/:id/approve', authorize('Admin', 'Approver'), expenseController.approveExpense.bind(expenseController));
router.post('/:id/pay', expenseController.payExpense.bind(expenseController));

export default router;
