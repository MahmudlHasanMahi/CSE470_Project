import {
  Injectable,
  Dependencies,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

function currentDhakaMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  return `${y}-${m}`;
}

function monthRangeDhaka(ym) {
  if (!/^\d{4}-\d{2}$/.test(ym)) {
    throw new BadRequestException('month must be in YYYY-MM format');
  }
  const [y, m] = ym.split('-').map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, 1, -6, 0, 0, 0)),
    end: new Date(Date.UTC(y, m, 1, -6, 0, 0, 0)),
  };
}

@Injectable()
@Dependencies(PrismaService)
export class BudgetsService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async getMonthlyBudget(userId, monthParam) {
    const month = monthParam || currentDhakaMonth();
    const { start, end } = monthRangeDhaka(month);

    const budget = await this.prisma.budget.findUnique({
      where: { userId_month: { userId, month } },
      include: {
        items: {
          include: { category: { select: { id: true, name: true, color: true } } },
          orderBy: { category: { name: 'asc' } },
        },
      },
    });

    const myWallet = {
      OR: [{ userId }, { members: { some: { userId, status: 'active' } } }],
    };

    const txns = await this.prisma.txn.findMany({
      where: {
        status: 'posted',
        sourceWalletId: { not: null },
        destinationWalletId: null,
        occurredAt: { gte: start, lt: end },
        OR: [{ createdBy: userId }, { sourceWallet: myWallet }],
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
      },
    });

    const spentByCategory = new Map();
    for (const t of txns) {
      const key = t.categoryId || 'uncategorized';
      const prev = spentByCategory.get(key) || {
        amount: new Prisma.Decimal(0),
        category: t.category || { id: null, name: 'Uncategorized', color: '#6B6080' },
      };
      prev.amount = prev.amount.add(new Prisma.Decimal(t.amount));
      spentByCategory.set(key, prev);
    }

    const budgetedCategoryIds = new Set();
    let totalBudget = new Prisma.Decimal(0);
    let totalSpent = new Prisma.Decimal(0);

    const items = (budget?.items || []).map((item) => {
      budgetedCategoryIds.add(item.categoryId);
      const limitDec = new Prisma.Decimal(item.limitAmount);
      const spentDec = spentByCategory.get(item.categoryId)?.amount || new Prisma.Decimal(0);
      const remainingDec = limitDec.sub(spentDec);

      totalBudget = totalBudget.add(limitDec);
      totalSpent = totalSpent.add(spentDec);

      const limit = Number(limitDec.toFixed(2));
      const spent = Number(spentDec.toFixed(2));
      const remaining = Number(remainingDec.toFixed(2));
      const percentUsed = limit > 0 ? Math.round((spent / limit) * 100) : 0;

      let status = 'on_track';
      if (spent > limit) status = 'over_budget';
      else if (percentUsed >= item.warningThreshold) status = 'warning';

      return {
        id: item.id,
        categoryId: item.categoryId,
        category: item.category,
        limitAmount: limit,
        spentAmount: spent,
        remainingAmount: remaining,
        percentUsed,
        warningThreshold: item.warningThreshold,
        status,
      };
    });

    const unbudgeted = Array.from(spentByCategory.entries())
      .filter(([key]) => key !== 'uncategorized' && !budgetedCategoryIds.has(key))
      .map(([, val]) => ({
        category: val.category,
        spentAmount: Number(val.amount.toFixed(2)),
      }));

    return {
      month,
      budgetId: budget?.id || null,
      summary: {
        totalBudget: Number(totalBudget.toFixed(2)),
        totalSpent: Number(totalSpent.toFixed(2)),
        totalRemaining: Number(totalBudget.sub(totalSpent).toFixed(2)),
        alertCount: items.filter((i) => i.status !== 'on_track').length,
      },
      items,
      unbudgeted,
    };
  }

  async upsertBudgetItem(userId, body) {
    const month = body.month || currentDhakaMonth();
    monthRangeDhaka(month); // validates YYYY-MM

    if (!body.categoryId) throw new BadRequestException('categoryId is required');
    const limitAmount = new Prisma.Decimal(body.limitAmount);
    if (limitAmount.lte(0)) {
      throw new BadRequestException('limitAmount must be greater than 0');
    }

    const warningThreshold =
      body.warningThreshold !== undefined ? Number(body.warningThreshold) : 80;
    if (
      !Number.isInteger(warningThreshold) ||
      warningThreshold < 1 ||
      warningThreshold > 100
    ) {
      throw new BadRequestException('warningThreshold must be between 1 and 100');
    }

    const category = await this.prisma.category.findFirst({
      where: {
        id: body.categoryId,
        OR: [{ userId: null }, { userId }],
      },
    });
    if (!category) throw new NotFoundException('Category not found');

    const budget = await this.prisma.budget.upsert({
      where: { userId_month: { userId, month } },
      create: { userId, month },
      update: {},
    });

    return this.prisma.budgetItem.upsert({
      where: {
        budgetId_categoryId: { budgetId: budget.id, categoryId: category.id },
      },
      create: {
        budgetId: budget.id,
        categoryId: category.id,
        limitAmount,
        warningThreshold,
      },
      update: { limitAmount, warningThreshold },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
  }

  async deleteBudgetItem(userId, itemId) {
    const item = await this.prisma.budgetItem.findUnique({
      where: { id: itemId },
      include: { budget: { select: { userId: true } } },
    });
    if (!item || item.budget.userId !== userId) {
      throw new NotFoundException('Budget item not found');
    }
    await this.prisma.budgetItem.delete({ where: { id: itemId } });
    return { deleted: true, id: itemId };
  }
}