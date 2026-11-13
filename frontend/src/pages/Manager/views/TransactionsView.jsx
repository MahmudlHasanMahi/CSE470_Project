import { useState } from "react";
import { Alert, Box, Chip, MenuItem, TablePagination, TextField, Typography } from "@mui/material";
import ReceiptLongRounded from "@mui/icons-material/ReceiptLongRounded";
import ReplayRounded from "@mui/icons-material/ReplayRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import { Stagger } from "../motion.jsx";
import {
  Amount, Btn, Caption, DataTable, DetailDrawer, EmptyState, FormDialog, Heading, KV, Panel,
  SearchField, StatusChip, Tile, TwoLine, matches, signed,
} from "../components/SharedUI.jsx";
import { getScope } from "../helpers.js";
import { money } from "../mockData.js";

const CATEGORIES = [
  "Travel & Summits", "Software & SaaS", "Events & Sponsorships",
  "Office & Creative Supplies", "Cloud Infrastructure", "Client Entertainment & Travel",
];
const BLANK_EXPENSE = { desc: "", merchant: "", category: CATEGORIES[0], amount: "12500", notes: "" };

function Filter({ label, value, onChange, options, width }) {
  return (
    <TextField select size="small" label={label} value={value} onChange={(e) => onChange(e.target.value)} sx={{ minWidth: width }}>
      {options.map((o) => (
        <MenuItem key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</MenuItem>
      ))}
    </TextField>
  );
}

