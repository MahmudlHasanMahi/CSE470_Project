import { useState, useMemo, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TablePagination,
  TextField,
  Typography,
} from "@mui/material";
import ReceiptLongRounded from "@mui/icons-material/ReceiptLongRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import { Stagger } from "../motion.jsx";
import {
  Amount,
  Btn,
  Caption,
  DataTable,
  DetailDrawer,
  EmptyState,
  Heading,
  KV,
  Panel,
  SearchField,
  StatusChip,
  Tile,
  TwoLine,
  matches,
  signed,
} from "../components/SharedUI.jsx";
import { getScope } from "../helpers.js";
import { money } from "../mockData.js";
import {
  useGetMyTransactions,
  useGetMyWallets,
} from "../../../api/users.api.js";
import {
  useWallet,
  useExternalAccount,
  useCreateExternalAccount,
} from "../../../api/wallets.api.js";

import { useCreateTransaction } from "../../../api/transaction.api.js";
import { formatDate } from "../../../utils/format";

const CATEGORIES = [
  "Travel & Summits",
  "Software & SaaS",
  "Events & Sponsorships",
  "Office & Creative Supplies",
  "Cloud Infrastructure",
  "Client Entertainment & Travel",
];

const BLANK_EXPENSE = {
  type: "Expense",
  desc: "",
  merchant: "",
  sourceAccount: "",
  destinationAccount: "",
  category: CATEGORIES[0],
  amount: "12500",
  notes: "",
};

// =========================================================
// SHARED COMPONENTS
// =========================================================

function Filter({ label, value, onChange, options, width }) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ minWidth: width }}
    >
      {options.map((o) => (
        <MenuItem key={o.value ?? o} value={o.value ?? o}>
          {o.label ?? o}
        </MenuItem>
      ))}
    </TextField>
  );
}

// =========================================================
// MAIN VIEW COMPONENT
// =========================================================

