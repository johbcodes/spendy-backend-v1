import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth';
import { enforceTenancy } from '../middleware/tenancy';
import { validate } from '../middleware/validator';
import { createUserSchema, updateUserSchema, toggleUserStatusSchema } from '../validators/user.validator';

const router = Router();

router.use(authenticate, enforceTenancy);

router.get('/', authorize('Admin'), userController.getAllUsers.bind(userController));
router.get('/:id', authorize('Admin'), userController.getUserById.bind(userController));
router.post('/', authorize('Admin'), validate(createUserSchema), userController.createUser.bind(userController));
router.patch('/:id', authorize('Admin'), validate(updateUserSchema), userController.updateUser.bind(userController));
router.delete('/:id', authorize('Admin'), userController.deleteUser.bind(userController));
router.patch('/:id/status', authorize('Admin'), validate(toggleUserStatusSchema), userController.toggleUserStatus.bind(userController));

export default router;
