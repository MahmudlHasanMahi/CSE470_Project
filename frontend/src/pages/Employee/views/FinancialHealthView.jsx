import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import AccountBalanceWalletRounded from "@mui/icons-material/AccountBalanceWalletRounded";
import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRounded from "@mui/icons-material/TrendingDownRounded";
import SavingsRounded from "@mui/icons-material/SavingsRounded";
import PaymentsRounded from "@mui/icons-material/PaymentsRounded";
import ScienceRounded from "@mui/icons-material/ScienceRounded";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Stagger } from "../motion.jsx";
import { Btn, Caption, EmptyState, Meter, Panel, StatCard } from "../components/SharedUI.jsx";
import { useFinancialDashboard } from "../../../api/financial-health.api.js";
import {
  apiErrorMessage,
  currentMonthKey,
  formatPercent,
  formatPoints,
  formatTaka,
  monthLabel,
} from "../../../utils/money.js";

const CHART_COLORS = ["#7743DB", "#C3ACD0", "#2B2140", "#E0A458", "#4FA095", "#D96C75", "#8D7AA8"];
const SEVERITY = { positive: "success", warning: "warning", error: "error", info: "info" };
const grid = (min) => ({
  display: "grid",
  gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
  gap: 2,
});

const moneyTick = (v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : v);

