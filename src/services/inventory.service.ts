import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { InventoryCheckoutStatus, InventoryCondition } from '@prisma/client';

interface CreateInventoryData {
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  location?: string;
  conditionCounts?: Record<string, number>;
  price?: number;
  cost?: number;
  sku?: string;
  lastRestocked?: Date;
}

interface UpdateInventoryData {
  name?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  location?: string;
  conditionCounts?: Record<string, number>;
  price?: number;
  cost?: number;
  sku?: string;
  lastRestocked?: Date;
  status?: string;
}

interface CheckoutData {
  eventId?: string;
  quantity: number;
  conditionOut?: InventoryCondition;
  notes?: string;
}

interface CheckinData {
  conditionIn: InventoryCondition;
  notes?: string;
}

export class InventoryService {
  async getAllInventory(companyId: string) {
    return prisma.inventory.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInventoryById(inventoryId: string, companyId: string) {
    const item = await prisma.inventory.findFirst({
      where: { id: inventoryId, companyId },
      include: {
        checkouts: {
          where: { checkedInAt: null },
          include: {
            checkedOutBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!item) throw new ApiError(404, 'Inventory item not found');
    return item;
  }

  async createInventory(companyId: string, data: CreateInventoryData) {
    const item = await prisma.inventory.create({
      data: {
        companyId,
        name: data.name,
        category: data.category,
        quantity: data.quantity ?? 0,
        unit: data.unit ?? 'pcs',
        location: data.location,
        checkoutStatus: InventoryCheckoutStatus.Available,
        checkedOut: 0,
        conditionCounts: data.conditionCounts ?? {},
        price: data.price,
        cost: data.cost,
        sku: data.sku,
        lastRestocked: data.lastRestocked,
        status: 'Active',
      },
    });

    logger.info(`Inventory item created: ${item.name}`, { inventoryId: item.id, companyId });
    return item;
  }

  async updateInventory(inventoryId: string, companyId: string, data: UpdateInventoryData) {
    const existing = await prisma.inventory.findFirst({ where: { id: inventoryId, companyId } });
    if (!existing) throw new ApiError(404, 'Inventory item not found');

    const updated = await prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.conditionCounts !== undefined && { conditionCounts: data.conditionCounts }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.cost !== undefined && { cost: data.cost }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.lastRestocked !== undefined && { lastRestocked: data.lastRestocked }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });

    logger.info(`Inventory item updated: ${updated.name}`, { inventoryId, companyId });
    return updated;
  }

  async deleteInventory(inventoryId: string, companyId: string) {
    const existing = await prisma.inventory.findFirst({ where: { id: inventoryId, companyId } });
    if (!existing) throw new ApiError(404, 'Inventory item not found');

    if (existing.checkedOut > 0) {
      throw new ApiError(400, 'Cannot delete an inventory item that has items checked out');
    }

    await prisma.inventory.delete({ where: { id: inventoryId } });
    logger.info(`Inventory item deleted: ${existing.name}`, { inventoryId, companyId });
  }

  async checkoutInventory(inventoryId: string, companyId: string, userId: string, data: CheckoutData) {
    const item = await prisma.inventory.findFirst({ where: { id: inventoryId, companyId } });
    if (!item) throw new ApiError(404, 'Inventory item not found');

    const available = item.quantity - item.checkedOut;
    if (data.quantity > available) {
      throw new ApiError(400, `Only ${available} units available for checkout`);
    }

    return prisma.$transaction(async (tx) => {
      const checkout = await tx.inventoryCheckout.create({
        data: {
          companyId,
          inventoryId,
          eventId: data.eventId,
          checkedOutById: userId,
          quantity: data.quantity,
          conditionOut: data.conditionOut ?? InventoryCondition.Good,
          notes: data.notes,
        },
        include: {
          checkedOutBy: { select: { id: true, firstName: true, lastName: true } },
          inventory: { select: { id: true, name: true } },
        },
      });

      const newCheckedOut = item.checkedOut + data.quantity;
      const checkoutStatus =
        newCheckedOut >= item.quantity
          ? InventoryCheckoutStatus.FullyCheckedOut
          : InventoryCheckoutStatus.PartiallyCheckedOut;

      await tx.inventory.update({
        where: { id: inventoryId },
        data: { checkedOut: newCheckedOut, checkoutStatus },
      });

      await tx.activityLog.create({
        data: {
          companyId,
          userId,
          action: 'INVENTORY_CHECKOUT',
          entityType: 'Inventory',
          entityId: inventoryId,
          details: `Checked out ${data.quantity} unit(s) of "${item.name}"`,
        },
      });

      logger.info(`Inventory checkout: ${data.quantity} x ${item.name}`, { inventoryId, userId });
      return checkout;
    });
  }

  async checkinInventory(checkoutId: string, companyId: string, userId: string, data: CheckinData) {
    const checkout = await prisma.inventoryCheckout.findFirst({
      where: { id: checkoutId, companyId },
      include: { inventory: true },
    });

    if (!checkout) throw new ApiError(404, 'Checkout record not found');
    if (checkout.checkedInAt) throw new ApiError(400, 'Items have already been checked in');

    return prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryCheckout.update({
        where: { id: checkoutId },
        data: {
          checkedInById: userId,
          conditionIn: data.conditionIn,
          notes: data.notes ? `${checkout.notes ?? ''}\nReturn: ${data.notes}`.trim() : checkout.notes,
          checkedInAt: new Date(),
        },
        include: {
          checkedOutBy: { select: { id: true, firstName: true, lastName: true } },
          checkedInBy: { select: { id: true, firstName: true, lastName: true } },
          inventory: { select: { id: true, name: true } },
        },
      });

      const item = checkout.inventory;
      const newCheckedOut = Math.max(0, item.checkedOut - checkout.quantity);
      const checkoutStatus =
        newCheckedOut === 0
          ? InventoryCheckoutStatus.Available
          : InventoryCheckoutStatus.PartiallyCheckedOut;

      await tx.inventory.update({
        where: { id: item.id },
        data: { checkedOut: newCheckedOut, checkoutStatus },
      });

      // Notify admins if items returned damaged
      if (data.conditionIn === InventoryCondition.Damaged || data.conditionIn === InventoryCondition.Missing) {
        await tx.activityLog.create({
          data: {
            companyId,
            userId,
            action: 'INVENTORY_DAMAGE_REPORTED',
            entityType: 'Inventory',
            entityId: item.id,
            details: `Returned ${checkout.quantity} unit(s) of "${item.name}" in ${data.conditionIn} condition`,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          companyId,
          userId,
          action: 'INVENTORY_CHECKIN',
          entityType: 'Inventory',
          entityId: item.id,
          details: `Checked in ${checkout.quantity} unit(s) of "${item.name}" — condition: ${data.conditionIn}`,
        },
      });

      logger.info(`Inventory checkin: ${checkout.quantity} x ${item.name}`, { checkoutId, userId });
      return updated;
    });
  }

  async getCheckouts(inventoryId: string, companyId: string) {
    const item = await prisma.inventory.findFirst({ where: { id: inventoryId, companyId } });
    if (!item) throw new ApiError(404, 'Inventory item not found');

    return prisma.inventoryCheckout.findMany({
      where: { inventoryId, companyId },
      include: {
        checkedOutBy: { select: { id: true, firstName: true, lastName: true } },
        checkedInBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { checkedOutAt: 'desc' },
    });
  }
}
