import { useState } from "react";
import { Alert, Box, Chip, Typography } from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import SavingsRounded from "@mui/icons-material/SavingsRounded";
import { Stagger } from "../motion.jsx";
import {
  Btn, Caption, DataTable, FormDialog, Meter, Panel, StatusChip, Tile, TwoLine, lineColor, meterColor, percent,
} from "../components/SharedUI.jsx";
import { getScope, makeId } from "../helpers.js";
import { money } from "../mockData.js";

const DEPARTMENTS = ["Marketing", "Engineering", "Operations", "Enterprise Sales", "People & HR"];

/* ───────── Budgets ───────── */
const BLANK_BUDGET = { department: "Marketing", category: "", allocated: "100000", warningThreshold: "80", hardStop: true };

export function BudgetsView({ roleKey, budgets, onSaveBudget }) {
  const { user, isOrg, byDept } = getScope(roleKey);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK_BUDGET);

  const scoped = byDept(budgets);
  const overBudget = scoped.filter((b) => b.spent > b.allocated);

  const openDialog = (budget = null) => {
    setEditing(budget);
    setForm(
      budget
        ? {
            department: budget.department,
            category: budget.category,
            allocated: String(budget.allocated),
            warningThreshold: String(budget.warningThreshold),
            hardStop: budget.hardStop,
          }
        : { ...BLANK_BUDGET, department: isOrg ? "Marketing" : user.department }
    );
    setOpen(true);
  };

  const save = () => {
    if (!form.category.trim()) return;
    onSaveBudget({
      id: editing?.id || makeId("BDG", 10, 89),
      department: form.department,
      category: form.category.trim(),
      allocated: Number(form.allocated) || 0,
      spent: editing?.spent || 0,
      committed: editing?.committed || 0,
      warningThreshold: Number(form.warningThreshold) || 80,
      hardStop: form.hardStop,
      shade: editing?.shade || 0.65,
    });
    setOpen(false);
  };

  return (
    <Stagger>
      {overBudget.length > 0 && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: "12px" }}>
          <strong>Over-Budget Alert:</strong>{" "}
          {overBudget.map((b) => `${b.department} (${b.category})`).join(", ")} exceeded the allocated monthly limit.
        </Alert>
      )}

      <Panel
        title="Departmental & Category Budgets"
        subtitle="Configure monthly caps, warning thresholds, and hard-stop enforcement policies"
        action={<Btn variant="contained" startIcon={<AddRounded />} onClick={() => openDialog()}>Create Budget</Btn>}
      >
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          {scoped.map((b, idx) => {
            const pct = percent(b.spent, b.allocated);
            const remaining = b.allocated - b.spent;
            return (
              <Tile key={b.id} radius={12} p={2.25} sx={pct > 100 && { borderColor: "error.main" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                  <TwoLine title={b.category} sub={`${b.department} · Alert at ${b.warningThreshold}%`} weight={700} />
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <Chip size="small" label={b.hardStop ? "Hard Stop" : "Soft Warning"} color={b.hardStop ? "primary" : "warning"} variant="outlined" />
                    <Btn size="small" startIcon={<EditRounded />} onClick={() => openDialog(b)}>Edit</Btn>
                  </Box>
                </Box>

                <Meter
                  sx={{ my: 2 }}
                  value={pct}
                  height={9}
                  delay={0.15 + idx * 0.06}
                  color={meterColor(pct, b.warningThreshold, 101)}
                  left={<Typography variant="body2" fontWeight={600}>{money(b.spent)} spent</Typography>}
                  right={<Typography variant="body2" color="text.secondary">of {money(b.allocated)} ({pct}%)</Typography>}
                />

                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Caption fontWeight={600} color={remaining < 0 ? "error.main" : "success.main"}>
                    {remaining < 0 ? `Over budget by ${money(-remaining)}` : `Remaining: ${money(remaining)}`}
                  </Caption>
                  <Caption>Pending approvals: {money(b.committed)}</Caption>
                </Box>
              </Tile>
            );
          })}
        </Box>
      </Panel>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Configure ${editing.category}` : "Create Category Budget"}
        submitLabel="Save Budget Policy"
        onSubmit={save}
        form={form}
        setForm={setForm}
        fields={[
          { key: "department", label: "Department", options: DEPARTMENTS, show: isOrg },
          { key: "category", label: "Spending Category", placeholder: "e.g., Paid Acquisition & Media" },
          { key: "allocated", label: "Monthly Allocation Limit (BDT)", type: "number" },
          { key: "warningThreshold", label: "Warning Notification Threshold (%)", type: "number" },
          { key: "hardStop", label: "Enforce hard stop when 100% of budget is consumed", type: "switch" },
        ]}
      />
    </Stagger>
  );
}

/* ───────── Recurring payments ───────── */
export function RecurringView({ roleKey, recurring, wallets, onCreateRecurring, onToggleRecurring }) {
  const { user, byDept } = getScope(roleKey);
  const blank = {
    title: "", vendor: "", wallet: wallets[0]?.name || "Marketing Treasury Wallet",
    amount: "15000", frequency: "Monthly", nextDate: "Dec 01, 2026", autoApprove: true,
  };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);

  const save = () => {
    if (!form.title.trim()) return;
    onCreateRecurring({
      id: makeId("REC", 10, 89),
      title: form.title.trim(),
      vendor: form.vendor.trim() || "Registered Vendor",
      department: user.department,
      wallet: form.wallet,
      amount: Number(form.amount) || 0,
      frequency: form.frequency,
      nextDate: form.nextDate,
      dueInDays: 18,
      status: "Active",
      autoApprove: form.autoApprove,
      history: [],
    });
    setOpen(false);
  };

  const columns = [
    { label: "Schedule Name", render: (r) => <TwoLine title={r.title} sub={`${r.vendor} · ${r.department}`} /> },
    { label: "Source Wallet", key: "wallet" },
    { label: "Frequency", render: (r) => <Chip size="small" label={r.frequency} variant="outlined" /> },
    {
      label: "Next Payment Date",
      render: (r) => (
        <>
          <Typography variant="body2" fontWeight={600}>{r.nextDate}</Typography>
          <Caption color="primary.main">Due in {r.dueInDays} days</Caption>
        </>
      ),
    },
    { label: "Auto-Authorize", render: (r) => (r.autoApprove ? "Enabled" : "Requires Sign-off") },
    { label: "Status", render: (r) => <StatusChip status={r.status} /> },
    { label: "Amount", align: "right", sx: { fontWeight: 700 }, render: (r) => money(r.amount) },
    {
      label: "Action",
      align: "right",
      render: (r) => <Btn size="small" onClick={() => onToggleRecurring(r.id)}>{r.status === "Active" ? "Pause" : "Resume"}</Btn>,
    },
  ];

  return (
    <Stagger>
      <Panel
        title="Scheduled Recurring Payments"
        subtitle="Manage automated vendor disbursements, cloud retainers, and recurring schedules"
        action={<Btn variant="contained" startIcon={<AddRounded />} onClick={() => setOpen(true)}>Schedule Recurring Payment</Btn>}
      >
        <DataTable columns={columns} rows={byDept(recurring)} />
      </Panel>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="New Recurring Payment Schedule"
        submitLabel="Save Schedule"
        onSubmit={save}
        form={form}
        setForm={setForm}
        fields={[
          { key: "title", label: "Payment Title", placeholder: "e.g., Content Delivery Network Retainer" },
          { key: "vendor", label: "Vendor / Payee" },
          { key: "wallet", label: "Source Wallet", options: wallets.map((w) => w.name) },
          { key: "frequency", label: "Frequency", options: ["Weekly", "Monthly", "Quarterly"] },
          { key: "amount", label: "Amount (BDT)", type: "number" },
          { key: "nextDate", label: "First Execution Date" },
        ]}
      />
    </Stagger>
  );
}

/* ───────── Savings goals ───────── */
export function SavingsView({ roleKey, savings, onAllocateSavings }) {
  const { byDept } = getScope(roleKey);
  const [target, setTarget] = useState(null); // { goal, amount }

  return (
    <Stagger>
      <Panel
        title="Treasury Reserves & Departmental Savings Goals"
        subtitle="Track ring-fenced financial targets, monthly contributions, and projected completion dates"
      >
        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" } }}>
          {byDept(savings).map((goal, idx) => {
            const pct = Math.min(percent(goal.allocated, goal.target), 100);
            return (
              <Tile key={goal.id} radius={12} p={2.5} sx={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 2 }}>
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                    <TwoLine title={goal.title} sub={`${goal.department} · Linked to ${goal.sourceWallet}`} weight={700} />
                    <StatusChip status={goal.status} />
                  </Box>
                  <Meter
                    sx={{ my: 2 }}
                    value={pct}
                    height={9}
                    delay={0.2 + idx * 0.08}
                    left={<Typography variant="h6" fontWeight={700}>{money(goal.allocated)}</Typography>}
                    right={<Typography variant="body2" color="text.secondary">Target: {money(goal.target)} ({pct}%)</Typography>}
                  />
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 1.5, borderTop: 1, borderColor: lineColor }}>
                  <Box>
                    <Caption block>Auto-allocation: <strong>{money(goal.monthlyContribution)}/mo</strong></Caption>
                    <Caption fontWeight={600} color="primary.main">Projected completion: {goal.projectedCompletion}</Caption>
                  </Box>
                  <Btn size="small" variant="contained" startIcon={<SavingsRounded />} onClick={() => setTarget({ goal, amount: "25000" })}>
                    Allocate Funds
                  </Btn>
                </Box>
              </Tile>
            );
          })}
        </Box>
      </Panel>

      <FormDialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title="Allocate Funds to Goal"
        submitLabel="Confirm Transfer"
        form={{ amount: target?.amount ?? "" }}
        setForm={(update) => setTarget((t) => ({ ...t, ...update(t) }))}
        onSubmit={() => {
          onAllocateSavings(target.goal.id, Number(target.amount) || 0);
          setTarget(null);
        }}
        intro={
          target && (
            <Typography variant="body2" color="text.secondary">
              Transferring into <strong>{target.goal.title}</strong> from {target.goal.sourceWallet}
            </Typography>
          )
        }
        fields={[{ key: "amount", label: "Allocation Amount (BDT)", type: "number" }]}
      />
    </Stagger>
  );
}
