import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { ApiError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { UserRole, UserStatus, WalletType, WalletStatus } from '@prisma/client';
import { MpesaService } from './mpesa.service';

interface RegisterData {
  companyName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
}

interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  async register(data: RegisterData) {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    let company = await prisma.company.findUnique({ where: { name: data.companyName } });
    if (!company) {
      company = await prisma.company.create({
        data: { name: data.companyName, status: 'Active' },
      });
      logger.info(`New company created: ${company.name}`);
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        country: data.country,
        role: UserRole.Admin,
        status: UserStatus.Active,
        modulesAssigned: JSON.stringify(['All']),
      },
    });

    await this.createDefaultWallets(company.id, company.name, user.id, `${user.firstName} ${user.lastName}`);
    await this.seedDefaultCategories(company.id);

    const tokenPayload = {
      userId: user.id,
      companyId: company.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken, lastLoginAt: new Date() },
    });

    await prisma.activityLog.create({
      data: {
        companyId: company.id,
        userId: user.id,
        action: 'USER_REGISTERED',
        entityType: 'User',
        entityId: user.id,
        details: `${user.firstName} ${user.lastName} registered`,
      },
    });

    logger.info(`New user registered: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: company.id,
        companyName: company.name,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(data: LoginData) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { company: true },
    });

    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (user.status !== UserStatus.Active) {
      throw new ApiError(403, 'Your account has been deactivated');
    }

    if (user.company.status !== 'Active') {
      throw new ApiError(403, 'Your company account has been suspended');
    }

    const isPasswordValid = await comparePassword(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const tokenPayload = {
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken, lastLoginAt: new Date() },
    });

    await prisma.activityLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: user.id,
        details: `${user.firstName} ${user.lastName} logged in`,
      },
    });

    logger.info(`User logged in: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        country: user.country,
        role: user.role,
        status: user.status,
        modulesAssigned: user.modulesAssigned,
        companyName: user.company.name,
        companyId: user.companyId,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(oldRefreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(oldRefreshToken);
    } catch {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.refreshToken !== oldRefreshToken) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    const tokenPayload = {
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    return { accessToken, refreshToken };
  }

  async logout(userId: string) {
    await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
    logger.info(`User logged out: ${userId}`);
  }

  private async createDefaultWallets(
    companyId: string,
    companyName: string,
    adminUserId: string,
    adminName: string,
  ) {
    const walletDefs = [
      { name: `${companyName} — Main`, type: WalletType.Main, isDefault: true, ownerId: undefined as string | undefined },
      { name: 'Operations Wallet', type: WalletType.Operations, isDefault: false, ownerId: undefined as string | undefined },
      { name: 'Events Wallet', type: WalletType.Events, isDefault: false, ownerId: undefined as string | undefined },
      { name: 'Activation Wallet', type: WalletType.Activation, isDefault: false, ownerId: undefined as string | undefined },
      { name: adminName, type: WalletType.Personal, isDefault: false, ownerId: adminUserId },
    ];

    for (const def of walletDefs) {
      await prisma.wallet.create({
        data: {
          companyId,
          name: def.name,
          type: def.type,
          ownerId: def.ownerId,
          balance: 0,
          currency: 'KES',
          isDefault: def.isDefault,
          status: WalletStatus.Active,
        },
      });
    }

    // Assign a unique M-Pesa account reference to the company (used for all top-ups)
    const mpesaAccountRef = await MpesaService.generateUniqueAccountRef();
    await prisma.company.update({
      where: { id: companyId },
      data: { mpesaAccountRef },
    });

    logger.info(`Default wallets created for company: ${companyName}`);
  }

  private async seedDefaultCategories(companyId: string) {
    const defaults: Record<string, string[]> = {
      event: ['Corporate', 'Social', 'Conference', 'Exhibition', 'Gala & Awards'],
      activation: ['Brand Activation', 'Product Launch', 'Sampling Campaign', 'Experiential', 'Trade Show'],
      expense: ['Accommodation', 'Transport', 'Catering', 'Equipment Hire', 'Labour', 'Marketing Materials', 'Venue'],
      operation: ['Logistics', 'Administration', 'Maintenance', 'Utilities', 'Office Supplies'],
      supplier: ['Venue', 'Catering', 'Transport', 'AV & Technology', 'Printing', 'Security', 'Staffing'],
      inventory: ['Equipment', 'Furniture', 'Electronics', 'Branded Items', 'Tents & Structures', 'Décor'],
    };

    await Promise.all([
      ...defaults.event.map(name => prisma.eventCategory.create({ data: { companyId, name } })),
      ...defaults.activation.map(name => prisma.activationCategory.create({ data: { companyId, name } })),
      ...defaults.expense.map(name => prisma.expenseCategory.create({ data: { companyId, name } })),
      ...defaults.operation.map(name => prisma.operationCategory.create({ data: { companyId, name } })),
      ...defaults.supplier.map(name => prisma.supplierCategory.create({ data: { companyId, name } })),
      ...defaults.inventory.map(name => prisma.inventoryCategory.create({ data: { companyId, name } })),
    ]);

    logger.info(`Default categories seeded for company: ${companyId}`);
  }
}
