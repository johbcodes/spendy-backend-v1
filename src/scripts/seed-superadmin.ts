/**
 * One-time seed: creates the platform Superadmin account and ensures
 * the global SystemConfig singleton exists.
 *
 * Usage:
 *   npx ts-node src/scripts/seed-superadmin.ts
 *   (or set SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD in .env first)
 */

import '../config/env'; // validate env first
import prisma from '../config/database';
import { hashPassword } from '../utils/password';
import { UserRole, UserStatus, WalletType, WalletStatus } from '@prisma/client';
import { MpesaService } from '../services/mpesa.service';

const PLATFORM_COMPANY = 'Spendy Platform';
const EMAIL = process.env.SUPERADMIN_EMAIL ?? 'superadmin@spendy.app';
const PASSWORD = process.env.SUPERADMIN_PASSWORD ?? 'ChangeMe@123';

async function main() {
  // 1. Ensure platform company exists
  let company = await prisma.company.findUnique({ where: { name: PLATFORM_COMPANY } });
  if (!company) {
    company = await prisma.company.create({ data: { name: PLATFORM_COMPANY, status: 'Active' } });
    console.log(`Created platform company: ${company.id}`);
  }

  // 2. Ensure superadmin user exists
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    console.log(`Superadmin already exists: ${EMAIL}`);
  } else {
    const passwordHash = await hashPassword(PASSWORD);
    const accountNumber = await MpesaService.generateUniqueAccountNumber();
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        email: EMAIL,
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        phone: '+254000000000',
        country: 'Kenya',
        role: UserRole.Superadmin,
        status: UserStatus.Active,
        modulesAssigned: JSON.stringify(['All']),
      },
    });

    await prisma.wallet.create({
      data: {
        companyId: company.id,
        name: 'Super Admin Wallet',
        type: WalletType.Personal,
        ownerId: user.id,
        balance: 0,
        currency: 'KES',
        isDefault: false,
        status: WalletStatus.Active,
        accountNumber,
      },
    });

    console.log(`Superadmin created: ${EMAIL}`);
  }

  // 3. Ensure SystemConfig singleton exists
  const configCount = await prisma.systemConfig.count();
  if (configCount === 0) {
    await prisma.systemConfig.create({ data: {} });
    console.log('SystemConfig initialised (tariffRate=0, tariffFlat=0)');
  }

  console.log('Bootstrap complete.');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
