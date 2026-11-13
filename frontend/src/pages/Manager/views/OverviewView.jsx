import { useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Chip,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AccountBalanceWalletRounded from "@mui/icons-material/AccountBalanceWalletRounded";
import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import PieChartRounded from "@mui/icons-material/PieChartRounded";
import SavingsRounded from "@mui/icons-material/SavingsRounded";
import FactCheckRounded from "@mui/icons-material/FactCheckRounded";
import SwapHorizRounded from "@mui/icons-material/SwapHorizRounded";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import AutorenewRounded from "@mui/icons-material/AutorenewRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import FingerprintRounded from "@mui/icons-material/FingerprintRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import { Stagger, fadeUp, CountUp, GrowWidth } from "../motion.jsx";
import {
  Amount,
  Btn,
  Caption,
  Meter,
  Panel,
  StatCard,
  StatusChip,
  Tile,
  TwoLine,
  meterColor,
  percent,
  softPrimary,
} from "../components/SharedUI.jsx";
import {
  SPENDING_SERIES,
  STEP_UP_LIMIT,
  TX_TYPE_BREAKDOWN,
  TX_VOLUME_SERIES,
  money,
} from "../mockData.js";
import { getScope } from "../helpers.js";

// Fixed personal allowance figures shown to the employee role
const EMPLOYEE = { spent: 112000, cap: 150000, remaining: 38000 };

const kFormat = (v) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${v / 1000}k`;
const twoColumns = (left, right) => ({ xs: "1fr", lg: `${left}fr ${right}fr` });
const shade = (b, fallback) => `rgba(255,255,255,${b.shade || fallback})`;

/** Shared recharts styling derived from the MUI theme. */
function useChartStyle() {
  const { palette } = useTheme();
  const tick = (extra) => ({
    fill: palette.text.secondary,
    fontSize: 12,
    ...extra,
  });
  return {
    palette,
    tick,
    axis: { tickLine: false, axisLine: false, tick: tick() },
    grid: (dash, opacity = 0.4, extra) => ({
      stroke: alpha(palette.secondary.main, opacity),
      strokeDasharray: dash,
      ...extra,
    }),
    tooltip: {
      contentStyle: {
        background: palette.background.paper,
        border: `1px solid ${palette.secondary.main}`,
        borderRadius: 12,
      },
    },
  };
}

/* ───────── Sections ───────── */
function Header({
  scope,
  wallets,
  pendingCount,
  onExportReport,
  onOpenNewTransfer,
}) {
  const { user, isOrg, isEmployee } = scope;
  const subtitle = isOrg
    ? `Enterprise Treasury Overview · ${pendingCount} approvals awaiting sign-off`
    : isEmployee
      ? `${user.department} Member Workspace · ${wallets.length} accessible wallets`
      : `${user.department} Department · ${pendingCount} ${pendingCount === 1 ? "request needs" : "requests need"} your review`;

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: 2,
        mb: 3,
      }}
    >
      <Box component={motion.div} variants={fadeUp}>
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}
        >
          Good morning, {user.name.split(" ")[0]}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.4, fontSize: 14.5 }}>
          {subtitle}
        </Typography>
      </Box>
      <Box
        component={motion.div}
        variants={fadeUp}
        sx={{ display: "flex", gap: 1.5 }}
      >
        {!isEmployee && (
          <Btn
            variant="outlined"
            startIcon={<DownloadRounded />}
            onClick={onExportReport}
          >
            Export Report
          </Btn>
        )}
        <Btn
          variant="contained"
          startIcon={<SendRounded />}
          onClick={onOpenNewTransfer}
        >
          {isEmployee ? "Submit Expense" : "New Transfer"}
        </Btn>
      </Box>
    </Box>
  );
}

function TreasuryHero({
  scope,
  wallets,
  budgets,
  totalBalance,
  totalBudget,
  totalSpent,
}) {
  const { user, isOrg, isEmployee } = scope;
  const title = isOrg
    ? "Organization Consolidated Liquidity"
    : isEmployee
      ? "Available Personal & Shared Allowance"
      : `${user.department} Department Liquidity`;
  const [used, limit] = isEmployee
    ? [EMPLOYEE.spent, EMPLOYEE.cap]
    : [totalSpent, totalBudget];

  return (
    <Box
      component={motion.div}
      variants={fadeUp}
      sx={{
        color: "#fff",
        borderRadius: "12px",
        p: 3,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: (t) =>
          `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${alpha(t.palette.primary.main, 0.85)} 100%)`,
        boxShadow: (t) => `0 16px 36px ${alpha(t.palette.primary.main, 0.28)}`,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box>
          <Typography sx={{ opacity: 0.85, fontSize: 13.5 }}>
            {title}
          </Typography>
          <Typography
            variant="h3"
            sx={{
              mt: 0.75,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <CountUp value={totalBalance} format={money} />
          </Typography>
          <Typography sx={{ opacity: 0.85, mt: 0.5, fontSize: 13 }}>
            Across {wallets.length} active EkPocket wallets
          </Typography>
        </Box>

        <Box sx={{ width: 120, height: 120, flexShrink: 0 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={budgets}
                dataKey="spent"
                nameKey="category"
                innerRadius={36}
                outerRadius={54}
                paddingAngle={3}
                stroke="none"
              >
                {budgets.map((b, i) => (
                  <Cell key={b.id} fill={shade(b, 1 - i * 0.18)} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      <Box sx={{ mt: 2.5 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 0.75,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {isEmployee
              ? "Personal Monthly Limit Used"
              : "November Budget Utilization"}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {money(used)} of {money(limit)}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            height: 10,
            borderRadius: 6,
            overflow: "hidden",
            bgcolor: "rgba(0,0,0,0.22)",
            gap: "2px",
          }}
        >
          {budgets.map((b, i) => (
            <GrowWidth
              key={b.id}
              width={`${totalBudget ? (b.spent / totalBudget) * 100 : 0}%`}
              delay={0.3 + i * 0.1}
              sx={{ bgcolor: shade(b, 0.85) }}
            />
          ))}
        </Box>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1.75,
            mt: 1.25,
          }}
        >
          {budgets.slice(0, 4).map((b) => (
            <Box
              key={b.id}
              sx={{ display: "flex", alignItems: "center", gap: 0.6 }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: shade(b, 0.85),
                }}
              />
              <Typography variant="caption" sx={{ opacity: 0.92 }}>
                {b.category.split(" ")[0]}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function KpiGrid({ scope, d, onNavigate }) {
  const { isEmployee } = scope;
  const spent = isEmployee ? EMPLOYEE.spent : d.totalSpent;
  const budget = isEmployee ? EMPLOYEE.cap : d.totalBudget;
  const go = (tab, enabled = true) =>
    enabled ? () => onNavigate(tab) : undefined;

  const cards = [
    {
      label: "Total Wallet Balance",
      value: d.totalBalance,
      format: money,
      note: `${d.wallets.length} active wallets`,
      icon: <AccountBalanceWalletRounded fontSize="small" />,
      onClick: go("wallets"),
    },
    {
      label: isEmployee ? "My Month Spend" : "Dept Spending",
      value: spent,
      format: money,
      note: `${percent(spent, budget)}% of monthly budget`,
      icon: <TrendingUpRounded fontSize="small" />,
      onClick: go("transactions"),
    },
    {
      label: isEmployee ? "Monthly Cap" : "Monthly Budget",
      value: budget,
      format: money,
      note: "Nov 2026 cycle",
      icon: <PieChartRounded fontSize="small" />,
      onClick: go("budgets", !isEmployee),
    },
    {
      label: "Remaining Budget",
      value: isEmployee ? EMPLOYEE.remaining : d.remainingBudget,
      format: money,
      note: "Available before cap",
      icon: <SavingsRounded fontSize="small" />,
      tone: "success",
    },
    {
      label: "Pending Approvals",
      value: d.pending.length,
      note: isEmployee ? "Awaiting manager" : "Needs your sign-off",
      icon: <FactCheckRounded fontSize="small" />,
      tone: "warning",
      onClick: go("approvals"),
    },
    {
      label: "Total Transactions",
      value: d.transactions.length * 23,
      note: "This billing month",
      icon: <SwapHorizRounded fontSize="small" />,
      onClick: go("transactions"),
    },
    {
      label: "Failed Transactions",
      value: d.failedCount,
      note: "Policy or rail decline",
      icon: <ErrorOutlineRounded fontSize="small" />,
      tone: "error",
      onClick: go("transactions"),
    },
    {
      label: "Upcoming Recurring",
      value: d.recurringTotal,
      format: money,
      note: "Due within 14 days",
      icon: <AutorenewRounded fontSize="small" />,
      onClick: go("recurring", !isEmployee),
    },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
      }}
    >
      {cards.map((c) => (
        <StatCard key={c.label} {...c} />
      ))}
    </Box>
  );
}

const TIMEFRAMES = ["Daily", "Weekly", "Monthly", "Yearly"];

function SpendingChart() {
  const [timeframe, setTimeframe] = useState("Weekly");
  const { palette, axis, grid, tick, tooltip } = useChartStyle();
  const series = SPENDING_SERIES[timeframe];
  const pace = series[0]?.budgetPace || 80000;

  return (
    <Panel
      title="Spending Overview vs. Allocated Pace"
      subtitle="Track actual expenditure against budgeted burn rate"
      action={
        <ToggleButtonGroup
          size="small"
          exclusive
          value={timeframe}
          onChange={(_, v) => v && setTimeframe(v)}
          sx={{
            paddingInline: "1em",
            "& .MuiToggleButton-root": {
              borderRadius: "8px",
              px: 1.5,
              py: 0.4,
              fontSize: 12,
              textTransform: "none",
            },
          }}
        >
          {TIMEFRAMES.map((tf) => (
            <ToggleButton key={tf} value={tf}>
              {tf}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      }
    >
      <Box sx={{ height: 265 }}>
        <ResponsiveContainer>
          <AreaChart
            data={series}
            margin={{ top: 10, right: 12, left: -8, bottom: 0 }}
          >
            <defs>
              <linearGradient id="ekpSpendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={palette.primary.main}
                  stopOpacity={0.32}
                />
                <stop
                  offset="100%"
                  stopColor={palette.primary.main}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} {...grid("4 6", 0.45)} />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} tickFormatter={kFormat} />
            <Tooltip
              {...tooltip}
              formatter={(v, name) => [
                money(v),
                name === "actual" ? "Actual Spend" : "Allocated Pace",
              ]}
            />
            <ReferenceLine
              y={pace}
              stroke={palette.text.secondary}
              strokeDasharray="5 5"
              label={{
                value: `Target ${money(pace)}`,
                position: "insideTopRight",
                ...tick({ fontSize: 11.5 }),
              }}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke={palette.primary.main}
              strokeWidth={2.75}
              fill="url(#ekpSpendGrad)"
              dot={{ r: 3.5, fill: palette.background.paper, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Panel>
  );
}

function BudgetBars({ budgets, isEmployee, onNavigate }) {
  return (
    <Panel
      title="Budget Utilization by Category"
      subtitle="Utilized vs. remaining category allocations"
      action={
        !isEmployee && (
          <Btn size="small" onClick={() => onNavigate("budgets")}>
            Manage Budgets
          </Btn>
        )
      }
    >
      <Box sx={{ display: "grid", gap: 2.25 }}>
        {budgets.slice(0, 4).map((b, i) => {
          const pct = percent(b.spent, b.allocated);
          return (
            <Box key={b.id}>
              <Meter
                value={pct}
                delay={0.25 + i * 0.08}
                color={meterColor(pct, b.warningThreshold, 100)}
                left={
                  <Typography variant="body2" fontWeight={600}>
                    {b.category}
                  </Typography>
                }
                right={
                  <Caption>
                    {money(b.spent)} / {money(b.allocated)} ({pct}%)
                  </Caption>
                }
              />
              <Caption block sx={{ mt: 0.35 }}>
                Remaining: {money(Math.max(b.allocated - b.spent, 0))} · Pending
                requests: {money(b.committed)}
              </Caption>
            </Box>
          );
        })}
      </Box>
    </Panel>
  );
}

function TransactionAnalytics() {
  const { palette, axis, grid, tooltip } = useChartStyle();
  return (
    <Panel
      title="Transaction Analytics & Payment Health"
      subtitle="Successful vs. failed volume and payment rail breakdown"
    >
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "7fr 5fr" },
        }}
      >
        <Box sx={{ height: 210 }}>
          <ResponsiveContainer>
            <BarChart
              data={TX_VOLUME_SERIES}
              margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
            >
              <CartesianGrid vertical={false} {...grid("3 5")} />
              <XAxis dataKey="period" {...axis} />
              <YAxis {...axis} />
              <Tooltip {...tooltip} />
              <Bar
                dataKey="successful"
                name="Successful Txns"
                fill={palette.primary.main}
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="failed"
                name="Failed Txns"
                fill={palette.error.main}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 1.5,
          }}
        >
          <Caption fontWeight={700}>BREAKDOWN BY TYPE</Caption>
          {TX_TYPE_BREAKDOWN.map((item) => (
            <Tile row key={item.type} p={1.25}>
              <TwoLine title={item.type} sub={`${item.count} txns`} />
              <Typography variant="body2" fontWeight={700}>
                {money(item.amount)}
              </Typography>
            </Tile>
          ))}
        </Box>
      </Box>
    </Panel>
  );
}

function DepartmentChart({ departments }) {
  const { palette, axis, grid, tick, tooltip } = useChartStyle();
  return (
    <Panel
      title="Departmental Financial Overview"
      subtitle="Cross-department wallet liquidity and monthly budget utilization"
    >
      <Box sx={{ height: 210 }}>
        <ResponsiveContainer>
          <BarChart
            data={departments}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 10, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} {...grid("3 5")} />
            <XAxis
              type="number"
              {...axis}
              tick={tick({ fontSize: 11.5 })}
              tickFormatter={(v) => `${v / 1000}k`}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={95}
              {...axis}
              tick={{
                fill: palette.text.primary,
                fontSize: 12,
                fontWeight: 500,
              }}
            />
            <Tooltip
              {...tooltip}
              formatter={(v, name) => [
                money(v),
                name === "spent" ? "Monthly Spend" : "Wallet Balance",
              ]}
            />
            <Bar
              dataKey="spent"
              name="spent"
              fill={palette.primary.main}
              radius={[0, 6, 6, 0]}
              barSize={12}
            />
            <Bar
              dataKey="walletBalance"
              name="walletBalance"
              fill={palette.secondary.main}
              radius={[0, 6, 6, 0]}
              barSize={12}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Panel>
  );
}

function ApprovalRow({ approval: a, isEmployee, onDecide }) {
  return (
    <Tile
      row
      radius={12}
      p={2}
      sx={{
        flexWrap: "wrap",
        gap: 2,
        ...(a.overBudget && {
          borderColor: (t) => alpha(t.palette.warning.main, 0.5),
        }),
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          minWidth: 240,
          flex: 1,
        }}
      >
        <Avatar
          sx={{ bgcolor: softPrimary, color: "primary.main", fontWeight: 700 }}
        >
          {a.who[0]}
        </Avatar>
        <Box>
          <TwoLine
            title={a.what}
            sub={`${a.who} · ${a.wallet} · ${a.level}`}
            weight={700}
          />
          <Box sx={{ display: "flex", gap: 0.75, mt: 0.75, flexWrap: "wrap" }}>
            {a.overBudget && (
              <Chip
                size="small"
                color="warning"
                icon={<WarningAmberRounded />}
                label="Exceeds category budget"
              />
            )}
            {a.amount > STEP_UP_LIMIT && (
              <Chip
                size="small"
                variant="outlined"
                icon={<FingerprintRounded />}
                label="WebAuthn Step-Up"
              />
            )}
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          {money(a.amount)}
        </Typography>
        {a.status !== "pending" || isEmployee ? (
          <StatusChip status={a.status === "pending" ? "Pending" : a.status} />
        ) : (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Btn
              size="small"
              variant="outlined"
              startIcon={<CloseRounded />}
              onClick={() => onDecide(a.id, "rejected")}
            >
              Reject
            </Btn>
            <Btn
              size="small"
              variant="contained"
              startIcon={<CheckRounded />}
              onClick={() => onDecide(a.id, "approved")}
            >
              Approve
            </Btn>
          </Box>
        )}
      </Box>
    </Tile>
  );
}

function ActivityFeed({ d, isEmployee, onDecideApproval, onNavigate }) {
  const [tab, setTab] = useState(0);

  return (
    <Panel
      title="Operations Feed & Actionable Alerts"
      subtitle="Real-time approvals, recent wallet activity, upcoming recurring payments, and threshold alerts"
      action={
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            minHeight: 36,
            "& .MuiTab-root": {
              minHeight: 36,
              textTransform: "none",
              fontSize: 13,
              fontWeight: 600,
            },
          }}
        >
          <Tab label={`Pending Approvals (${d.pending.length})`} />
          <Tab label="Recent Transactions" />
          <Tab label="Alerts & Recurring" />
        </Tabs>
      }
    >
      {tab === 0 && (
        <Box sx={{ display: "grid", gap: 1.5 }}>
          {d.approvals.slice(0, 3).map((a) => (
            <ApprovalRow
              key={a.id}
              approval={a}
              isEmployee={isEmployee}
              onDecide={onDecideApproval}
            />
          ))}
          <Box sx={{ textAlign: "right" }}>
            <Btn size="small" onClick={() => onNavigate("approvals")}>
              Open Full Approval Queue →
            </Btn>
          </Box>
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ display: "grid", gap: 1.25 }}>
          {d.transactions.slice(0, 5).map((tx) => (
            <Tile row key={tx.id} p={1.75} sx={{ flexWrap: "wrap" }}>
              <TwoLine
                title={tx.desc}
                sub={`${tx.id} · ${tx.wallet} · ${tx.date} at ${tx.time}`}
              />
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <StatusChip status={tx.status} />
                <Amount
                  value={tx.amount}
                  sx={{ minWidth: 92, textAlign: "right" }}
                />
              </Box>
            </Tile>
          ))}
        </Box>
      )}

      {tab === 2 && (
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          }}
        >
          <Box sx={{ display: "grid", gap: 1.25 }}>
            <Caption fontWeight={700}>BUDGET & FAILURE ALERTS</Caption>
            <Alert severity="error" sx={{ borderRadius: "10px" }}>
              <strong>Failed Payment (TX-4818):</strong> ৳9,600 to ColorMax
              Press Ltd blocked by Weekend Spend Restriction.
            </Alert>
            <Alert severity="warning" sx={{ borderRadius: "10px" }}>
              <strong>Budget Threshold (85%):</strong> Travel & Summits has
              consumed ৳128,000 of ৳150,000.
            </Alert>
          </Box>

          <Box sx={{ display: "grid", gap: 1.25 }}>
            <Caption fontWeight={700}>UPCOMING RECURRING PAYMENTS</Caption>
            {d.recurring.slice(0, 3).map((r) => (
              <Tile row key={r.id} p={1.5}>
                <TwoLine
                  title={r.title}
                  sub={`Due ${r.nextDate} (${r.dueInDays}d) · ${r.frequency}`}
                />
                <Typography variant="body2" fontWeight={700}>
                  {money(r.amount)}
                </Typography>
              </Tile>
            ))}
          </Box>
        </Box>
      )}
    </Panel>
  );
}

/* ───────── View ───────── */
export function OverviewView({
  roleKey,
  wallets,
  budgets,
  approvals,
  transactions,
  recurring,
  departments,
  onDecideApproval,
  onNavigate,
  onOpenNewTransfer,
  onExportReport,
}) {
  const scope = getScope(roleKey);
  const { isEmployee, byDept } = scope;

  // Everything below is scoped to the active role
  const scoped = {
    wallets: scope.wallets(wallets),
    budgets: byDept(budgets),
    approvals: scope.approvals(approvals),
    transactions: scope.transactions(transactions),
    recurring: byDept(recurring),
  };
  const sum = (items, key) => items.reduce((s, i) => s + i[key], 0);
  const totalBudget = sum(scoped.budgets, "allocated");
  const totalSpent = sum(scoped.budgets, "spent");

  const d = {
    ...scoped,
    pending: scoped.approvals.filter((a) => a.status === "pending"),
    totalBalance: sum(scoped.wallets, "balance"),
    totalBudget,
    totalSpent,
    remainingBudget: Math.max(totalBudget - totalSpent, 0),
    failedCount: scoped.transactions.filter((t) => t.status === "Failed")
      .length,
    recurringTotal: sum(scoped.recurring, "amount"),
  };

  return (
    <Stagger>
      <Header
        scope={scope}
        wallets={d.wallets}
        pendingCount={d.pending.length}
        onExportReport={onExportReport}
        onOpenNewTransfer={onOpenNewTransfer}
      />

      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          gridTemplateColumns: twoColumns(5, 7),
          mb: 2.5,
        }}
      >
        <TreasuryHero
          scope={scope}
          wallets={d.wallets}
          budgets={d.budgets}
          totalBalance={d.totalBalance}
          totalBudget={d.totalBudget}
          totalSpent={d.totalSpent}
        />
        <KpiGrid scope={scope} d={d} onNavigate={onNavigate} />
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          gridTemplateColumns: twoColumns(7, 5),
          mb: 2.5,
        }}
      >
        <SpendingChart />
        <BudgetBars
          budgets={d.budgets}
          isEmployee={isEmployee}
          onNavigate={onNavigate}
        />
      </Box>

      {!isEmployee && (
        <Box
          sx={{
            display: "grid",
            gap: 2.5,
            gridTemplateColumns: twoColumns(6, 6),
            mb: 2.5,
          }}
        >
          <TransactionAnalytics />
          <DepartmentChart departments={departments} />
        </Box>
      )}

      <ActivityFeed
        d={d}
        isEmployee={isEmployee}
        onDecideApproval={onDecideApproval}
        onNavigate={onNavigate}
      />
    </Stagger>
  );
}
