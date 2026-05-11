import prisma from '../config/database';
import { hashPassword } from '../utils/password';
import { ApiError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { UserRole, UserStatus, WalletType, WalletStatus } from '@prisma/client';
import { emailService } from './email.service';

interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  role: UserRole;
  modulesAssigned?: string[];
  dailyLimit?: number;
  monthlyLimit?: number;
  requiresApprovalAbove?: number;
}

interface UpdateUserData {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  role?: UserRole;
  modulesAssigned?: string[];
  profileImage?: string;
  dailyLimit?: number;
  monthlyLimit?: number;
  requiresApprovalAbove?: number;
}

export class UserService {
  async getAllUsers(companyId: string) {
    const users = await prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        country: true,
        role: true,
        status: true,
        modulesAssigned: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map(user => ({
      ...user,
      modulesAssigned: JSON.parse(user.modulesAssigned),
    }));
  }

  async getUserById(userId: string, companyId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        country: true,
        role: true,
        status: true,
        modulesAssigned: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) throw new ApiError(404, 'User not found');

    return { ...user, modulesAssigned: JSON.parse(user.modulesAssigned) };
  }

  async createUser(companyId: string, data: CreateUserData, createdById: string) {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new ApiError(400, 'Email already exists');

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        companyId,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        country: data.country,
        role: data.role,
        status: UserStatus.Active,
        modulesAssigned: JSON.stringify(data.modulesAssigned ?? []),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        country: true,
        role: true,
        status: true,
        modulesAssigned: true,
        createdAt: true,
      },
    });

    await prisma.wallet.create({
      data: {
        companyId,
        name: `${user.firstName} ${user.lastName}`,
        type: WalletType.Personal,
        ownerId: user.id,
        balance: 0,
        currency: 'KES',
        isDefault: false,
        status: WalletStatus.Active,
      },
    });

    await prisma.activityLog.create({
      data: {
        companyId,
        userId: createdById,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: user.id,
        details: `Created user: ${user.email}`,
      },
    });

    logger.info(`User created: ${user.email}`, { userId: user.id, companyId });

    emailService
      .sendWelcome(user.email, {
        firstName: user.firstName,
        email: user.email,
        password: data.password,
        role: user.role,
        createdByName: 'Admin',
      })
      .catch((err) => logger.error('Welcome email failed', { err }));

    return { ...user, modulesAssigned: JSON.parse(user.modulesAssigned) };
  }

  async updateUser(userId: string, companyId: string, data: UpdateUserData, updatedById: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, companyId } });
    if (!user) throw new ApiError(404, 'User not found');

    if (data.email && data.email !== user.email) {
      const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
      if (existingUser) throw new ApiError(400, 'Email already exists');
    }

    const updateData: any = { ...data };

    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password);
      delete updateData.password;
    }

    if (data.modulesAssigned) {
      updateData.modulesAssigned = JSON.stringify(data.modulesAssigned);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        country: true,
        role: true,
        status: true,
        modulesAssigned: true,
        profileImage: true,
        updatedAt: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        companyId,
        userId: updatedById,
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: userId,
        details: `Updated user: ${updatedUser.email}`,
      },
    });

    logger.info(`User updated: ${updatedUser.email}`, { userId, companyId });

    return { ...updatedUser, modulesAssigned: JSON.parse(updatedUser.modulesAssigned) };
  }

  async deleteUser(userId: string, companyId: string, deletedById: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, companyId } });
    if (!user) throw new ApiError(404, 'User not found');

    if (userId === deletedById) throw new ApiError(400, 'Cannot delete your own account');

    const wallets = await prisma.wallet.findMany({ where: { ownerId: userId } });
    if (wallets.some(w => w.balance > 0)) {
      throw new ApiError(400, 'Cannot delete user with wallet balance. Transfer funds first.');
    }

    await prisma.user.delete({ where: { id: userId } });

    await prisma.activityLog.create({
      data: {
        companyId,
        userId: deletedById,
        action: 'USER_DELETED',
        entityType: 'User',
        entityId: userId,
        details: `Deleted user: ${user.email}`,
      },
    });

    logger.info(`User deleted: ${user.email}`, { userId, companyId });
  }

  async toggleUserStatus(userId: string, companyId: string, status: UserStatus, updatedById: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, companyId } });
    if (!user) throw new ApiError(404, 'User not found');

    if (userId === updatedById && status === UserStatus.Inactive) {
      throw new ApiError(400, 'Cannot deactivate your own account');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
    });

    await prisma.activityLog.create({
      data: {
        companyId,
        userId: updatedById,
        action: status === UserStatus.Active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entityType: 'User',
        entityId: userId,
        details: `Changed user status to ${status}: ${user.email}`,
      },
    });

    logger.info(`User status changed: ${user.email} -> ${status}`, { userId, companyId });

    return updatedUser;
  }
}

export const userService = new UserService();