export function TransactionsView({
  roleKey,
  wallets,
  onRetryFailedTransaction,
  onSubmitExpense,
}) {
  const { data: transactions = [] } = useGetMyTransactions();
  const { data: walletsb = [] } = useGetMyWallets();

  const [bankAccounts, setBankAccounts] = useState([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    status: "All",
    type: "All",
    wallet: "All",
    range: "30d",
  });
  const [sort, setSort] = useState({ by: "id", order: "desc" });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(6);

  const [selectedId, setSelectedId] = useState(null);

  // Dialog & Form states
  const [submitOpen, setSubmitOpen] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [form, setForm] = useState(BLANK_EXPENSE);

  // Dropdown options
  const walletOptions = walletsb.map((w) => ({
    value: `wallet:${w.id ?? w.name}`,
    label: `${w.name}${w.balance != null ? ` (${money(w.balance)})` : ""}`,
  }));

  const destinationOptions = [
    ...walletOptions,
    ...bankAccounts.map((a) => {
      // Fix: Safely fallback between API keys and local keys to prevent "undefined"
      const bankName = a.bankName || a.providerName || "";
      const accName = a.name || a.accountHolder || "";
      const accNum = a.number || a.accountNumber || "";
      return {
        value: `bank:${a.id}`,
        label: `${bankName ? `${bankName} - ` : ""}${accName}${accNum ? ` (${accNum})` : ""}`,
      };
    }),
  ];

  // Filters & Sorting logic
  const setFilter = (key) => (value) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const handleSort = (by) =>
    setSort((s) => ({
      by,
      order: s.by === by && s.order === "asc" ? "desc" : "asc",
    }));

  const filtered = useMemo(() => {
    const direction = sort.order === "asc" ? 1 : -1;
    const sortValue = (t) =>
      sort.by === "amount" ? Math.abs(t.amount) : t[sort.by];

    return transactions
      .filter(
        (t) =>
          matches(search, t.id, t.desc, t.merchant, t.actor) &&
          (filters.status === "All" || t.status === filters.status) &&
          (filters.type === "All" || t.type === filters.type) &&
          (filters.wallet === "All" || t.wallet === filters.wallet),
      )
      .sort((a, b) =>
        sortValue(a) < sortValue(b)
          ? -direction
          : sortValue(a) > sortValue(b)
            ? direction
            : 0,
      );
  }, [transactions, search, filters, sort]);

  const pageRows = useMemo(
    () => filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
    [filtered, page, rowsPerPage],
  );
  const selected = useMemo(
    () => transactions.find((t) => t.id === selectedId),
    [transactions, selectedId],
  );

  const columns = [
    {
      label: "Reference",
      sortKey: "id",
      sx: { fontWeight: 600, color: "primary.main" },
      key: "id",
    },
    { label: "Description", render: (t) => <TwoLine title={t.description} /> },
    {
      label: "Type",
      render: (t) => (
        <Chip
          size="small"
          label={t.type}
          variant="outlined"
          sx={{ borderRadius: "8px" }}
        />
      ),
    },
    { label: "Source", render: (t) => t.source?.name ?? "—" },
    { label: "Destination", render: (t) => t.destination?.name ?? "—" },
    { label: "Initiated By", key: "actor" },
    { label: "Date", key: "date", render: (t) => formatDate(t.occurredAt) },
    { label: "Status", render: (t) => <StatusChip status={t.status} /> },
    {
      label: "Amount",
      sortKey: "amount",
      align: "right",
      render: (t) => <Amount value={t.amount} />,
    },
  ];

  return (
    <Stagger>
      <Panel
        title="Transaction Ledger & Payment Inspection"
        subtitle="Inspect execution attempts, investigate policy declines, and verify supporting receipts"
        action={
          <Btn
            variant="contained"
            startIcon={<AddRounded />}
            onClick={() => setSubmitOpen(true)}
          >
            Create Transaction
          </Btn>
        }
      >
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1.5,
            mb: 2.5,
            alignItems: "center",
          }}
        >
          <SearchField
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(0);
            }}
            placeholder="Search reference, merchant, member..."
          />
          <Filter
            label="Status"
            width={130}
            value={filters.status}
            onChange={setFilter("status")}
            options={["All", "Posted", "Pending", "Failed"]}
          />
          <Filter
            label="Type"
            width={135}
            value={filters.type}
            onChange={setFilter("type")}
            options={["All", "Expense", "Recurring", "Transfer", "Top-Up"]}
          />
          <Filter
            label="Wallet"
            width={185}
            value={filters.wallet}
            onChange={setFilter("wallet")}
            options={[
              { value: "All", label: "All Wallets" },
              ...wallets.map((w) => w.name),
            ]}
          />
          <Filter
            label="Date Range"
            width={140}
            value={filters.range}
            onChange={setFilter("range")}
            options={[
              { value: "7d", label: "Last 7 days" },
              { value: "30d", label: "Last 30 days" },
              { value: "90d", label: "This quarter" },
            ]}
          />
        </Box>

        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={pageRows}
              minWidth={780}
              onRowClick={(t) => setSelectedId(t.id)}
              sort={sort}
              onSort={handleSort}
            />
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

      <TransactionDetailsDrawer
        selected={selected}
        onClose={() => setSelectedId(null)}
      />

      <InitiateTransactionDialog
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        form={form}
        setForm={setForm}
        walletOptions={walletOptions}
        destinationOptions={destinationOptions}
        onAddDestination={() => setCreateAccountOpen(true)}
      />

      <AddDestinationAccountDialog
        open={createAccountOpen}
        onClose={() => setCreateAccountOpen(false)}
        onAccountAdded={(acc, typePrefix) => {
          // Add to lists and auto-select the account in the form
          setBankAccounts((prev) =>
            prev.some((a) => a.id === acc.id) ? prev : [...prev, acc],
          );
          setForm((prev) => ({
            ...prev,
            destinationAccount: `${typePrefix}:${acc.id}`,
          }));
          setCreateAccountOpen(false);
        }}
      />
    </Stagger>
  );
}

// =========================================================
// SUB-COMPONENTS
// =========================================================

