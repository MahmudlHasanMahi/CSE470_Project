import {
  Injectable,
  Dependencies,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { randomInt } from 'node:crypto';
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
  const start = new Date(Date.UTC(y, m - 1, 1, -6, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, -6, 0, 0, 0));
  return { start, end };
}

function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
@Injectable()
@Dependencies(PrismaService)
export class TransactionsService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async getTransactionForWallet(walletId) {
    const txns = await this.prisma.txn.findMany({
      where: {
        OR: [{ sourceWalletId: walletId }, { destinationWalletId: walletId }],
      },
      orderBy: { occurredAt: 'desc' },
      take: 50, // newest 50 only, pagination comes later
      include: {
        sourceWallet: { select: { id: true, name: true } },
        destinationWallet: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    return txns.map((t) => {
      const isOut = t.sourceWalletId === walletId;
      return {
        id: t.id,
        reference: t.reference,
        amount: t.amount,
        status: t.status,
        description: t.description,
        categoryId: t.categoryId,
        occurredAt: t.occurredAt,
        direction: isOut ? 'out' : 'in',
        counterparty: isOut ? t.destinationWallet : t.sourceWallet,
        createdBy: t.creator,
      };
    });
  }
  async getAllTransactionForUser(userId) {
    const myWallet = {
      OR: [{ userId }, { members: { some: { userId, status: 'active' } } }],
    };

    const txns = await this.prisma.txn.findMany({
      where: {
        OR: [
          { createdBy: userId },
          { sourceWallet: myWallet },
          { destinationWallet: myWallet },
        ],
        NOT: [
          { sourceWallet: { status: 'frozen' } },
          { destinationWallet: { status: 'frozen' } },
        ],
      },
      orderBy: { occurredAt: 'desc' },
      take: 50,
      include: {
        sourceWallet: { select: { id: true, name: true } },
        destinationWallet: { select: { id: true, name: true } },
        externalAccount: {
          select: {
            id: true,
            label: true,
            method: true,
            providerName: true,
            accountLast4: true,
          },
        },
      },
    });

    return txns.map((t) => {
      const externalAcc = t.externalAccount
        ? { id: t.externalAccount.id, name: t.externalAccount.label }
        : null;

      return {
        id: t.id,
        reference: t.reference,
        amount: t.amount,
        status: t.status,
        description: t.description,
        categoryId: t.categoryId,
        occurredAt: t.occurredAt,
        type: this.getTxnType(t),
        source: t.sourceWallet ?? (t.destinationWallet ? externalAcc : null),
        destination:
          t.destinationWallet ?? (t.sourceWallet ? externalAcc : null),
      };
    });
  }

  // A missing wallet side means the other side is an external account.
  getTxnType(t) {
    if (t.sourceWalletId && t.destinationWalletId) return 'transfer';
    if (t.sourceWalletId) return t.externalAccountId ? 'payout' : 'expense';
    return t.externalAccountId ? 'payin' : 'deposit';
  }

  async createTransactionForUser(userId, body) {
    const amount = new Prisma.Decimal(body.amount);
    if (amount.lte(0))
      throw new BadRequestException('Amount must be greater than 0');

    const [srcKind, srcId] = String(body.sourceAccount).split(':');
    const [dstKind, dstId] = String(body.destinationAccount).split(':');

    const sourceWalletId = srcKind === 'wallet' ? srcId : null;
    const destinationWalletId = dstKind === 'wallet' ? dstId : null;
    const externalAccountId =
      srcKind === 'bank' ? srcId : dstKind === 'bank' ? dstId : null;

    if (!sourceWalletId && !destinationWalletId) {
      throw new BadRequestException('One side must be a wallet');
    }

    if (sourceWalletId) {
      const wallet = await this.prisma.wallet.findFirst({
        where: {
          id: sourceWalletId,
          OR: [
            { userId },
            { members: { some: { userId, status: 'active', canSpend: true } } },
          ],
        },
      });
      if (!wallet) throw new NotFoundException('Wallet not found');
      if (wallet.status !== 'active')
        throw new BadRequestException('Wallet is not active');
    }

    return this.prisma.$transaction(async (tx) => {
      if (sourceWalletId) {
        const r = await tx.wallet.updateMany({
          where: { id: sourceWalletId, balance: { gte: amount } },
          data: { balance: { decrement: amount } },
        });
        if (r.count === 0)
          throw new BadRequestException('Insufficient balance');
      }

      if (destinationWalletId) {
        await tx.wallet.update({
          where: { id: destinationWalletId },
          data: { balance: { increment: amount } },
        });
      }

      const txn = await tx.txn.create({
        data: {
          reference: `TX-${randomInt(100000, 1000000)}`,
          amount,
          status: 'posted',
          categoryId: body.categoryId || body.category || null,
          description: body.description,
          sourceWalletId,
          destinationWalletId,
          externalAccountId,
          createdBy: userId,
        },
        include: {
          sourceWallet: { select: { id: true, name: true } },
          destinationWallet: { select: { id: true, name: true } },
          externalAccount: { select: { id: true, label: true } },
        },
      });
      return txn;
    });
  }
  async getExpenseAnalytics(userId, monthParam) {
    const month = monthParam || currentDhakaMonth();
    const prevMonth = shiftMonth(month, -1);
    const sixMonthsAgo = shiftMonth(month, -5);

    const { start: windowStart } = monthRangeDhaka(sixMonthsAgo);
    const { end: windowEnd } = monthRangeDhaka(month);

    const myWallet = {
      OR: [{ userId }, { members: { some: { userId, status: 'active' } } }],
    };

    const txns = await this.prisma.txn.findMany({
      where: {
        status: 'posted',
        type: { in: ['expense', 'payout'] },
        occurredAt: { gte: windowStart, lt: windowEnd },
        OR: [{ createdBy: userId }, { sourceWallet: myWallet }],
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
      },
    });

    const { start: curStart, end: curEnd } = monthRangeDhaka(month);
    const { start: prevStart, end: prevEnd } = monthRangeDhaka(prevMonth);

    const byCategory = new Map();
    const monthlyTotals = new Map();
    for (let i = -5; i <= 0; i++) {
      monthlyTotals.set(shiftMonth(month, i), new Prisma.Decimal(0));
    }

    let currentTotal = new Prisma.Decimal(0);
    let previousTotal = new Prisma.Decimal(0);

    for (const t of txns) {
      const amt = new Prisma.Decimal(t.amount);
      const ym = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: '2-digit',
      })
        .format(t.occurredAt)
        .slice(0, 7);

      if (monthlyTotals.has(ym)) {
        monthlyTotals.set(ym, monthlyTotals.get(ym).add(amt));
      }

      const catKey = t.category?.id || 'uncategorized';
      const catName = t.category?.name || 'Uncategorized';
      const catColor = t.category?.color || '#6B6080';

      if (!byCategory.has(catKey)) {
        byCategory.set(catKey, {
          categoryId: t.category?.id || null,
          name: catName,
          color: catColor,
          currentAmount: new Prisma.Decimal(0),
          previousAmount: new Prisma.Decimal(0),
          count: 0,
        });
      }
      const entry = byCategory.get(catKey);

      if (t.occurredAt >= curStart && t.occurredAt < curEnd) {
        currentTotal = currentTotal.add(amt);
        entry.currentAmount = entry.currentAmount.add(amt);
        entry.count += 1;
      } else if (t.occurredAt >= prevStart && t.occurredAt < prevEnd) {
        previousTotal = previousTotal.add(amt);
        entry.previousAmount = entry.previousAmount.add(amt);
      }
    }

    const totalNum = Number(currentTotal.toFixed(2));
    const categories = Array.from(byCategory.values())
      .filter((c) => c.currentAmount.gt(0) || c.previousAmount.gt(0))
      .map((c) => {
        const cur = Number(c.currentAmount.toFixed(2));
        const prev = Number(c.previousAmount.toFixed(2));
        return {
          categoryId: c.categoryId,
          name: c.name,
          color: c.color,
          amount: cur,
          previousAmount: prev,
          count: c.count,
          sharePct: totalNum > 0 ? Math.round((cur / totalNum) * 100) : 0,
          momChangePct:
            prev > 0
              ? Math.round(((cur - prev) / prev) * 100)
              : cur > 0
                ? 100
                : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const prevNum = Number(previousTotal.toFixed(2));
    const momDelta = Number((totalNum - prevNum).toFixed(2));
    const momDeltaPct =
      prevNum > 0
        ? Math.round((momDelta / prevNum) * 100)
        : totalNum > 0
          ? 100
          : 0;

    const monthlyTrend = Array.from(monthlyTotals.entries()).map(
      ([ym, dec]) => {
        const [y, m] = ym.split('-').map(Number);
        const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', {
          month: 'short',
          timeZone: 'UTC',
        });
        return { month: ym, label, totalSpent: Number(dec.toFixed(2)) };
      },
    );

    return {
      month,
      previousMonth: prevMonth,
      totalSpent: totalNum,
      previousTotalSpent: prevNum,
      momDelta,
      momDeltaPct,
      categories,
      monthlyTrend,
    };
  }
}
