import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Stagger } from "../motion.jsx";
import { Btn, Caption, ConfirmDialog, EmptyState, Panel, StatCard } from "../components/SharedUI.jsx";
import {
  useDeleteScenario,
  useSaveScenario,
  useSavedScenarios,
  useScenarioBaseline,
  useScenarioCalculation,
} from "../../../api/financial-scenarios.api.js";
import { formatDate } from "../../../utils/format.js";
import {
  apiErrorMessage,
  formatPercent,
  formatPoints,
  formatSigned,
  formatTaka,
  monthLabel,
} from "../../../utils/money.js";

const CHANGE_TYPES = [
  { value: "ADD_EXPENSE", label: "Add an expense" },
  { value: "REDUCE_EXPENSE", label: "Reduce an expense" },
  { value: "ADD_INCOME", label: "Add income" },
];
const TYPE_LABEL = Object.fromEntries(CHANGE_TYPES.map((t) => [t.value, t.label]));
const SEVERITY = { positive: "success", warning: "warning", error: "error", info: "info" };

// Same rule as the backend (12 digits, up to 2 decimals). The backend is the real judge.
const validAmount = (v) => /^\d{1,12}(\.\d{1,2})?$/.test(String(v).trim()) && Number(v) > 0;
let rowId = 0;
const blankRow = (changeType = "ADD_EXPENSE") => ({
  key: ++rowId,
  changeType,
  category: "",
  amount: "",
  description: "",
});

const grid = (min) => ({
  display: "grid",
  gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
  gap: 2,
});

