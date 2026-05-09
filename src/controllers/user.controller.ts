import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';

const userService = new UserService();

export class UserController {
  async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await userService.getAllUsers(req.companyId!);
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getUserById(req.params.id as string, req.companyId!);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.createUser(req.companyId!, req.body, req.user!.userId);
      res.status(201).json({ success: true, message: 'User created successfully', data: user });
    } catch (err) {
      next(err);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.updateUser(req.params.id as string, req.companyId!, req.body, req.user!.userId);
      res.json({ success: true, message: 'User updated successfully', data: user });
    } catch (err) {
      next(err);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await userService.deleteUser(req.params.id as string, req.companyId!, req.user!.userId);
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  async toggleUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.toggleUserStatus(
        req.params.id as string,
        req.companyId!,
        req.body.status,
        req.user!.userId,
      );
      res.json({
        success: true,
        message: `User ${req.body.status === 'Active' ? 'activated' : 'deactivated'} successfully`,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
