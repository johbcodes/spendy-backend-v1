import { Router } from 'express';
import { eventController } from '../controllers/event.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Read — all authenticated roles
router.get('/', eventController.getAllEvents.bind(eventController));
router.get('/:id', eventController.getEventById.bind(eventController));
router.get('/:id/stats', eventController.getEventStats.bind(eventController));

// Write — Admin and Approver per spec (section 3)
router.post('/', authorize('Admin', 'Approver'), eventController.createEvent.bind(eventController));
router.patch('/:id', authorize('Admin', 'Approver'), eventController.updateEvent.bind(eventController));

// Admin only for destructive / status operations
router.delete('/:id', authorize('Admin'), eventController.deleteEvent.bind(eventController));
router.patch('/:id/status', authorize('Admin'), eventController.changeEventStatus.bind(eventController));

export default router;
