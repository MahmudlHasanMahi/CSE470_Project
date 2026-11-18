
export const COMPLETED_STATUSES = ['completed'];

// Bangladesh has no daylight saving, so a fixed +6h offset is exact.
export const TZ_OFFSET_MS = 6 * 60 * 60 * 1000;
export const TIMEZONE = 'Asia/Dhaka';

// How many full months before the selected month are used for history.
export const HISTORY_MONTHS = 6;

export const UNCATEGORIZED_KEY = 'uncategorized';


export const categoryKeyOf = (categoryId) => categoryId || UNCATEGORIZED_KEY;
export const categoryLabelOf = (key) =>
  key === UNCATEGORIZED_KEY ? 'Uncategorized' : key;

/* ───────── Money helpers ───────── */

export function toPaisa(value) {
  if (value === null || value === undefined) return 0;
  const text =
    typeof value === 'string' ? Number(value).toFixed(2) : value.toFixed(2);
  const negative = text.startsWith('-');
  const digits = Number(text.replace('-', '').replace('.', ''));
  return negative ? -digits : digits;
}

/** integer paisa -> taka as a number with at most 2 decimals (for JSON output). */
export const fromPaisa = (paisa) => Math.round(paisa) / 100;

export const formatMoney = (paisa) => {
  const hasPaisa = Math.round(paisa) % 100 !== 0;
  return `৳${fromPaisa(paisa).toLocaleString('en-US', {
    minimumFractionDigits: hasPaisa ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
};

/** Percentage change from `previous` to `current`; null when previous is 0. */
export const percentChange = (current, previous) =>
  previous > 0 ? ((current - previous) / previous) * 100 : null;

/** (income - expenses) / income * 100, or null when there is no income. */
export const savingsRateOf = (incomePaisa, expensePaisa) =>
  incomePaisa > 0
    ? round1(((incomePaisa - expensePaisa) / incomePaisa) * 100)
    : null;

export const round1 = (n) => Math.round(n * 10) / 10;

/* ───────── Month helpers (all in Dhaka time) ───────── */

const shifted = (date) => new Date(date.getTime() + TZ_OFFSET_MS);
const pad = (n) => String(n).padStart(2, '0');

/** Date -> "2026-11" (month as seen in Dhaka). */
export function monthKeyOf(date) {
  const s = shifted(date);
  return `${s.getUTCFullYear()}-${pad(s.getUTCMonth() + 1)}`;
}

export function parseMonthKey(key) {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(key || '');
  return m ? { year: Number(m[1]), month: Number(m[2]) } : null;
}

export function addMonths(key, n) {
  const { year, month } = parseMonthKey(key);
  const index = year * 12 + (month - 1) + n;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/** First instant (UTC Date) of a Dhaka month. */
export function monthStart(key) {
  const { year, month } = parseMonthKey(key);
  return new Date(Date.UTC(year, month - 1, 1) - TZ_OFFSET_MS);
}

export function daysInMonth(key) {
  const { year, month } = parseMonthKey(key);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Day of the month (1-31) as seen in Dhaka. */
export const dayOfMonth = (date) => shifted(date).getUTCDate();

/* ───────── Step 1: classify each transaction ───────── */

export const isCompleted = (status) =>
  COMPLETED_STATUSES.includes(String(status || '').toLowerCase());


export const TYPE_RULES = {
  expense: 'expense',
  transfer: 'wallets',
  deposit: 'ignore', // top-up: only raises the wallet balance (confirmed)
  payout: 'ignore', // TODO: confirm meaning (money out to an external account?)
  payin: 'ignore', // TODO: confirm meaning (money in from an external account?)
};


export function classifyTxn(txn, personalWalletId, userId) {
  if (!isCompleted(txn.status)) return { kind: 'ignored', reason: 'not_completed' };

  const leaves = txn.sourceWalletId === personalWalletId;
  const arrives = txn.destinationWalletId === personalWalletId;
  if (!leaves && !arrives) return { kind: 'ignored', reason: 'unrelated' };
  if (leaves && arrives) return { kind: 'ignored', reason: 'same_wallet' };

  const rule = TYPE_RULES[String(txn.type || '').toLowerCase()] || 'ignore';
  if (rule === 'ignore') return { kind: 'ignored', reason: 'type_ignored' };

  if (rule === 'expense') {
    return leaves
      ? { kind: 'expense', source: 'spend' }
      : { kind: 'ignored', reason: 'expense_not_from_personal_wallet' };
  }

  // rule === 'wallets' (transfers): needs a wallet on both ends
  const from = txn.sourceWallet;
  const to = txn.destinationWallet;
  if (!from || !to) return { kind: 'ignored', reason: 'incomplete_transfer' };
  if (from.userId === userId && to.userId === userId) {
    return { kind: 'ignored', reason: 'own_wallet_transfer' };
  }
  if (leaves) {
    return { kind: 'expense', source: to.departmentId ? 'to_department' : 'transfer_out' };
  }
  // TODO(loan/funding): a department transfer is assumed to be salary for now.
  return { kind: 'income', source: from.departmentId ? 'salary' : 'transfer_in' };
}

/** Turn raw Txn rows into a flat list the aggregator understands. */
export function classifyAll(txns, personalWalletId, userId) {
  const out = [];
  for (const txn of txns) {
    const c = classifyTxn(txn, personalWalletId, userId);
    if (c.kind === 'ignored') continue;
    out.push({
      kind: c.kind,
      source: c.source,
      amount: toPaisa(txn.amount),
      categoryKey: categoryKeyOf(txn.categoryId),
      recurring: Boolean(txn.recurringPaymentId),
      month: monthKeyOf(txn.occurredAt),
      day: dayOfMonth(txn.occurredAt),
    });
  }
  return out;
}

/* ───────── Step 2: totals ───────── */


export function totalsFor(classified, month, maxDay = Infinity) {
  const totals = {
    income: 0,
    expense: 0,
    recurringExpense: 0, // part of `expense` that came from recurring payments
    count: 0,
    byCategory: {}, // categoryKey -> paisa
    incomeBySource: {}, // source -> paisa
  };
  for (const t of classified) {
    if (t.month !== month || t.day > maxDay) continue;
    totals.count += 1;
    if (t.kind === 'income') {
      totals.income += t.amount;
      totals.incomeBySource[t.source] =
        (totals.incomeBySource[t.source] || 0) + t.amount;
    } else {
      totals.expense += t.amount;
      if (t.recurring) totals.recurringExpense += t.amount;
      totals.byCategory[t.categoryKey] =
        (totals.byCategory[t.categoryKey] || 0) + t.amount;
    }
  }
  return totals;
}
/* ───────── Step 3: history & projection ───────── */


export function historyFor(classified, month) {
  const keys = [];
  for (let i = HISTORY_MONTHS; i >= 1; i--) keys.push(addMonths(month, -i));
  const rows = keys.map((key) => ({ key, ...totalsFor(classified, key) }));
  const firstWithData = rows.findIndex((r) => r.count > 0);
  const considered = firstWithData === -1 ? [] : rows.slice(firstWithData);
  const n = considered.length;
  const avg = (field) =>
    n ? Math.round(considered.reduce((s, r) => s + r[field], 0) / n) : null;
  const rates = considered
    .map((r) => savingsRateOf(r.income, r.expense))
    .filter((r) => r !== null);

  return {
    monthsConsidered: n,
    hasEnoughHistory: n >= 1,
    averageExpense: avg('expense'),
    averageIncome: avg('income'),
    averageSavingsRate: rates.length
      ? round1(rates.reduce((a, b) => a + b, 0) / rates.length)
      : null,
  };
}


export function projectExpense({ spent, day, totalDays, historicalAverage, monthsOfHistory }) {
  if (day >= totalDays) {
    return { amount: spent, method: 'actual', confidence: 'high' };
  }
  const remainingDays = totalDays - day;
  const currentDaily = spent / Math.max(day, 1);

  let dailyRemaining;
  let method;
  let confidence;
  if (historicalAverage !== null && historicalAverage !== undefined) {
    const weight = day / totalDays;
    dailyRemaining = weight * currentDaily + (1 - weight) * (historicalAverage / totalDays);
    method = 'blended';
    confidence = monthsOfHistory >= 3 ? 'high' : 'medium';
  } else {
    dailyRemaining = currentDaily;
    method = 'run_rate';
    confidence = day >= 10 ? 'medium' : 'low';
  }
  return {
    amount: spent + Math.round(dailyRemaining * remainingDays),
    method,
    confidence,
  };
}

/** Salary often arrives once a month. If it has not arrived yet, expect the usual amount. */
export function projectIncome({ actual, historicalAverage, isCurrentMonth }) {
  if (
    isCurrentMonth &&
    historicalAverage !== null &&
    historicalAverage !== undefined &&
    historicalAverage > actual
  ) {
    return { amount: historicalAverage, estimated: true };
  }
  return { amount: actual, estimated: false };
}

/* ───────── Step 4: the full analysis of one month ───────── */


export function analyzeMonth({ classified, month, now = new Date() }) {
  const currentMonth = monthKeyOf(now);
  const isCurrentMonth = month === currentMonth;
  const totalDays = daysInMonth(month);
  const today = isCurrentMonth ? dayOfMonth(now) : totalDays;

  const current = totalsFor(classified, month);
  const previousMonth = addMonths(month, -1);
  const previousFull = totalsFor(classified, previousMonth);
  // In-progress month: compare against the same days of last month.
  const previousComparable = isCurrentMonth
    ? totalsFor(classified, previousMonth, Math.min(today, daysInMonth(previousMonth)))
    : previousFull;

  const history = historyFor(classified, month);

  const remaining = current.income - current.expense;
  const savingsRate = savingsRateOf(current.income, current.expense);
  const previousSavingsRate = savingsRateOf(previousFull.income, previousFull.expense);

  let projection = null;
  if (isCurrentMonth) {
    const expense = projectExpense({
      spent: current.expense,
      day: today,
      totalDays,
      historicalAverage: history.averageExpense,
      monthsOfHistory: history.monthsConsidered,
    });
    const income = projectIncome({
      actual: current.income,
      historicalAverage: history.averageIncome,
      isCurrentMonth,
    });
    projection = {
      expense: expense.amount,
      income: income.amount,
      incomeIsEstimated: income.estimated,
      savings: income.amount - expense.amount,
      savingsRate: savingsRateOf(income.amount, expense.amount),
      method: expense.method,
      confidence: expense.confidence,
      dayOfMonth: today,
      daysInMonth: totalDays,
    };
  }

  // Category breakdown with change vs the comparable previous period.
  const keys = new Set([
    ...Object.keys(current.byCategory),
    ...Object.keys(previousComparable.byCategory),
  ]);
  const categories = [...keys]
    .map((key) => {
      const amount = current.byCategory[key] || 0;
      const previous = previousComparable.byCategory[key] || 0;
      return {
        key,
        name: categoryLabelOf(key),
        amount,
        previousAmount: previous,
        change: amount - previous,
        changePercent: percentChange(amount, previous),
        shareOfExpenses: current.expense > 0 ? round1((amount / current.expense) * 100) : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // Monthly trend over the history window + selected month.
  const trendKeys = [];
  for (let i = HISTORY_MONTHS; i >= 0; i--) trendKeys.push(addMonths(month, -i));
  const trendTotals = trendKeys.map((key) => ({ key, ...totalsFor(classified, key) }));
  const monthly = trendTotals.map((t) => ({
    month: t.key,
    income: t.income,
    expense: t.expense,
    savings: t.income - t.expense,
    savingsRate: savingsRateOf(t.income, t.expense),
    hasData: t.count > 0,
  }));

  // Category trend: the 5 biggest categories in the window, the rest as "Other".
  const windowTotals = {};
  for (const t of trendTotals)
    for (const [k, v] of Object.entries(t.byCategory)) windowTotals[k] = (windowTotals[k] || 0) + v;
  const topKeys = Object.entries(windowTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);
  const hasOther = Object.keys(windowTotals).length > topKeys.length;
  const categoryTrend = {
    categories: [
      ...topKeys.map((k) => ({ key: k, name: categoryLabelOf(k) })),
      ...(hasOther ? [{ key: '__other', name: 'Other categories' }] : []),
    ],
    rows: trendTotals.map((t) => {
      const row = { month: t.key };
      let other = 0;
      for (const [k, v] of Object.entries(t.byCategory)) {
        if (topKeys.includes(k)) row[k] = v;
        else other += v;
      }
      for (const k of topKeys) row[k] = row[k] || 0;
      if (hasOther) row.__other = other;
      return row;
    }),
  };

  const analysis = {
    month,
    isCurrentMonth,
    current,
    previous: {
      month: previousMonth,
      basis: isCurrentMonth ? 'same_period' : 'full_month',
      expense: previousComparable.expense,
      income: previousComparable.income,
      expenseChangePercent: percentChange(current.expense, previousComparable.expense),
      hasData: previousFull.count > 0,
      fullMonthExpense: previousFull.expense,
      savingsRate: previousSavingsRate,
    },
    summary: {
      income: current.income,
      expense: current.expense,
      remaining, // income - expenses (negative = overspent)
      savings: Math.max(remaining, 0), // money actually kept
      deficit: Math.max(-remaining, 0),
      savingsRate, // signed; null when no income
      recurringExpense: current.recurringExpense,
      transactionCount: current.count,
      incomeBySource: current.incomeBySource,
    },
    history,
    projection,
    categories,
    trends: { monthly, categoryTrend },
  };
  analysis.insights = buildInsights(analysis);
  return analysis;
}

/* ───────── Step 5: automated feedback ───────── */

const pct = (n) => `${Math.round(Math.abs(n))}%`;

/** Every sentence below is produced from the numbers in `a`; nothing is canned data. */
export function buildInsights(a) {
  const out = [];
  const add = (id, severity, message) => out.push({ id, severity, message });
  const { summary, previous, history, projection, categories } = a;
  const when = a.isCurrentMonth ? 'this month' : 'in this month';

  if (summary.transactionCount === 0) {
    add('no_data', 'info', `No completed personal transactions were found ${when}.`);
  }

  // 1. Overspending
  if (summary.expense > 0 && summary.income === 0) {
    add('no_income', 'warning',
      `You have spent ${formatMoney(summary.expense)} ${when} but no income has been recorded.`);
  } else if (summary.income > 0 && summary.expense > summary.income) {
    add('over_income', 'warning',
      `You are spending more than your monthly income (${formatMoney(summary.expense)} spent vs ${formatMoney(summary.income)} earned).`);
  }

  // 2. Total expenses vs previous period
  const periodWord = previous.basis === 'same_period' ? 'the same period last month' : 'last month';
  if (previous.expense > 0 && previous.expenseChangePercent !== null) {
    const c = previous.expenseChangePercent;
    if (Math.round(Math.abs(c)) === 0) {
      add('expense_flat', 'info', `Your total expenses are about the same as ${periodWord}.`);
    } else if (c > 0) {
      add('expense_up', 'warning', `Your total expenses are up ${pct(c)} compared to ${periodWord}.`);
    } else {
      add('expense_down', 'positive', `Your total expenses are down ${pct(c)} compared to ${periodWord}.`);
    }
  }

  // 3. Category movements (needs real categories to be meaningful)
  const realCategories = categories.filter((c) => c.key !== UNCATEGORIZED_KEY);
  if (categories.length > 0 && realCategories.length === 0) {
    add('uncategorized', 'info',
      'Your expenses are not categorized yet, so category-level feedback is not available.');
  } else {
    const increases = categories.filter((c) => c.change > 0).sort((x, y) => y.change - x.change);
    const decreases = categories.filter((c) => c.change < 0 && c.previousAmount > 0).sort((x, y) => x.change - y.change);
    if (increases.length) {
      const c = increases[0];
      add('category_up', 'warning',
        c.changePercent !== null
          ? `${c.name} spending is up ${pct(c.changePercent)}, your biggest increase.`
          : `${c.name} is a new spending category ${when} (${formatMoney(c.amount)}).`);
    }
    if (decreases.length) {
      const c = decreases[0];
      add('category_down', 'positive',
        `Your ${c.name.toLowerCase()} expenses decreased by ${pct(c.changePercent)}.`);
    }
  }

  // 4. Savings rate movement (full previous month vs this month)
  if (summary.savingsRate !== null && previous.savingsRate !== null) {
    const diff = summary.savingsRate - previous.savingsRate;
    if (Math.abs(diff) >= 1) {
      add('savings_rate', diff > 0 ? 'positive' : 'warning',
        `Your savings rate ${diff > 0 ? 'improved' : 'dropped'} from ${Math.round(previous.savingsRate)}% to ${Math.round(summary.savingsRate)}%.`);
    }
  } else if (summary.savingsRate !== null && summary.savingsRate > 0 && previous.savingsRate === null) {
    add('saving', 'positive',
      `You have kept ${formatMoney(summary.savings)} (${Math.round(summary.savingsRate)}% of income) ${when}.`);
  }

  // 5. Versus your own average
  if (history.hasEnoughHistory && history.averageExpense > 0) {
    const basis = projection ? projection.expense : summary.expense;
    const c = percentChange(basis, history.averageExpense);
    if (c !== null && Math.abs(c) >= 10) {
      add('vs_average', c > 0 ? 'warning' : 'positive',
        projection
          ? `At this pace you will spend about ${formatMoney(basis)} this month, ${pct(c)} ${c > 0 ? 'above' : 'below'} your ${history.monthsConsidered}-month average of ${formatMoney(history.averageExpense)}.`
          : `This month's spending is ${pct(c)} ${c > 0 ? 'above' : 'below'} your ${history.monthsConsidered}-month average of ${formatMoney(history.averageExpense)}.`);
    }
  } else if (!history.hasEnoughHistory) {
    add('no_history', 'info',
      'There is not enough earlier history yet, so averages and comparisons will appear as more months of records build up.');
  }

  // 6. Projection warning
  if (projection && projection.income > 0 && projection.expense > projection.income && summary.expense <= summary.income) {
    add('projected_over_income', 'warning',
      `You are on track to spend ${formatMoney(projection.expense)} this month, which is more than your expected income of ${formatMoney(projection.income)}.`);
  }

  return out;
}