function TransactionDetailsDrawer({ selected, onClose }) {
  if (!selected) return <DetailDrawer open={false} onClose={onClose} />;

  return (
    <DetailDrawer
      open={true}
      onClose={onClose}
      title={`${selected.id} · ${selected.type}`}
      subtitle={`${selected.date} at ${selected.time} · ${selected.department}`}
    >
      <Box sx={{ display: "grid", gap: 2.5 }}>
        <Tile paper row radius={12} p={2.25}>
          <Box>
            <Caption>Transaction Amount</Caption>
            <Typography variant="h4" fontWeight={700}>
              {signed(selected.amount)}
            </Typography>
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
          <KV label="From Account">
            {selected.source?.name ??
              selected.sourceAccount?.name ??
              selected.wallet ??
              "—"}
          </KV>
          <KV label="To Account">
            {selected.destination?.name ??
              selected.destinationAccount?.name ??
              selected.merchant ??
              "—"}
          </KV>
          <KV label="Initiated By">{selected.actor}</KV>
          <KV label="Supporting Receipt">
            <Chip
              size="small"
              icon={<ReceiptLongRounded />}
              label={selected.receipt || "Attached"}
              variant="outlined"
            />
          </KV>
        </Tile>

        <Box>
          <Heading sx={{ mb: 1 }}>
            Payment Attempts Log ({selected.attempts?.length || 1})
          </Heading>
          <Box sx={{ display: "grid", gap: 1 }}>
            {(selected.attempts || []).map((a) => (
              <Tile paper key={a.attempt} p={1.5}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" fontWeight={600}>
                    Attempt #{a.attempt} · {a.gateway}
                  </Typography>
                  <StatusChip status={a.status} />
                </Box>
                <Caption>
                  {a.timestamp} · Code: {a.code}
                </Caption>
              </Tile>
            ))}
          </Box>
        </Box>
      </Box>
    </DetailDrawer>
  );
}

