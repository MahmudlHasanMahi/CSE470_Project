
import {
  formatMoney,
  fromPaisa,
  round1,
  savingsRateOf,
} from '../financial-health/financial-health.calculator';

export const CHANGE_TYPES = ['ADD_EXPENSE', 'REDUCE_EXPENSE', 'ADD_INCOME'];

const sumOf = (items, type) =>
  items.filter((i) => i.changeType === type).reduce((s, i) => s + i.amount, 0);

/** One financial position: what the month looks like for a given income/expense. */
function position({ income, expense, balance, actualIncome, actualExpense }) {
  const savings = income - expense;
  // Money still to leave / arrive before month end, applied to today's wallet balance.
  const endBalance = balance + (income - actualIncome) - (expense - actualExpense);
  return {
    income,
    expense,
    savings,
    savingsRate: savingsRateOf(income, expense),
    endBalance,
    shortfall: Math.max(-endBalance, 0),
  };
}

/**
 * baseline (paisa): { balance, actualIncome, actualExpense,
 *                     projectedIncome, projectedExpense, incomeIsEstimated, confidence }
 * items (paisa):    [{ changeType, amount, category?, description? }]
 */
export function simulate(baseline, items) {
  const { balance, actualIncome, actualExpense } = baseline;

  const actual = {
    income: actualIncome,
    expense: actualExpense,
    savings: actualIncome - actualExpense,
    savingsRate: savingsRateOf(actualIncome, actualExpense),
    balance,
  };

  const original = position({
    income: baseline.projectedIncome,
    expense: baseline.projectedExpense,
    balance,
    actualIncome,
    actualExpense,
  });

  const added = sumOf(items, 'ADD_EXPENSE');
  const requestedReduction = sumOf(items, 'REDUCE_EXPENSE');
  const extraIncome = sumOf(items, 'ADD_INCOME');

  // You cannot save on money that is already spent: reductions only apply to
  // the part of the projection that has not happened yet.
  const reducible = Math.max(baseline.projectedExpense - actualExpense, 0);
  const appliedReduction = Math.min(requestedReduction, reducible);

  const scenario = position({
    income: baseline.projectedIncome + extraIncome,
    expense: baseline.projectedExpense + added - appliedReduction,
    balance,
    actualIncome,
    actualExpense,
  });

  const difference = {
    expense: scenario.expense - original.expense,
    income: scenario.income - original.income,
    savings: scenario.savings - original.savings,
    savingsRate:
      scenario.savingsRate !== null && original.savingsRate !== null
        ? round1(scenario.savingsRate - original.savingsRate)
        : null,
    endBalance: scenario.endBalance - original.endBalance,
  };

  const flags = {
    expensesExceedIncome: scenario.expense > scenario.income && scenario.expense > 0,
    canCoverAddedExpenses: added === 0 ? true : balance >= added,
    hasShortfall: scenario.shortfall > 0,
    newShortfall: scenario.shortfall > 0 && original.shortfall === 0,
    reductionWasCapped: requestedReduction > appliedReduction,
  };

  const totals = { added, requestedReduction, appliedReduction, extraIncome };

  return {
    actual,
    original,
    scenario,
    difference,
    flags,
    totals,
    feedback: buildFeedback({ baseline, items, original, scenario, difference, flags, totals }),
  };
}