function useDebounced(value, ms = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const Delta = ({ value, goodWhenPositive = true, format = formatSigned }) => {
  if (value === null || value === undefined || value === 0) return null;
  const good = (value > 0) === goodWhenPositive;
  return (
    <Typography
      component="span"
      variant="caption"
      sx={{ ml: 1, fontWeight: 700, color: good ? "success.main" : "error.main" }}
    >
      {format(value)}
    </Typography>
  );
};

export default function FinancialScenariosView() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState([blankRow()]);
  const [toast, setToast] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const baselineQuery = useScenarioBaseline();
  const savedQuery = useSavedScenarios();
  const save = useSaveScenario();
  const remove = useDeleteScenario();

  // Only rows with a valid amount are sent for calculation.
  const payload = useMemo(
    () =>
      rows
        .filter((r) => validAmount(r.amount))
        .map((r) => ({
          changeType: r.changeType,
          amount: String(r.amount).trim(),
          ...(r.category.trim() && { category: r.category.trim() }),
        })),
    [rows],
  );
  const debounced = useDebounced(payload);
  const calcQuery = useScenarioCalculation(debounced);

  const setRow = (key, patch) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  if (baselineQuery.isLoading) {
    return (
      <Box sx={{ py: 10, display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }
  if (baselineQuery.error) {
    return (
      <Alert
        severity="error"
        action={<Button onClick={() => baselineQuery.refetch()}>Retry</Button>}
        sx={{ borderRadius: "12px" }}
      >
        {apiErrorMessage(baselineQuery.error, "Could not load your financial position.")}
      </Alert>
    );
  }

  const base = baselineQuery.data;
  const hasChanges = payload.length > 0 && calcQuery.data;
  const result = hasChanges ? calcQuery.data : base;
  const noWallet = !base.wallets.personal;

  const chartData = [
    { name: "Income", Original: result.original.income, "With changes": result.scenario.income },
    { name: "Expenses", Original: result.original.expense, "With changes": result.scenario.expense },
    { name: "Savings", Original: result.original.savings, "With changes": result.scenario.savings },
  ];

  const canSave =
    name.trim() && payload.length > 0 && payload.length === rows.filter((r) => r.amount !== "").length;

  const handleSave = () => {
    save.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        items: payload.map((p, i) => ({
          ...p,
          description: rows.filter((r) => validAmount(r.amount))[i].description.trim() || undefined,
        })),
      },
      {
        onSuccess: () => setToast({ severity: "success", message: "Scenario saved. Your actual finances were not changed." }),
        onError: (e) => setToast({ severity: "error", message: apiErrorMessage(e, "Could not save the scenario.") }),
      },
    );
  };

  const loadScenario = (s) => {
    setName(s.name);
    setDescription(s.description || "");
    setRows(
      s.items.map((i) => ({
        key: ++rowId,
        changeType: i.changeType,
        category: i.category || "",
        amount: String(i.amount),
        description: i.description || "",
      })),
    );
  };

  const confirmDelete = () =>
    remove.mutate(toDelete.id, {
      onSuccess: () => {
        setToDelete(null);
        setToast({ severity: "success", message: "Scenario deleted." });
      },
      onError: (e) => {
        setToDelete(null);
        setToast({ severity: "error", message: apiErrorMessage(e, "Could not delete the scenario.") });
      },
    });

  const cmpRows = [
    { label: "Income", a: result.actual.income, o: result.original.income, s: result.scenario.income, d: result.difference.income, good: true },
    { label: "Expenses", a: result.actual.expense, o: result.original.expense, s: result.scenario.expense, d: result.difference.expense, good: false },
    { label: "Savings", a: result.actual.savings, o: result.original.savings, s: result.scenario.savings, d: result.difference.savings, good: true },
    { label: "Wallet balance", a: result.actual.walletBalance, o: result.original.projectedEndBalance, s: result.scenario.projectedEndBalance, d: result.difference.projectedEndBalance, good: true },
  ];

  return (
    <Stagger>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">Scenario Planning</Typography>
        <Caption block>
          A what-if simulator for {monthLabel(base.baseline.month)}. Nothing here changes your wallet
          balance or your recorded transactions.
        </Caption>
      </Box>

      {noWallet ? (
        <EmptyState
          title="No personal wallet found"
          description="The simulator needs a personal wallet to use as its starting point."
        />
      ) : (
        <Box sx={{ display: "grid", gap: 3 }}>
          {/* 1. Starting position */}
          <Panel
            title="Where you stand today"
            subtitle={`Day ${base.baseline.dayOfMonth} of ${base.baseline.daysInMonth}`}
          >
            <Box sx={grid(210)}>
              <StatCard label="Monthly income so far" value={base.actual.income} format={formatTaka} tone="success" note="Actual" />
              <StatCard label="Spent so far" value={base.actual.expense} format={formatTaka} tone="error" note="Actual" />
              <StatCard label="Wallet balance now" value={base.actual.walletBalance} format={formatTaka} note="Actual" />
              <StatCard label="Expected month-end spending" value={base.original.expense} format={formatTaka} tone="warning" note={`Estimate · ${base.baseline.confidence} confidence`} />
              <StatCard label="Predicted remaining balance" value={base.original.projectedEndBalance} format={formatTaka} note="Estimate · wallet at month end" />
              <StatCard label="Predicted savings" value={base.original.savings} format={formatTaka} tone="success" note={`Estimate · ${formatPercent(base.original.savingsRate)} of income`} />
            </Box>
            {!base.history.hasEnoughHistory && (
              <Alert severity="info" sx={{ mt: 2, borderRadius: "10px" }}>
                There is little spending history, so the projection uses only this month&apos;s pace.
              </Alert>
            )}
          </Panel>

          {/* 2. Builder */}
          <Panel title="What if…" subtitle="Add the changes you want to test">
            <Box sx={{ display: "grid", gap: 1.5 }}>
              {rows.map((r) => {
                const bad = r.amount !== "" && !validAmount(r.amount);
                return (
                  <Box key={r.key} sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "190px 1fr 150px 1fr auto" }, alignItems: "start" }}>
                    <TextField select size="small" label="Change" value={r.changeType} onChange={(e) => setRow(r.key, { changeType: e.target.value })}>
                      {CHANGE_TYPES.map((t) => (
                        <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                      ))}
                    </TextField>
                    <TextField size="small" label="Category (optional)" placeholder="e.g. Transportation" value={r.category} onChange={(e) => setRow(r.key, { category: e.target.value })} />
                    <TextField
                      size="small"
                      label="Amount (৳)"
                      value={r.amount}
                      error={bad}
                      helperText={bad ? "Up to 2 decimals" : " "}
                      onChange={(e) => setRow(r.key, { amount: e.target.value })}
                      slotProps={{ htmlInput: { inputMode: "decimal" } }}
                    />
                    <TextField size="small" label="Note (optional)" placeholder="e.g. New laptop" value={r.description} onChange={(e) => setRow(r.key, { description: e.target.value })} />
                    <IconButton
                      aria-label="Remove change"
                      disabled={rows.length === 1}
                      onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                    >
                      <DeleteOutlineRounded fontSize="small" />
                    </IconButton>
                  </Box>
                );
              })}
            </Box>
            <Btn sx={{ mt: 1 }} startIcon={<AddRounded />} onClick={() => setRows((rs) => [...rs, blankRow()])}>
              Add another change
            </Btn>
          </Panel>

          {/* 3. Comparison */}
          <Panel
            title="Impact"
            subtitle="Actual so far, the original projection, and the projection with your changes"
            action={calcQuery.isFetching && <CircularProgress size={18} />}
          >
            {calcQuery.error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: "10px" }}>
                {apiErrorMessage(calcQuery.error, "Could not calculate the impact.")}
              </Alert>
            )}

            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell align="right">Actual <Chip size="small" label="Actual" /></TableCell>
                    <TableCell align="right">Original projection <Chip size="small" variant="outlined" label="Estimate" /></TableCell>
                    <TableCell align="right">With your changes <Chip size="small" color="primary" variant="outlined" label="Estimate" /></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cmpRows.map((c) => (
                    <TableRow key={c.label}>
                      <TableCell sx={{ fontWeight: 600 }}>{c.label}</TableCell>
                      <TableCell align="right">{formatTaka(c.a)}</TableCell>
                      <TableCell align="right">{formatTaka(c.o)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatTaka(c.s)}
                        {hasChanges && <Delta value={c.d} goodWhenPositive={c.good} />}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Savings rate</TableCell>
                    <TableCell align="right">{formatPercent(result.actual.savingsRate)}</TableCell>
                    <TableCell align="right">{formatPercent(result.original.savingsRate)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {formatPercent(result.scenario.savingsRate)}
                      {hasChanges && <Delta value={result.difference.savingsRate} format={formatPoints} />}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
            <Caption block sx={{ mt: 1 }}>
              &ldquo;Wallet balance&rdquo; in the estimate columns is the expected balance at month end.
            </Caption>

            {hasChanges && (
              <Box sx={{ mt: 3, display: "grid", gap: 1 }}>
                {result.feedback.map((f) => (
                  <Alert key={f.id} severity={SEVERITY[f.severity] || "info"} variant="outlined" sx={{ borderRadius: "10px" }}>
                    {f.message}
                  </Alert>
                ))}
              </Box>
            )}

            <Box sx={{ mt: 3 }}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <ChartTooltip formatter={(v) => formatTaka(v)} />
                  <Legend />
                  <Bar dataKey="Original" fill="#C3ACD0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="With changes" fill="#7743DB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Panel>

          {/* 4. Save */}
          <Panel title="Save this scenario" subtitle="Saved separately from your real transactions">
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "1fr 2fr auto" }, alignItems: "start" }}>
              <TextField size="small" label="Scenario name" placeholder="December plan" value={name} onChange={(e) => setName(e.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} />
              <TextField size="small" label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }} />
              <Btn variant="contained" disabled={!canSave || save.isPending} onClick={handleSave}>
                {save.isPending ? "Saving…" : "Save scenario"}
              </Btn>
            </Box>
          </Panel>

          {/* 5. Saved scenarios */}
          <Panel title="Saved scenarios">
            {savedQuery.isLoading ? (
              <CircularProgress size={22} />
            ) : savedQuery.error ? (
              <Alert severity="error">{apiErrorMessage(savedQuery.error)}</Alert>
            ) : savedQuery.data.length === 0 ? (
              <EmptyState title="No saved scenarios" description="Build a what-if above and save it to come back later." />
            ) : (
              <Box sx={{ display: "grid", gap: 1.5 }}>
                {savedQuery.data.map((s) => (
                  <Box key={s.id} sx={{ p: 2, borderRadius: "10px", border: 1, borderColor: "divider", display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                    <Box>
                      <Typography fontWeight={700}>{s.name}</Typography>
                      <Caption block>Saved {formatDate(s.createdAt)}{s.description && ` · ${s.description}`}</Caption>
                      <Box sx={{ mt: 0.75, display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                        {s.items.map((i) => (
                          <Chip key={i.id} size="small" variant="outlined" label={`${TYPE_LABEL[i.changeType]}${i.category ? ` (${i.category})` : ""}: ${formatTaka(i.amount)}`} />
                        ))}
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Btn size="small" variant="outlined" onClick={() => loadScenario(s)}>Load &amp; recalculate</Btn>
                      <Btn size="small" color="error" onClick={() => setToDelete(s)}>Delete</Btn>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Panel>
        </Box>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete this scenario?"
        description={`"${toDelete?.name}" will be removed. Your real transactions are not affected.`}
        confirmLabel="Delete"
        confirmColor="error"
      />
      <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast(null)}>
        {toast ? <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>{toast.message}</Alert> : undefined}
      </Snackbar>
    </Stagger>
  );
}