export function TransactionsView({ roleKey, transactions, wallets, onRetryFailedTransaction, onSubmitExpense }) {
  const { isEmployee, transactions: scopeTransactions } = getScope(roleKey);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "All", type: "All", wallet: "All", range: "30d" });
  const [sort, setSort] = useState({ by: "id", order: "desc" });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const [selectedId, setSelectedId] = useState(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [form, setForm] = useState({ ...BLANK_EXPENSE, wallet: wallets[0]?.name || "Marketing Treasury Wallet" });

  const setFilter = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));
  const sortValue = (t) => (sort.by === "amount" ? Math.abs(t.amount) : t[sort.by]);
  const direction = sort.order === "asc" ? 1 : -1;

  const filtered = scopeTransactions(transactions)
    .filter(
      (t) =>
        matches(search, t.id, t.desc, t.merchant, t.actor) &&
        (filters.status === "All" || t.status === filters.status) &&
        (filters.type === "All" || t.type === filters.type) &&
        (filters.wallet === "All" || t.wallet === filters.wallet)
    )
    .sort((a, b) => (sortValue(a) < sortValue(b) ? -direction : sortValue(a) > sortValue(b) ? direction : 0));

  const pageRows = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const selected = transactions.find((t) => t.id === selectedId);

  const handleSort = (by) =>
    setSort((s) => ({ by, order: s.by === by && s.order === "asc" ? "desc" : "asc" }));

  const submit = () => {
    if (!form.desc.trim()) return;
    onSubmitExpense({ ...form, amount: Number(form.amount) || 0 });
    setForm({ ...form, desc: "", merchant: "" });
    setSubmitOpen(false);
  };

  const columns = [
    { label: "Reference", sortKey: "id", sx: { fontWeight: 600, color: "primary.main" }, key: "id" },
    { label: "Description & Merchant", render: (t) => <TwoLine title={t.desc} sub={t.merchant} /> },
    { label: "Type", render: (t) => <Chip size="small" label={t.type} variant="outlined" sx={{ borderRadius: "8px" }} /> },
    { label: "Wallet", key: "wallet" },
    { label: "Initiated By", key: "actor" },
    { label: "Date", key: "date" },
    { label: "Status", render: (t) => <StatusChip status={t.status} /> },
    { label: "Amount", sortKey: "amount", align: "right", render: (t) => <Amount value={t.amount} /> },
  ];

  return (
    <Stagger>
      <Panel
        title="Transaction Ledger & Payment Inspection"
        subtitle="Inspect execution attempts, investigate policy declines, and verify supporting receipts"
        action={
          <Btn variant="contained" startIcon={<AddRounded />} onClick={() => setSubmitOpen(true)}>
            {isEmployee ? "Submit Expense Request" : "Record / Submit Transaction"}
          </Btn>
        }
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 2.5, alignItems: "center" }}>
          <SearchField value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search reference, merchant, member..." />
          <Filter label="Status" width={130} value={filters.status} onChange={setFilter("status")} options={["All", "Posted", "Pending", "Failed"]} />
          <Filter label="Type" width={135} value={filters.type} onChange={setFilter("type")} options={["All", "Expense", "Recurring", "Transfer", "Top-Up"]} />
          <Filter
            label="Wallet"
            width={185}
            value={filters.wallet}
            onChange={setFilter("wallet")}
            options={[{ value: "All", label: "All Wallets" }, ...wallets.map((w) => w.name)]}
          />
          <Filter
            label="Date Range"
            width={140}
            value={filters.range}
            onChange={setFilter("range")}
            options={[{ value: "7d", label: "Last 7 days" }, { value: "30d", label: "Last 30 days" }, { value: "90d", label: "This quarter" }]}
          />
        </Box>

        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <DataTable columns={columns} rows={pageRows} minWidth={780} onRowClick={(t) => setSelectedId(t.id)} sort={sort} onSort={handleSort} />
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[6, 12, 25]}
            />
          </>
        )}
      </Panel>

      {/* Payment attempts drawer */}
      <DetailDrawer
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected ? `${selected.id} · ${selected.type}` : ""}
        subtitle={selected && `${selected.date} at ${selected.time} · ${selected.department}`}
        footer={
          selected?.status === "Failed" &&
          !isEmployee && (
            <Btn variant="contained" startIcon={<ReplayRounded />} onClick={() => onRetryFailedTransaction(selected.id)}>
              Override Rule & Retry Payment
            </Btn>
          )
        }
      >
        {selected && (
          <Box sx={{ display: "grid", gap: 2.5 }}>
            <Tile paper row radius={12} p={2.25}>
              <Box>
                <Caption>Transaction Amount</Caption>
                <Typography variant="h4" fontWeight={700}>{signed(selected.amount)}</Typography>
              </Box>
              <StatusChip status={selected.status} size="medium" />
            </Tile>

            {selected.status === "Failed" && selected.failureReason && (
              <Alert severity="error" sx={{ borderRadius: "10px" }}>
                <strong>Failure Investigation:</strong> {selected.failureReason}
              </Alert>
            )}

            <Tile paper radius={12} p={2} sx={{ display: "grid", gap: 1.25 }}>
              <Heading sx={{ mb: 0 }}>Execution Metadata</Heading>
              <KV label="Merchant / Payee">{selected.merchant}</KV>
              <KV label="Source Wallet">{selected.wallet}</KV>
              <KV label="Initiated By">{selected.actor}</KV>
              <KV label="Supporting Receipt">
                <Chip size="small" icon={<ReceiptLongRounded />} label={selected.receipt || "Attached"} variant="outlined" />
              </KV>
            </Tile>

            <Box>
              <Heading sx={{ mb: 1 }}>Payment Attempts Log ({selected.attempts?.length || 1})</Heading>
              <Box sx={{ display: "grid", gap: 1 }}>
                {(selected.attempts || []).map((a) => (
                  <Tile paper key={a.attempt} p={1.5}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" fontWeight={600}>Attempt #{a.attempt} · {a.gateway}</Typography>
                      <StatusChip status={a.status} />
                    </Box>
                    <Caption>{a.timestamp} · Code: {a.code}</Caption>
                  </Tile>
                ))}
              </Box>
            </Box>
          </Box>
        )}
      </DetailDrawer>

      <FormDialog
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title={isEmployee ? "Submit Expense for Approval" : "Initiate Wallet Transfer / Expense"}
        submitLabel="Submit Request"
        onSubmit={submit}
        form={form}
        setForm={setForm}
        fields={[
          { key: "desc", label: "Purpose / Description", placeholder: "e.g., Q4 Customer Workshop Catering" },
          { key: "merchant", label: "Merchant / Recipient", placeholder: "e.g., Gloria Jean's Coffees" },
          { key: "wallet", label: "Wallet", options: wallets.map((w) => ({ value: w.name, label: `${w.name} (${money(w.balance)})` })) },
          { key: "category", label: "Budget Category", options: CATEGORIES },
          { key: "amount", label: "Amount (BDT)", type: "number" },
        ]}
      />
    </Stagger>
  );
}