/** Sentences are built from the computed numbers above, never hardcoded results. */
function buildFeedback({ baseline, items, original, scenario, difference, flags, totals }) {
  const out = [];
  const add = (id, severity, message) => out.push({ id, severity, message });
  const m = formatMoney;

  if (items.length === 0) {
    add('no_changes', 'info', 'Add an expense, a reduction or extra income to see its impact.');
    return out;
  }

  if (totals.added > 0) {
    const delta = difference.savings;
    add(
      'added_expense',
      'warning',
      `Adding ${m(totals.added)} of expenses will raise your projected spending by ${m(totals.added)} and ${
        delta < 0 ? `reduce your projected savings by ${m(Math.abs(delta))}` : 'not lower your projected savings'
      }.`,
    );
    if (!flags.canCoverAddedExpenses) {
      add(
        'insufficient_funds',
        'error',
        `You may not have sufficient available funds to cover this: your wallet holds ${m(baseline.balance)} but ${m(totals.added)} of new spending is planned.`,
      );
    }
  }

  if (totals.requestedReduction > 0) {
    const named = items
      .filter((i) => i.changeType === 'REDUCE_EXPENSE' && i.category)
      .map((i) => i.category.toLowerCase());
    const unique = [...new Set(named)];
    const what =
      unique.length > 0 && unique.length === items.filter((i) => i.changeType === 'REDUCE_EXPENSE').length
        ? `Reducing ${unique.join(' and ')} expenses`
        : 'Reducing expenses';
    add(
      'reduced_expense',
      'positive',
      `${what} by ${m(totals.appliedReduction)} will lower your projected spending to ${m(scenario.expense)}.`,
    );
    if (flags.reductionWasCapped) {
      add(
        'reduction_capped',
        'info',
        `Only ${m(totals.appliedReduction)} of the ${m(totals.requestedReduction)} reduction counts, because the rest of this month's projected spending has already happened.`,
      );
    }
  }

  if (totals.extraIncome > 0) {
    add(
      'extra_income',
      'positive',
      `Additional income of ${m(totals.extraIncome)} will lift your projected savings to ${m(scenario.savings)}.`,
    );
  }

  if (difference.savings > 0) {
    add(
      'savings_up',
      'positive',
      `Your projected savings improve by ${m(difference.savings)}${
        difference.savingsRate !== null && difference.savingsRate !== 0
          ? ` and your savings rate changes by ${difference.savingsRate > 0 ? '+' : ''}${difference.savingsRate} points`
          : ''
      }.`,
    );
  } else if (difference.savings < 0 && totals.added === 0) {
    add('savings_down', 'warning', `Your projected savings fall by ${m(Math.abs(difference.savings))}.`);
  }

  if (flags.expensesExceedIncome) {
    add(
      'exceeds_income',
      'warning',
      `Your projected expenses (${m(scenario.expense)}) will exceed your monthly income (${m(scenario.income)}) by ${m(scenario.expense - scenario.income)}.`,
    );
  }

  if (flags.hasShortfall) {
    add(
      'shortfall',
      'error',
      `You may face a shortfall of ${m(scenario.shortfall)} by the end of the month.`,
    );
  } else if (original.shortfall > 0) {
    add('shortfall_resolved', 'positive', 'This scenario removes the shortfall in your original projection.');
  }

  if (baseline.incomeIsEstimated || baseline.confidence === 'low') {
    add(
      'estimate_notice',
      'info',
      baseline.incomeIsEstimated
        ? 'Projected income is an estimate based on your usual monthly income, because this month\'s income has not fully arrived.'
        : 'The projection is based on limited history, so treat these figures as rough.',
    );
  }

  return out;
}

/** Convert one position (paisa) to taka for JSON output. */
const posOut = (p) => ({
  income: fromPaisa(p.income),
  expense: fromPaisa(p.expense),
  savings: fromPaisa(p.savings),
  savingsRate: p.savingsRate,
  projectedEndBalance: fromPaisa(p.endBalance),
  shortfall: fromPaisa(p.shortfall),
});

export function serializeSimulation(result, baseline) {
  return {
    baseline: {
      month: baseline.month,
      walletBalance: fromPaisa(baseline.balance),
      incomeIsEstimated: baseline.incomeIsEstimated,
      confidence: baseline.confidence,
      method: baseline.method,
      dayOfMonth: baseline.dayOfMonth,
      daysInMonth: baseline.daysInMonth,
    },
    // 1. what has really happened so far (actual)
    actual: {
      income: fromPaisa(result.actual.income),
      expense: fromPaisa(result.actual.expense),
      savings: fromPaisa(result.actual.savings),
      savingsRate: result.actual.savingsRate,
      walletBalance: fromPaisa(result.actual.balance),
      isEstimate: false,
    },
    // 2. end-of-month estimate WITHOUT your what-if changes
    original: { ...posOut(result.original), isEstimate: true },
    // 3. end-of-month estimate WITH your what-if changes
    scenario: { ...posOut(result.scenario), isEstimate: true },
    difference: {
      expense: fromPaisa(result.difference.expense),
      income: fromPaisa(result.difference.income),
      savings: fromPaisa(result.difference.savings),
      savingsRate: result.difference.savingsRate,
      projectedEndBalance: fromPaisa(result.difference.endBalance),
    },
    flags: result.flags,
    totals: {
      addedExpenses: fromPaisa(result.totals.added),
      requestedReduction: fromPaisa(result.totals.requestedReduction),
      appliedReduction: fromPaisa(result.totals.appliedReduction),
      additionalIncome: fromPaisa(result.totals.extraIncome),
    },
    feedback: result.feedback,
  };
}