function InitiateTransactionDialog({
  open,
  onClose,
  form,
  setForm,
  walletOptions,
  destinationOptions,
  onAddDestination,
}) {
  const create = useCreateTransaction();

  // Reset form only when dialog newly opens
  useEffect(() => {
    if (open) {
      setForm(BLANK_EXPENSE);
      create.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, setForm]);

  const submit = () => {
    create.mutate(
      {
        amount: form.amount,
        category: form.category,
        merchant: form.merchant,
        notes: form.notes,
        sourceAccount: form.sourceAccount,
        destinationAccount: form.destinationAccount,
      },
      { onSuccess: () => onClose() },
    );
  };

  const errorMessage = (() => {
    const m = create.error?.response?.data?.message;
    return Array.isArray(m)
      ? m[0]
      : (m ?? (create.error ? "Could not create transaction" : null));
  })();
  const isInvalid =
    !form.desc.trim() ||
    !form.sourceAccount ||
    !form.destinationAccount ||
    form.sourceAccount === form.destinationAccount ||
    !(Number(form.amount) > 0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Initiate Transaction</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            select
            fullWidth
            label="Transaction Type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {["Expense", "Transfer", "Top-Up"].map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Purpose / Description"
            value={form.desc}
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
          />

          <TextField
            select
            fullWidth
            label="From Wallet"
            value={form.sourceAccount}
            onChange={(e) =>
              setForm({
                ...form,
                sourceAccount: e.target.value,
                destinationAccount:
                  form.destinationAccount === e.target.value
                    ? ""
                    : form.destinationAccount,
              })
            }
          >
            {walletOptions.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>

          <Box>
            <TextField
              select
              fullWidth
              label="To Wallet / Account"
              value={form.destinationAccount}
              onChange={(e) =>
                setForm({ ...form, destinationAccount: e.target.value })
              }
            >
              {destinationOptions
                .filter((o) => o.value !== form.sourceAccount)
                .map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
            </TextField>
            <Button
              size="small"
              startIcon={<AddRounded />}
              sx={{ mt: 0.75 }}
              onClick={onAddDestination}
            >
              Add wallet or account
            </Button>
          </Box>

          {form.type === "Expense" && (
            <>
              <TextField
                fullWidth
                label="Merchant / Recipient"
                value={form.merchant}
                onChange={(e) => setForm({ ...form, merchant: e.target.value })}
              />
              <TextField
                select
                fullWidth
                label="Budget Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}

          <TextField
            fullWidth
            type="number"
            label="Amount (BDT)"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            inputProps={{ min: 0 }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        <Button
          variant="contained"
          onClick={submit}
          disabled={create.isPending}
        >
          {create.isPending ? "Saving..." : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function AddDestinationAccountDialog({ open, onClose, onAccountAdded }) {
  const [type, setType] = useState("WALLET");
  const [query, setQuery] = useState("");
  const [searchId, setSearchId] = useState(null);
  const [newAccount, setNewAccount] = useState({
    providerName: "",
    accountHolder: "",
  });

  const {
    data: walletData,
    isLoading: walletLoading,
    error: walletError,
  } = useWallet(type === "WALLET" ? searchId : null);
  const {
    data: bankData,
    isLoading: bankLoading,
    error: bankError,
  } = useExternalAccount(type === "BANK_ACCOUNT" ? searchId : null);
  const { mutate: createExternalAccount, isPending: isCreating } =
    useCreateExternalAccount();

  // Reset state when dialog is toggled
  useEffect(() => {
    if (open) {
      setType("WALLET");
      setQuery("");
      setSearchId(null);
      setNewAccount({ providerName: "", accountHolder: "" });
    }
  }, [open]);

  const handleSearch = () => query.trim() && setSearchId(query.trim());

  const handleTypeChange = (newType) => {
    setType(newType);
    setQuery("");
    setSearchId(null);
  };

  const handleCreateBank = () => {
    createExternalAccount(
      {
        providerName: newAccount.providerName.trim(),
        accountHolder: newAccount.accountHolder.trim(),
        accountNumber: query.trim(),
        method: "bank",
        accountLast4: "2345",
        label: `${newAccount.providerName.trim()} Account`,
      },
      {
        onSuccess: (acc) => onAccountAdded(acc, "bank"),
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Add Destination {type === "WALLET" ? "Wallet" : "Account"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Destination Type</InputLabel>
            <Select
              label="Destination Type"
              value={type}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              <MenuItem value="WALLET">Internal Wallet</MenuItem>
              <MenuItem value="BANK_ACCOUNT">External Bank Account</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="body2" color="text.secondary">
            {type === "WALLET"
              ? "Enter wallet ID to verify before adding."
              : "Enter account number to check if it exists."}
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              fullWidth
              label={
                type === "WALLET" ? "Internal Wallet ID" : "Bank Account Number"
              }
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchId(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={!query.trim() || walletLoading || bankLoading}
              sx={{ minWidth: 130 }}
            >
              {walletLoading || bankLoading ? "Searching..." : "Search"}
            </Button>
          </Stack>

          {/* WALLET RESULTS */}
          {type === "WALLET" && searchId === query && walletError && (
            <Alert severity="warning">Wallet not found or unauthorized.</Alert>
          )}
          {type === "WALLET" && searchId === query && walletData && (
            <Tile
              paper
              radius={12}
              p={2}
              sx={{
                display: "grid",
                gap: 1,
                border: 2,
                borderColor: "success.main",
              }}
            >
              <Typography fontWeight={700}>{walletData.name}</Typography>
              <KV label="Wallet ID">{walletData.id}</KV>
              <KV label="Type">{walletData.type}</KV>
              <Button
                variant="contained"
                onClick={() => onAccountAdded(walletData, "wallet")}
              >
                Use This Wallet
              </Button>
            </Tile>
          )}

          {/* BANK ACCOUNT RESULTS */}
          {type === "BANK_ACCOUNT" && searchId === query && bankData && (
            <Tile
              paper
              radius={12}
              p={2}
              sx={{
                display: "grid",
                gap: 1.5,
                border: 2,
                borderColor: "success.main",
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <CheckCircleRounded color="success" />
                <Typography fontWeight={700}>
                  Existing Bank Account Found
                </Typography>
              </Stack>
              <KV label="Account Holder">
                {bankData.name ?? bankData.accountHolder}
              </KV>
              <KV label="Account Number">
                {bankData.accountNumber ?? bankData.number}
              </KV>
              <Button
                variant="contained"
                onClick={() => onAccountAdded(bankData, "bank")}
              >
                Use This Account
              </Button>
            </Tile>
          )}

          {type === "BANK_ACCOUNT" &&
            searchId === query &&
            bankError?.response?.status === 404 && (
              <Box sx={{ display: "grid", gap: 2 }}>
                <TextField
                  label="Bank Name"
                  value={newAccount.providerName}
                  onChange={(e) =>
                    setNewAccount({
                      ...newAccount,
                      providerName: e.target.value,
                    })
                  }
                  fullWidth
                />
                <TextField
                  fullWidth
                  label="Account Holder Name"
                  value={newAccount.accountHolder}
                  onChange={(e) =>
                    setNewAccount({
                      ...newAccount,
                      accountHolder: e.target.value,
                    })
                  }
                />
                <TextField
                  fullWidth
                  label="Account Number"
                  value={query}
                  disabled
                />
                <Button
                  variant="contained"
                  onClick={handleCreateBank}
                  disabled={
                    isCreating ||
                    !newAccount.accountHolder.trim() ||
                    !newAccount.providerName.trim()
                  }
                >
                  {isCreating ? (
                    <>
                      <CircularProgress
                        size={18}
                        color="inherit"
                        sx={{ mr: 1 }}
                      />{" "}
                      Creating...
                    </>
                  ) : (
                    "Add Bank Account"
                  )}
                </Button>
              </Box>
            )}
        </Stack>
      </DialogContent>
      {type === "WALLET" && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
