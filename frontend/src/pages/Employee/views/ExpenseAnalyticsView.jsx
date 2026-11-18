import { useState } from "react";
import { Box, Chip, Grid, TextField, Typography } from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import CategoryRounded from "@mui/icons-material/CategoryRounded";
import TrendingDownRounded from "@mui/icons-material/TrendingDownRounded";
import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import InsightsRounded from "@mui/icons-material/InsightsRounded";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Btn,
  Caption,
  DataTable,
  EmptyState,
  FormDialog,
  Panel,
  StatCard,
} from "../components/SharedUI.jsx";
import { PALETTE, money } from "../mockData.js";
import { useExpenseAnalytics } from "../../../api/transaction.api.js";
import { useCategories, useCreateCategory } from "../../../api/categories.api.js";

const defaultMonth = () => new Date().toISOString().slice(0, 7);

export function ExpenseAnalyticsView() {
  const [month, setMonth] = useState(defaultMonth);
  const [catOpen, setCatOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", type: "expense", color: PALETTE.purple });

  const { data: analytics, isLoading } = useExpenseAnalytics(month);
  const { data: categories = [] } = useCategories("expense");
  const createCategory = useCreateCategory();

  const rows = analytics?.categories || [];
  const trend = analytics?.monthlyTrend || [];
  const topCat = rows[0];

  const handleCreateCategory = async () => {
    if (!catForm.name.trim()) return;
    await createCategory.mutateAsync(catForm);
    setCatOpen(false);
    setCatForm({ name: "", type: "expense", color: PALETTE.purple });
  };

  const columns = [
    {
      label: "Category",
      render: (r) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: r.color }} />
          <Typography variant="body2" fontWeight={600}>{r.name}</Typography>
        </Box>
      ),
    },
    { label: "Txns", key: "count", align: "right" },
    { label: "This Month", align: "right", render: (r) => <strong>{money(r.amount)}</strong> },
    { label: "Last Month", align: "right", render: (r) => money(r.previousAmount) },
    {
      label: "MoM Change",
      align: "right",
      render: (r) => (
        <Chip
          size="small"
          label={`${r.momChangePct > 0 ? "+" : ""}${r.momChangePct}%`}
          color={r.momChangePct > 0 ? "warning" : "success"}
          variant="outlined"
          sx={{ fontWeight: 600, fontSize: 12, borderRadius: "8px" }}
        />
      ),
    },
    { label: "Share", align: "right", render: (r) => `${r.sharePct}%` },
  ];

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Spending Analysis</Typography>
          <Caption>Category breakdown and month-over-month comparisons</Caption>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
          <TextField
            size="small"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <Btn variant="contained" startIcon={<AddRounded />} onClick={() => setCatOpen(true)}>
            New Category
          </Btn>
        </Box>
      </Box>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Total Spent"
            value={analytics?.totalSpent || 0}
            format={money}
            note={`vs ${money(analytics?.previousTotalSpent || 0)} last month`}
            icon={<InsightsRounded fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="MoM Change"
            value={Math.abs(analytics?.momDeltaPct || 0)}
            format={(n) => `${(analytics?.momDeltaPct || 0) >= 0 ? "+" : "−"}${n}%`}
            note={`${money(Math.abs(analytics?.momDelta || 0))} difference`}
            tone={(analytics?.momDeltaPct || 0) > 0 ? "warning" : "success"}
            icon={(analytics?.momDeltaPct || 0) > 0 ? <TrendingUpRounded fontSize="small" /> : <TrendingDownRounded fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Top Category"
            value={topCat?.amount || 0}
            format={money}
            note={topCat ? `${topCat.name} (${topCat.sharePct}% of spend)` : "No expenses yet"}
            icon={<CategoryRounded fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Available Categories"
            value={categories.length}
            format={(n) => `${n}`}
            note="Default + custom categories"
            icon={<CategoryRounded fontSize="small" />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Panel title="Category Breakdown" subtitle={`Share of spending in ${month}`}>
            {rows.length === 0 && !isLoading ? (
              <EmptyState title="No expenses recorded" description="Record an expense to see category charts." />
            ) : (
              <Box sx={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={rows} dataKey="amount" nameKey="name" innerRadius={62} outerRadius={100} paddingAngle={3}>
                      {rows.map((entry) => (
                        <Cell key={entry.name} fill={entry.color || PALETTE.purple} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => money(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Panel title="6-Month Spending Trend" subtitle="Monthly expense comparison">
            <Box sx={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(v) => `৳${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Bar dataKey="totalSpent" name="Spent" fill={PALETTE.purple} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Panel>
        </Grid>
      </Grid>

      <Panel title="Category Comparison" subtitle="Current month vs previous month">
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <DataTable columns={columns} rows={rows} rowKey="name" />
        )}
      </Panel>

      <FormDialog
        open={catOpen}
        onClose={() => setCatOpen(false)}
        title="Add Custom Category"
        form={catForm}
        setForm={setCatForm}
        onSubmit={handleCreateCategory}
        submitLabel="Create Category"
        fields={[
          { key: "name", label: "Category Name", placeholder: "e.g. Subscriptions" },
          {
            key: "type",
            label: "Type",
            options: [
              { value: "expense", label: "Expense" },
              { value: "income", label: "Income" },
            ],
          },
          { key: "color", label: "Chart Color (Hex)", placeholder: "#7743DB" },
        ]}
      />
    </Box>
  );
}