import { Injectable, Dependencies, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import {
  COMPLETED_STATUSES,
  HISTORY_MONTHS,
  TIMEZONE,
  addMonths,
  analyzeMonth,
  classifyAll,
  fromPaisa,
  monthKeyOf,
  monthStart,
  parseMonthKey,
  toPaisa,
} from './financial-health.calculator';

const taka = fromPaisa;

@Injectable()
@Dependencies(PrismaService, WalletsService)
export class FinancialHealthService {
  constructor(prisma, walletsService) {
    this.prisma = prisma;
    this.walletsService = walletsService;
  }

  /* ───────── Public API used by the controller ───────── */

  async getDashboard(userId, monthParam) {
    const { month, wallets, analysis } = await this.getAnalysis(userId, monthParam);
    return {
      month,
      isCurrentMonth: analysis.isCurrentMonth,
      currency: 'BDT',
      timezone: TIMEZONE,
      generatedAt: new Date().toISOString(),
      wallets,
      ...this.serialize(analysis),
      dataNotes: this.dataNotes(),
    };
  }

  async getMonthlySummary(userId, monthParam) {
    const { month, analysis } = await this.getAnalysis(userId, monthParam);
    const s = this.serialize(analysis);
    return {
      month,
      isCurrentMonth: analysis.isCurrentMonth,
      summary: s.summary,
      comparison: s.comparison,
      history: s.history,
      projection: s.projection,
      trends: { monthly: s.trends.monthly },
    };
  }

  async getCategoryBreakdown(userId, monthParam) {
    const { month, analysis } = await this.getAnalysis(userId, monthParam);
    const s = this.serialize(analysis);
    return {
      month,
      totalExpenses: s.summary.expenses,
      categories: s.categoryBreakdown,
      categoryTrend: s.trends.categoryTrend,
    };
  }

  async getInsights(userId, monthParam) {
    const { month, analysis } = await this.getAnalysis(userId, monthParam);
    return { month, insights: analysis.insights };
  }

  /* ───────── Shared with the Financial Scenarios module ───────── */

 
  async getAnalysis(userId, monthParam) {
    const month = this.resolveMonth(monthParam);

    const allWallets = await this.walletsService.findForUser(userId);
    const personal = allWallets.find((w) => w.userId === userId) || null;
    const others = allWallets.filter((w) => w.userId !== userId);

    let classified = [];
    if (personal) {
      const txns = await this.prisma.txn.findMany({
        where: {
          occurredAt: {
            gte: monthStart(addMonths(month, -HISTORY_MONTHS)),
            lt: monthStart(addMonths(month, 1)),
          },
          AND: [
            { OR: [{ sourceWalletId: personal.id }, { destinationWalletId: personal.id }] },
            {
              OR: COMPLETED_STATUSES.map((s) => ({
                status: { equals: s, mode: 'insensitive' },
              })),
            },
          ],
        },
        select: {
          type: true,
          amount: true,
          status: true,
          recurringPaymentId: true,
          categoryId: true,
          occurredAt: true,
          sourceWalletId: true,
          destinationWalletId: true,
          sourceWallet: { select: { userId: true, departmentId: true } },
          destinationWallet: { select: { userId: true, departmentId: true } },
        },
      });
      classified = classifyAll(txns, personal.id, userId);
    }

    const analysis = analyzeMonth({ classified, month });

    return {
      month,
      analysis,
      balance: personal ? toPaisa(personal.balance) : 0,
      wallets: {
        personal: personal && {
          id: personal.id,
          name: personal.name,
          balance: taka(toPaisa(personal.balance)),
          currency: personal.currency,
          status: personal.status,
        },
        // Shown separately and NEVER added into the personal figures above.
        departmental: others.map((w) => ({
          id: w.id,
          name: w.name,
          type: w.type,
          balance: taka(toPaisa(w.balance)),
          currency: w.currency,
          status: w.status,
          isDepartment: Boolean(w.departmentId),
          canSpend: w.membership?.canSpend ?? false,
        })),
      },
    };
  }

  /* ───────── Helpers ───────── */

  resolveMonth(monthParam) {
    const current = monthKeyOf(new Date());
    if (monthParam === undefined || monthParam === null || monthParam === '') return current;
    if (!parseMonthKey(monthParam)) {
      throw new BadRequestException('month must look like YYYY-MM, for example 2026-11');
    }
    if (monthParam > current) {
      throw new BadRequestException('month cannot be in the future');
    }
    return monthParam;
  }

  /** paisa (internal) -> taka (what the API returns). */
  serialize(a) {
    const s = a.summary;
    const h = a.history;
    const p = a.projection;
    const orNull = (v) => (v === null || v === undefined ? null : taka(v));
    return {
      summary: {
        income: taka(s.income),
        expenses: taka(s.expense),
        recurringExpenses: taka(s.recurringExpense),
        remaining: taka(s.remaining),
        savings: taka(s.savings),
        deficit: taka(s.deficit),
        savingsRate: s.savingsRate,
        transactionCount: s.transactionCount,
        incomeBySource: Object.fromEntries(
          Object.entries(s.incomeBySource).map(([k, v]) => [k, taka(v)]),
        ),
      },
      comparison: {
        previousMonth: a.previous.month,
        basis: a.previous.basis, // 'same_period' while the month is in progress
        previousExpenses: taka(a.previous.expense),
        previousFullMonthExpenses: taka(a.previous.fullMonthExpense),
        expenseChangePercent:
          a.previous.expenseChangePercent === null
            ? null
            : Math.round(a.previous.expenseChangePercent * 10) / 10,
        previousSavingsRate: a.previous.savingsRate,
        savingsRateChange:
          s.savingsRate !== null && a.previous.savingsRate !== null
            ? Math.round((s.savingsRate - a.previous.savingsRate) * 10) / 10
            : null,
        hasPreviousData: a.previous.hasData,
      },
      history: {
        monthsConsidered: h.monthsConsidered,
        hasEnoughHistory: h.hasEnoughHistory,
        averageMonthlyExpenses: orNull(h.averageExpense),
        averageMonthlyIncome: orNull(h.averageIncome),
        averageSavingsRate: h.averageSavingsRate,
      },
      projection: p && {
        expenses: taka(p.expense),
        income: taka(p.income),
        incomeIsEstimated: p.incomeIsEstimated,
        savings: taka(p.savings),
        savingsRate: p.savingsRate,
        method: p.method,
        confidence: p.confidence,
        dayOfMonth: p.dayOfMonth,
        daysInMonth: p.daysInMonth,
        isEstimate: true,
      },
      categoryBreakdown: a.categories.map((c) => ({
        key: c.key,
        name: c.name,
        amount: taka(c.amount),
        previousAmount: taka(c.previousAmount),
        change: taka(c.change),
        changePercent:
          c.changePercent === null ? null : Math.round(c.changePercent * 10) / 10,
        shareOfExpenses: c.shareOfExpenses,
      })),
      trends: {
        monthly: a.trends.monthly.map((m) => ({
          ...m,
          income: taka(m.income),
          expense: taka(m.expense),
          savings: taka(m.savings),
        })),
        categoryTrend: {
          categories: a.trends.categoryTrend.categories,
          rows: a.trends.categoryTrend.rows.map((row) =>
            Object.fromEntries(
              Object.entries(row).map(([k, v]) => [k, k === 'month' ? v : taka(v)]),
            ),
          ),
        },
      },
      insights: a.insights,
    };
  }

  /** Plain-language rules the numbers were built on, shown in the UI. */
  dataNotes() {
    return [
      'Only completed transactions touching your personal wallet are counted. Pending, failed and rejected ones are ignored.',
      'Departmental wallet activity is never counted as your personal spending.',
      'Money moved between your own wallets is not an expense.',
      'Top-ups (deposits) only raise your wallet balance; they are not counted as income.',
      'Money received from a department wallet is currently treated as salary income.',
      'Transactions are not categorized yet, so spending appears as "Uncategorized".',
      'DPS/savings and loan repayments cannot be told apart from other expenses yet.',
    ];
  }
}
