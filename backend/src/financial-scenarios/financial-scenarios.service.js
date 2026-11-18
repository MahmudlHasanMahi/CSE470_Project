import {
  Injectable,
  Dependencies,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialHealthService } from '../financial-health/financial-health.service';
import { toPaisa } from '../financial-health/financial-health.calculator';
import {
  CHANGE_TYPES,
  serializeSimulation,
  simulate,
} from './financial-scenarios.calculator';

const MAX_ITEMS = 50;
const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/; // fits Decimal(14,2)

@Injectable()
@Dependencies(PrismaService, FinancialHealthService)
export class FinancialScenariosService {
  constructor(prisma, financialHealthService) {
    this.prisma = prisma;
    this.financialHealthService = financialHealthService;
  }

  /* ───────── Baseline (actual data, read-only) ───────── */


  async loadBaseline(userId) {
    const { month, analysis, balance, wallets } =
      await this.financialHealthService.getAnalysis(userId);
    const p = analysis.projection; // always present for the current month
    return {
      baseline: {
        month,
        balance,
        actualIncome: analysis.summary.income,
        actualExpense: analysis.summary.expense,
        projectedIncome: p.income,
        projectedExpense: p.expense,
        incomeIsEstimated: p.incomeIsEstimated,
        confidence: p.confidence,
        method: p.method,
        dayOfMonth: p.dayOfMonth,
        daysInMonth: p.daysInMonth,
      },
      wallets,
      history: analysis.history,
    };
  }

  async getBaseline(userId) {
    const { baseline, wallets, history } = await this.loadBaseline(userId);
    const result = simulate(baseline, []);
    return {
      ...serializeSimulation(result, baseline),
      wallets,
      history: {
        monthsConsidered: history.monthsConsidered,
        hasEnoughHistory: history.hasEnoughHistory,
      },
    };
  }

  /* ───────── Calculate (nothing is saved) ───────── */

  async calculate(userId, body) {
    const items = this.parseItems(body?.items, { min: 0 });
    return this.runSimulation(userId, items.map((i) => i.forCalc));
  }

  async runSimulation(userId, calcItems) {
    const { baseline } = await this.loadBaseline(userId);
    return serializeSimulation(simulate(baseline, calcItems), baseline);
  }

  /* ───────── Save / list / get / delete ───────── */

  async create(userId, body) {
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 100) {
      throw new BadRequestException('name is required (1-100 characters)');
    }
    const description = this.optionalText(body?.description, 500, 'description');
    const items = this.parseItems(body?.items, { min: 1 });

    // Only the two scenario tables are written. Wallet and Txn are never touched.
    const saved = await this.prisma.financialScenario.create({
      data: {
        userId, // from the login token, never from the request body
        name,
        description,
        items: { create: items.map((i) => i.forDb) },
      },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
    return this.presentScenario(saved);
  }

  async findAll(userId) {
    const rows = await this.prisma.financialScenario.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
    return rows.map((r) => this.presentScenario(r));
  }

  /** Returns the saved scenario plus its impact recalculated against TODAY's actual data. */
  async findOne(userId, id) {
    const row = await this.prisma.financialScenario.findFirst({
      where: { id, userId }, // ownership check: someone else's id looks like "not found"
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
    if (!row) throw new NotFoundException('Scenario not found');

    const calcItems = row.items.map((i) => ({
      changeType: i.changeType,
      amount: toPaisa(i.amount),
      category: i.category,
    }));
    return {
      ...this.presentScenario(row),
      impact: await this.runSimulation(userId, calcItems),
    };
  }

  async remove(userId, id) {
    const { count } = await this.prisma.financialScenario.deleteMany({
      where: { id, userId },
    });
    if (count === 0) throw new NotFoundException('Scenario not found');
    return { deleted: true, id };
  }

  /* ───────── Validation helpers ───────── */

  optionalText(value, max, field) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || value.trim().length > max) {
      throw new BadRequestException(`${field} must be text up to ${max} characters`);
    }
    return value.trim();
  }

  parseItems(raw, { min }) {
    if (raw === undefined || raw === null) raw = [];
    if (!Array.isArray(raw)) throw new BadRequestException('items must be a list');
    if (raw.length < min) throw new BadRequestException('Add at least one change');
    if (raw.length > MAX_ITEMS) {
      throw new BadRequestException(`A scenario can have at most ${MAX_ITEMS} changes`);
    }

    return raw.map((item, index) => {
      const at = `items[${index}]`;
      if (!item || !CHANGE_TYPES.includes(item.changeType)) {
        throw new BadRequestException(`${at}.changeType must be one of ${CHANGE_TYPES.join(', ')}`);
      }
      const amountText = String(item.amount ?? '').trim();
      if (!AMOUNT_PATTERN.test(amountText) || Number(amountText) <= 0) {
        throw new BadRequestException(`${at}.amount must be a positive number with at most 2 decimals`);
      }
      const category = this.optionalText(item.category, 100, `${at}.category`);
      const description = this.optionalText(item.description, 255, `${at}.description`);

      return {
        forCalc: {
          changeType: item.changeType,
          amount: toPaisa(amountText),
          category,
        },
        forDb: { changeType: item.changeType, amount: amountText, category, description },
      };
    });
  }

  presentScenario(row) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      items: row.items.map((i) => ({
        id: i.id,
        changeType: i.changeType,
        category: i.category,
        amount: Number(i.amount.toString()),
        description: i.description,
      })),
    };
  }
}
