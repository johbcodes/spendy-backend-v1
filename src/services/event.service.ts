import prisma from '../config/database';
import { CreateEventInput, UpdateEventInput, GetEventsQuery } from '../validators/event.validator';
import { ApiError } from '../middleware/errorHandler';
import { EventStatus } from '@prisma/client';

export class EventService {
  async getAllEvents(companyId: string, query: GetEventsQuery = {}) {
    const where: any = { companyId };

    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.clientId) where.clientId = query.clientId;

    return prisma.event.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        projectLead: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        expenses: {
          select: { id: true, title: true, amount: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEventById(eventId: string, companyId: string) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, companyId },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        projectLead: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        expenses: {
          include: {
            createdBy: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!event) throw new ApiError(404, 'Event not found');
    return event;
  }

  async createEvent(companyId: string, userId: string, data: CreateEventInput) {
    return prisma.event.create({
      data: {
        companyId,
        createdById: userId,
        name: data.name,
        type: data.type,
        category: data.category,
        clientId: data.clientId,
        clientName: data.clientName,
        brand: data.brand,
        projectLeadId: data.projectLeadId,
        budget: data.budget ?? 0,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: data.status ?? EventStatus.Planning,
        location: data.location,
        documents: data.documents ?? [],
      },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        projectLead: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async updateEvent(eventId: string, companyId: string, data: UpdateEventInput) {
    const existing = await prisma.event.findFirst({ where: { id: eventId, companyId } });
    if (!existing) throw new ApiError(404, 'Event not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.clientId !== undefined) updateData.clientId = data.clientId;
    if (data.clientName !== undefined) updateData.clientName = data.clientName;
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.projectLeadId !== undefined) updateData.projectLeadId = data.projectLeadId;
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.documents !== undefined) updateData.documents = data.documents;

    return prisma.event.update({
      where: { id: eventId },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        projectLead: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async deleteEvent(eventId: string, companyId: string) {
    const existing = await prisma.event.findFirst({ where: { id: eventId, companyId } });
    if (!existing) throw new ApiError(404, 'Event not found');

    await prisma.event.delete({ where: { id: eventId } });
    return { message: 'Event deleted successfully' };
  }

  async getEventStats(eventId: string, companyId: string) {
    const event = await this.getEventById(eventId, companyId);

    const expenses = await prisma.expense.findMany({ where: { eventId, companyId } });

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const pendingExpenses = expenses.filter(exp => exp.status === 'Pending').length;
    const approvedExpenses = expenses.filter(exp => exp.status === 'Approved').length;
    const paidExpenses = expenses.filter(exp => exp.status === 'Paid').length;

    return {
      event: { id: event.id, name: event.name, budget: event.budget, spent: event.spent },
      expenses: {
        total: expenses.length,
        totalAmount: totalExpenses,
        pending: pendingExpenses,
        approved: approvedExpenses,
        paid: paidExpenses,
      },
      budgetUtilization: event.budget > 0 ? (totalExpenses / event.budget) * 100 : 0,
    };
  }
}

export const eventService = new EventService();