export default function FinancialHealthView() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(null); // null = current month
  const [showNotes, setShowNotes] = useState(false);
  const [loanToast, setLoanToast] = useState(false);
  const { data, isLoading, error, refetch, isFetching } = useFinancialDashboard(month);

  if (isLoading) {
    return (
      <Box sx={{ py: 10, display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <Alert
        severity="error"
        action={<Button onClick={() => refetch()}>Retry</Button>}
        sx={{ borderRadius: "12px" }}
      >
        {apiErrorMessage(error, "Could not load your financial health dashboard.")}
      </Alert>
    );
  }

  const { summary, comparison, history, projection, wallets } = data;
  const personal = wallets.personal;
  const hasExpenses = data.categoryBreakdown.some((c) => c.amount > 0);

  const monthlyData = data.trends.monthly.map((m) => ({
    label: monthLabel(m.month, true),
    Income: m.income,
    Expenses: m.expense,
    "Savings rate": m.savingsRate,
  }));
  const trendRows = data.trends.categoryTrend.rows.map((r) => ({
    ...r,
    label: monthLabel(r.month, true),
  }));
  const pieData = data.categoryBreakdown
    .filter((c) => c.amount > 0)
    .map((c) => ({ name: c.name, value: c.amount }));

  const changeText = (n) =>
    n === null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
  const comparedTo =
    comparison.basis === "same_period"
      ? `Same days of ${monthLabel(comparison.previousMonth)}`
      : `vs ${monthLabel(comparison.previousMonth)}`;

  return (
    <Stagger>
      {/* Header: month picker + links to the related features */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5">Financial Health</Typography>
          <Caption block>
            Based on your completed personal wallet transactions
            {isFetching && " · refreshing…"}
          </Caption>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            type="month"
            size="small"
            label="Month"
            value={month ?? data.month}
            onChange={(e) => setMonth(e.target.value || null)}
            slotProps={{
              htmlInput: { max: currentMonthKey() },
              inputLabel: { shrink: true },
            }}
          />
          <Btn
            variant="outlined"
            startIcon={<ScienceRounded />}
            onClick={() => navigate("/employee/financial-scenarios")}
          >
            What-if simulator
          </Btn>
          {/* Loan management is a later feature: this button is the placeholder. */}
          <Btn
            variant="contained"
            startIcon={<PaymentsRounded />}
            onClick={() => setLoanToast(true)}
          >
            Loan management planning
          </Btn>
        </Box>
      </Box>

      {!personal && (
        <EmptyState
          title="No personal wallet found"
          description="Your financial health appears here once a personal wallet exists for your account."
        />
      )}

      {personal && (
        <Box sx={{ display: "grid", gap: 3 }}>
          {/* Summary cards */}
          <Box sx={grid(220)}>
            <StatCard
              label="Personal wallet balance"
              value={personal.balance}
              format={formatTaka}
              icon={<AccountBalanceWalletRounded fontSize="small" />}
              note={`${personal.name} · current balance, not savings`}
            />
            <StatCard
              label="Income"
              value={summary.income}
              format={formatTaka}
              tone="success"
              icon={<TrendingUpRounded fontSize="small" />}
              note={
                summary.income === 0
                  ? "No income recorded"
                  : Object.entries(summary.incomeBySource)
                      .map(([k, v]) => `${k.replace("_", " ")}: ${formatTaka(v)}`)
                      .join(" · ")
              }
            />
            <StatCard
              label="Expenses"
              value={summary.expenses}
              format={formatTaka}
              tone="error"
              icon={<TrendingDownRounded fontSize="small" />}
              note={`${summary.transactionCount} completed transactions`}
            />
            <StatCard
              label="Remaining after expenses"
              value={summary.remaining}
              format={formatTaka}
              tone={summary.remaining < 0 ? "error" : "primary"}
              icon={<AccountBalanceWalletRounded fontSize="small" />}
              note="Income minus expenses this month"
            />
            <StatCard
              label="Monthly savings"
              value={summary.savings}
              format={formatTaka}
              tone="success"
              icon={<SavingsRounded fontSize="small" />}
              note={
                summary.deficit > 0
                  ? `Overspent by ${formatTaka(summary.deficit)}`
                  : "Money kept from this month's income"
              }
            />
            <StatCard
              label="Savings rate"
              value={summary.savingsRate ?? 0}
              format={() => formatPercent(summary.savingsRate, 0)}
              tone={summary.savingsRate !== null && summary.savingsRate < 0 ? "error" : "success"}
              icon={<SavingsRounded fontSize="small" />}
              note={
                comparison.savingsRateChange !== null
                  ? `${formatPoints(comparison.savingsRateChange)} vs ${monthLabel(comparison.previousMonth, true)}`
                  : summary.savingsRate === null
                    ? "Needs income to calculate"
                    : "No earlier month to compare"
              }
            />
            <StatCard
              label="Expenses vs last month"
              value={comparison.expenseChangePercent ?? 0}
              format={() => changeText(comparison.expenseChangePercent)}
              tone={
                comparison.expenseChangePercent > 0
                  ? "warning"
                  : comparison.expenseChangePercent < 0
                    ? "success"
                    : "primary"
              }
              icon={<TrendingUpRounded fontSize="small" />}
              note={
                comparison.expenseChangePercent === null
                  ? "No earlier spending to compare"
                  : `${comparedTo}: ${formatTaka(comparison.previousExpenses)}`
              }
            />
            <StatCard
              label="Average monthly expenses"
              value={history.averageMonthlyExpenses ?? 0}
              format={() =>
                history.averageMonthlyExpenses === null
                  ? "—"
                  : formatTaka(history.averageMonthlyExpenses)
              }
              icon={<TrendingDownRounded fontSize="small" />}
              note={
                history.hasEnoughHistory
                  ? `Baseline from ${history.monthsConsidered} earlier month${history.monthsConsidered > 1 ? "s" : ""}`
                  : "Not enough history yet"
              }
            />
          </Box>

          {/* Projection (only the in-progress month has one) + insights */}
          <Box sx={{ ...grid(360), alignItems: "start" }}>
            {projection && (
              <Panel
                title="Expected by month end"
                subtitle={`Day ${projection.dayOfMonth} of ${projection.daysInMonth}`}
                action={
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    label={`Estimate · ${projection.confidence} confidence`}
                  />
                }
              >
                <Meter
                  value={projection.expenses > 0 ? (summary.expenses / projection.expenses) * 100 : 0}
                  left={<Caption>Spent so far (actual) {formatTaka(summary.expenses)}</Caption>}
                  right={<Caption>Projected {formatTaka(projection.expenses)}</Caption>}
                />
                <Box sx={{ ...grid(130), mt: 2.5 }}>
                  <Box>
                    <Caption block>Projected expenses</Caption>
                    <Typography fontWeight={700}>{formatTaka(projection.expenses)}</Typography>
                  </Box>
                  <Box>
                    <Caption block>
                      {projection.incomeIsEstimated ? "Expected income (usual)" : "Income"}
                    </Caption>
                    <Typography fontWeight={700}>{formatTaka(projection.income)}</Typography>
                  </Box>
                  <Box>
                    <Caption block>Projected savings</Caption>
                    <Typography
                      fontWeight={700}
                      color={projection.savings < 0 ? "error.main" : "text.primary"}
                    >
                      {formatTaka(projection.savings)} ({formatPercent(projection.savingsRate)})
                    </Typography>
                  </Box>
                </Box>
                <Caption block sx={{ mt: 2 }}>
                  {projection.method === "blended"
                    ? "Built from your spending so far plus your usual daily spending."
                    : projection.method === "run_rate"
                      ? "Built only from your pace so far, because there is no earlier history."
                      : "The month is complete, so this is the actual total."}
                </Caption>
              </Panel>
            )}

            <Panel title="Financial feedback" subtitle="Generated from your actual records">
              {data.insights.length === 0 ? (
                <Caption>No feedback yet for this month.</Caption>
              ) : (
                <Box sx={{ display: "grid", gap: 1 }}>
                  {data.insights.map((i) => (
                    <Alert
                      key={i.id}
                      severity={SEVERITY[i.severity] || "info"}
                      variant="outlined"
                      sx={{ borderRadius: "10px" }}
                    >
                      {i.message}
                    </Alert>
                  ))}
                </Box>
              )}
            </Panel>
          </Box>

          {/* Category breakdown */}
          <Box sx={{ ...grid(360), alignItems: "start" }}>
            <Panel title="Where your money went" subtitle={monthLabel(data.month)}>
              {!hasExpenses ? (
                <EmptyState
                  title="No expenses this month"
                  description="Completed payments from your personal wallet will appear here."
                />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip formatter={(v) => formatTaka(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel title="Category summary" subtitle="Share of expenses and change vs the comparison period">
              {!hasExpenses ? (
                <Caption>Nothing to show yet.</Caption>
              ) : (
                <Box sx={{ display: "grid", gap: 1.75 }}>
                  {data.categoryBreakdown
                    .filter((c) => c.amount > 0)
                    .map((c) => (
                      <Meter
                        key={c.key}
                        value={c.shareOfExpenses}
                        left={<Typography variant="body2" fontWeight={600}>{c.name}</Typography>}
                        right={
                          <Caption>
                            {formatTaka(c.amount)} · {formatPercent(c.shareOfExpenses)}
                            {c.changePercent !== null && ` · ${changeText(c.changePercent)}`}
                          </Caption>
                        }
                      />
                    ))}
                </Box>
              )}
            </Panel>
          </Box>

          {/* Historical charts */}
          <Box sx={{ ...grid(360), alignItems: "start" }}>
            <Panel title="Income vs expenses" subtitle="Last 7 months">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={moneyTick} />
                  <ChartTooltip formatter={(v) => formatTaka(v)} />
                  <Legend />
                  <Bar dataKey="Income" fill="#4FA095" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#7743DB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Savings rate trend" subtitle="Gaps mean no income was recorded that month">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(v) => `${v}%`} />
                  <ChartTooltip formatter={(v) => formatPercent(v, 1)} />
                  <Line type="monotone" dataKey="Savings rate" stroke="#7743DB" strokeWidth={2.5} dot />
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Category spending trend" subtitle="Top categories by month">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={trendRows}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={moneyTick} />
                  <ChartTooltip formatter={(v) => formatTaka(v)} />
                  <Legend />
                  {data.trends.categoryTrend.categories.map((c, i) => (
                    <Bar key={c.key} dataKey={c.key} name={c.name} stackId="spend" fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </Box>

          {/* Organisation wallets: shown for reference, never part of personal figures */}
          {wallets.departmental.length > 0 && (
            <Panel
              title="Department & shared wallets"
              subtitle="Organisational money. Not included in any personal figure above."
            >
              <Box sx={grid(240)}>
                {wallets.departmental.map((w) => (
                  <Box key={w.id} sx={{ p: 2, borderRadius: "10px", bgcolor: "background.default", border: 1, borderColor: "divider" }}>
                    <Typography variant="body2" fontWeight={600}>{w.name}</Typography>
                    <Typography variant="h6">{formatTaka(w.balance)}</Typography>
                    <Chip size="small" label={w.isDepartment ? "Department" : w.type} />
                  </Box>
                ))}
              </Box>
            </Panel>
          )}

          {/* How it is calculated */}
          <Box>
            <Button size="small" startIcon={<InfoOutlined />} onClick={() => setShowNotes((s) => !s)}>
              How these numbers are calculated
            </Button>
            <Collapse in={showNotes}>
              <Box component="ul" sx={{ color: "text.secondary", typography: "caption", mt: 1 }}>
                {data.dataNotes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </Box>
            </Collapse>
          </Box>
        </Box>
      )}

      <Snackbar
        open={loanToast}
        autoHideDuration={3000}
        onClose={() => setLoanToast(false)}
        message="Loan management planning is coming soon."
      />
    </Stagger>
  );
}
