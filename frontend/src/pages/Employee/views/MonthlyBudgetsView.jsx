import { useState } from "react";
import { Box, Grid, IconButton, TextField, Typography } from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import AccountBalanceWalletRounded from "@mui/icons-material/AccountBalanceWalletRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import SavingsRounded from "@mui/icons-material/SavingsRounded";
import {
  Btn,
  Caption,
  ConfirmDialog,
  EmptyState,
  FormDialog,
  Meter,
  Panel,
  StatCard,
  StatusChip,
  Tile,
  meterColor,
} from "../components/SharedUI.jsx";
import { money } from "../mockData.js";
import { useCategories } from "../../../api/categories.api.js";
import {
  useDeleteBudgetItem,
  useMonthlyBudget,
  useUpsertBudgetItem,
} from "../../../api/budgets.api.js";

const defaultMonth = () => new Date().toISOString().slice(0, 7);

const STATUS_LABEL = {
  on_track: "On Track",
  warning: "Warning",
  over_budget: "Over Budget",
};

export function MonthlyBudgetsView() {
  const [month, setMonth] = useState(defaultMonth);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    categoryId: "",
    limitAmount: "",
    warningThreshold: 80,
  });

  const { data: budget } = useMonthlyBudget(month);
  const { data: categories = [] } = useCategories("expense");
  const upsertBudget = useUpsertBudgetItem();
  const deleteBudget = useDeleteBudgetItem();

  const summary = budget?.summary || {
    totalBudget: 0,
    totalSpent: 0,
    totalRemaining: 0,
    alertCount: 0,
  };
  const items = budget?.items || [];
  const unbudgeted = budget?.unbudgeted || [];

  const openModal = (preset = {}) => {
    setForm({
      categoryId: preset.categoryId || categories[0]?.id || "",
      limitAmount: preset.limitAmount ? String(preset.limitAmount) : "",
      warningThreshold: preset.warningThreshold || 80,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.categoryId || Number(form.limitAmount) <= 0) return;
    await upsertBudget.mutateAsync({
      month,
      categoryId: form.categoryId,
      limitAmount: Number(form.limitAmount),
      warningThreshold: Number(form.warningThreshold) || 80,
    });
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteBudget.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Monthly Budgets</Typography>
          <Caption>Set category spending limits and monitor remaining balances</Caption>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
          <TextField
            size="small"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <Btn variant="contained" startIcon={<AddRounded />} onClick={() => openModal()}>
            Set Category Budget
          </Btn>
        </Box>
      </Box>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            label="Total Monthly Budget"
            value={summary.totalBudget}
            format={money}
            note={`Across ${items.length} categories`}
            icon={<AccountBalanceWalletRounded fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            label="Total Spent"
            value={summary.totalSpent}
            format={money}
            note={`${money(Math.max(summary.totalRemaining, 0))} remaining`}
            tone={summary.totalRemaining < 0 ? "error" : "primary"}
            icon={<SavingsRounded fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            label="Budget Alerts"
            value={summary.alertCount}
            format={(n) => `${n}`}
            note="Near-limit or over-budget categories"
            tone={summary.alertCount > 0 ? "warning" : "success"}
            icon={<WarningAmberRounded fontSize="small" />}
          />
        </Grid>
      </Grid>

      {items.length === 0 ? (
        <EmptyState
          title="No category budgets for this month"
          description="Click 'Set Category Budget' to create a spending limit (e.g., ৳5,000 for Food)."
        />
      ) : (
        <Grid container spacing={2.5}>
          {items.map((item) => (
            <Grid key={item.id} size={{ xs: 12, md: 6 }}>
              <Panel
                title={item.category.name}
                subtitle={`Alert at ${item.warningThreshold}% of ${money(item.limitAmount)}`}
                action={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <StatusChip status={STATUS_LABEL[item.status]} />
                    <IconButton size="small" onClick={() => openModal(item)}>
                      <EditRounded fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(item)}>
                      <DeleteOutlineRounded fontSize="small" />
                    </IconButton>
                  </Box>
                }
              >
                <Meter
                  value={Math.min(item.percentUsed, 100)}
                  color={meterColor(item.percentUsed, item.warningThreshold, 100)}
                  left={
                    <Typography variant="body2" fontWeight={600}>
                      Spent: {money(item.spentAmount)}
                    </Typography>
                  }
                  right={
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color={item.remainingAmount < 0 ? "error.main" : "text.secondary"}
                    >
                      {item.remainingAmount < 0
                        ? `Over by ${money(Math.abs(item.remainingAmount))}`
                        : `${money(item.remainingAmount)} left`}
                    </Typography>
                  }
                />
                <Caption block sx={{ mt: 1 }}>
                  {item.percentUsed}% of {money(item.limitAmount)} limit used
                </Caption>
              </Panel>
            </Grid>
          ))}
        </Grid>
      )}

      {unbudgeted.length > 0 && (
        <Panel title="Unbudgeted Spending" subtitle="Categories with expenses this month but no budget limit">
          <Box sx={{ display: "grid", gap: 1.25 }}>
            {unbudgeted.map((u) => (
              <Tile key={u.category.id} row>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{u.category.name}</Typography>
                  <Caption>Spent {money(u.spentAmount)} with no limit set</Caption>
                </Box>
                <Btn size="small" variant="outlined" onClick={() => openModal({ categoryId: u.category.id })}>
                  Set Limit
                </Btn>
              </Tile>
            ))}
          </Box>
        </Panel>
      )}

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Set Category Budget"
        form={form}
        setForm={setForm}
        onSubmit={handleSave}
        submitLabel="Save Budget"
        fields={[
          {
            key: "categoryId",
            label: "Category",
            options: categories.map((c) => ({ value: c.id, label: c.name })),
          },
          { key: "limitAmount", label: "Monthly Limit (৳)", type: "number", placeholder: "5000" },
          { key: "warningThreshold", label: "Alert Threshold (%)", type: "number", placeholder: "80" },
        ]}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove Budget Limit"
        description={`Remove the ${month} budget limit for ${deleteTarget?.category?.name}?`}
        confirmLabel="Remove"
        confirmColor="error"
      />
    </Box>
  );
}