import { useState, useEffect } from "react";
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
import FingerprintRounded from "@mui/icons-material/FingerprintRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import { Stagger, fadeUp, CountUp, GrowWidth } from "../motion.jsx";
import { useMe } from "../../../api/users.api.js";

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
import TreasuryHero from "../../../components/TreasuryHero.jsx";
import ProgressList from "../../../components/ProgressList.jsx";
// Fixed personal allowance figures shown to the employee role
const EMPLOYEE = { spent: 112000, cap: 150000, remaining: 38000 };

const kFormat = (v) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${v / 1000}k`;
const twoColumns = (left, right) => ({ xs: "1fr", lg: `${left}fr ${right}fr` });

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
  const { data: user, isLoading, error } = useMe();

  const subtitle = `${user?.department} Member Workspace · ${user?.walletCount} accessible wallets`;
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
          Good morning, {user?.name}
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
        <Btn
          variant="contained"
          startIcon={<SendRounded />}
          onClick={onOpenNewTransfer}
        >
          "Submit Expense"
        </Btn>
      </Box>
    </Box>
  );
}
function KpiGrid({ d, onNavigate }) {
  const spent = EMPLOYEE.spent;
  const budget = EMPLOYEE.cap;

  const cards = [
    {
      label: "Total Wallet Balance",
      value: d.totalBalance,
      format: money,
      note: `${d.wallets.length} active wallets`,
      icon: <AccountBalanceWalletRounded fontSize="small" />,
      onClick: () => onNavigate("wallets"),
    },
    {
      label: "My Month Spend",
      value: spent,
      format: money,
      note: `${percent(spent, budget)}% of monthly budget`,
      icon: <TrendingUpRounded fontSize="small" />,
      onClick: () => onNavigate("transactions"),
    },
    {
      label: "Monthly Cap",
      value: budget,
      format: money,
      note: "Nov 2026 cycle",
      icon: <PieChartRounded fontSize="small" />,
      onClick: undefined,
    },
    {
      label: "Remaining Budget",
      value: EMPLOYEE.remaining,
      format: money,
      note: "Available before cap",
      icon: <SavingsRounded fontSize="small" />,
      tone: "success",
    },
    {
      label: "Pending Approvals",
      value: d.pending.length,
      note: "Awaiting manager",
      icon: <FactCheckRounded fontSize="small" />,
      tone: "warning",
      onClick: () => onNavigate("approvals"),
    },
    {
      label: "Total Transactions",
      value: d.transactions.length * 23,
      note: "This billing month",
      icon: <SwapHorizRounded fontSize="small" />,
      onClick: () => onNavigate("transactions"),
    },
    {
      label: "Failed Transactions",
      value: d.failedCount,
      note: "Policy or rail decline",
      icon: <ErrorOutlineRounded fontSize="small" />,
      tone: "error",
      onClick: () => onNavigate("transactions"),
    },
    {
      label: "Upcoming Recurring",
      value: d.recurringTotal,
      format: money,
      note: "Due within 14 days",
      icon: <AutorenewRounded fontSize="small" />,
      onClick: undefined,
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

function ApprovalRow({ approval: a, onDecide }) {
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
        {a.status !== "pending" || (
          <StatusChip status={a.status === "pending" ? "Pending" : a.status} />
        )}
      </Box>
    </Tile>
  );
}

function ActivityFeed({ d, onDecideApproval, onNavigate }) {
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
            <ApprovalRow key={a.id} approval={a} onDecide={onDecideApproval} />
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
import React from "react";

const Dashboard = ({
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
}) => {
  const scope = getScope(roleKey);
  const { isEmployee, byDept } = scope;

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
          range={[EMPLOYEE.spent, EMPLOYEE.cap]}
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

        <ProgressList
          title="Budget Utilization by Category"
          subtitle="Utilized vs. remaining category allocations"
          items={budgets}
          getValue={(b) => percent(b.spent, b.allocated)}
          getLabel={(b) => b.category}
          getColor={(b, pct) => meterColor(pct, b.warningThreshold, 100)}
          getDetails={(b) =>
            `${money(b.spent)} / ${money(b.allocated)} · Remaining: ${money(
              Math.max(b.allocated - b.spent, 0),
            )} · Pending requests: ${money(b.committed)}`
          }
        />
      </Box>

      <ActivityFeed
        d={d}
        isEmployee={isEmployee}
        onDecideApproval={onDecideApproval}
        onNavigate={onNavigate}
      />
    </Stagger>
  );
};
export default Dashboard;
