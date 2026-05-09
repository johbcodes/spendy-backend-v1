import prisma from '../config/database';

interface GetTransactionsQuery {
  type?: string;
  walletId?: string;
  startDate?: string;
  endDate?: string;
  limit?: string;
  offset?: string;
}

function buildWhere(companyId: string, query: GetTransactionsQuery) {
  const where: Record<string, unknown> = { companyId };

  if (query.type) where.type = query.type;

  if (query.walletId) {
    where.OR = [{ fromWalletId: query.walletId }, { toWalletId: query.walletId }];
  }

  if (query.startDate || query.endDate) {
    const createdAt: Record<string, Date> = {};
    if (query.startDate) createdAt.gte = new Date(query.startDate);
    if (query.endDate) createdAt.lte = new Date(query.endDate);
    where.createdAt = createdAt;
  }

  return where;
}

const INCLUDE = {
  fromWallet: { select: { id: true, name: true, type: true } },
  toWallet: { select: { id: true, name: true, type: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
} as const;

export class TransactionService {
  async getTransactions(companyId: string, query: GetTransactionsQuery) {
    const where = buildWhere(companyId, query);
    const limit = query.limit ? parseInt(query.limit) : 50;
    const offset = query.offset ? parseInt(query.offset) : 0;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { ...INCLUDE, invoice: false },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
    ]);

    return { transactions, total, limit, offset };
  }

  async getTransactionById(transactionId: string, companyId: string) {
    return prisma.transaction.findFirst({
      where: { id: transactionId, companyId },
      include: { ...INCLUDE, invoice: true },
    });
  }

  async exportCsv(companyId: string, query: GetTransactionsQuery): Promise<string> {
    const where = buildWhere(companyId, query);

    const transactions = await prisma.transaction.findMany({
      where,
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const header = ['ID', 'Date', 'Type', 'Status', 'Amount', 'Tariff', 'From Wallet', 'To Wallet', 'Description', 'Reference', 'Created By'].join(',');

    const rows = transactions.map((t) =>
      [
        t.id,
        t.createdAt.toISOString(),
        t.type,
        t.status,
        t.amount,
        t.tariffAmount,
        t.fromWallet?.name ?? '',
        t.toWallet?.name ?? '',
        t.description ?? '',
        t.reference ?? '',
        t.createdBy ? `${t.createdBy.firstName} ${t.createdBy.lastName}` : '',
      ]
        .map(escape)
        .join(','),
    );

    return [header, ...rows].join('\n');
  }
}

export const transactionService = new TransactionService();
