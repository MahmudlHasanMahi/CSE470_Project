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
import {
  useCategories,
  useCreateCategory,
} from "../../../api/categories.api.js";

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
      {options.map((o) => {
        const optionValue = o.value ?? o;
        const optionLabel = o.label ?? o;

        return (
          <MenuItem key={optionValue} value={optionValue}>
            {optionLabel}
          </MenuItem>
        );
      })}
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

  const [sort, setSort] = useState({
    by: "id",
    order: "desc",
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(6);

  const [selectedId, setSelectedId] = useState(null);

  // Dialog and form states
  const [submitOpen, setSubmitOpen] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [form, setForm] = useState(BLANK_EXPENSE);

  // -------------------------------------------------------
  // WALLET OPTIONS
  // -------------------------------------------------------

  const walletOptions = walletsb.map((w) => ({
    value: `wallet:${w.id ?? w.name}`,
    label: `${w.name}${w.balance != null ? ` (${money(w.balance)})` : ""}`,
  }));

  const destinationOptions = [
    ...walletOptions,

    ...bankAccounts.map((a) => {
      const bankName = a.bankName || a.providerName || "";
      const accName = a.name || a.accountHolder || "";
      const accNum = a.number || a.accountNumber || "";

      return {
        value: `bank:${a.id}`,
        label: `${bankName ? `${bankName} - ` : ""}${accName}${
          accNum ? ` (${accNum})` : ""
        }`,
      };
    }),
  ];

  // -------------------------------------------------------
  // FILTER HELPERS
  // -------------------------------------------------------

  const setFilter = (key) => (value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));

    setPage(0);
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(0);
  };

  const handleSort = (by) => {
    setSort((prev) => ({
      by,
      order: prev.by === by && prev.order === "asc" ? "desc" : "asc",
    }));

    setPage(0);
  };

  // Get transaction date
  const getTransactionDate = (t) => {
    return t.occurredAt || t.date || t.createdAt || t.created_at || null;
  };

  // Get account information from different API shapes
  const getAccountInfo = (account) => {
    if (!account) return [];

    if (typeof account === "object") {
      return [account.id, account.name, account.walletId, account.accountId]
        .filter((v) => v != null)
        .map(String);
    }

    return [String(account)];
  };

  // Check whether a transaction involves the selected wallet
  const transactionHasWallet = (transaction, walletId) => {
    if (walletId === "All") return true;

    const wallet = walletsb.find((w) => String(w.id) === String(walletId));

    const possibleValues = [
      ...getAccountInfo(transaction.source),
      ...getAccountInfo(transaction.destination),
      ...getAccountInfo(transaction.sourceAccount),
      ...getAccountInfo(transaction.destinationAccount),
      transaction.sourceWalletId,
      transaction.destinationWalletId,
      transaction.walletId,
      transaction.wallet,
    ]
      .filter((v) => v != null)
      .map(String);

    return (
      possibleValues.includes(String(walletId)) ||
      possibleValues.includes(`wallet:${walletId}`) ||
      (wallet && possibleValues.includes(String(wallet.name)))
    );
  };

  // -------------------------------------------------------
  // FILTER AND SORT TRANSACTIONS
  // -------------------------------------------------------

  const filtered = useMemo(() => {
    const now = new Date();

    // Calculate date range
    let startDate = null;

    if (filters.range === "7d") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (filters.range === "30d") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
    } else if (filters.range === "90d") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 90);
    }

    const searchTerm = search.trim().toLowerCase();

    const result = transactions.filter((t) => {
      // Search
      const searchableFields = [
        t.id,
        t.reference,
        t.description,
        t.desc,
        t.merchant,
        t.actor,
        t.source?.name,
        t.destination?.name,
        t.sourceAccount?.name,
        t.destinationAccount?.name,
      ];

      const matchesSearch =
        !searchTerm ||
        searchableFields.some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(searchTerm),
        );

      // Status
      const matchesStatus =
        filters.status === "All" ||
        String(t.status ?? "").toLowerCase() === filters.status.toLowerCase();

      // Transaction type
      const matchesType =
        filters.type === "All" ||
        String(t.type ?? "").toLowerCase() === filters.type.toLowerCase();

      // Wallet
      const matchesWallet = transactionHasWallet(t, filters.wallet);

      // Date range
      let matchesDate = true;

      if (startDate) {
        const transactionDate = getTransactionDate(t);
        const parsedDate = transactionDate ? new Date(transactionDate) : null;

        matchesDate =
          parsedDate &&
          !Number.isNaN(parsedDate.getTime()) &&
          parsedDate >= startDate &&
          parsedDate <= now;
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesWallet &&
        matchesDate
      );
    });

    // Sorting
    const direction = sort.order === "asc" ? 1 : -1;

    const getSortValue = (t) => {
      if (sort.by === "amount") {
        return Math.abs(Number(t.amount) || 0);
      }

      if (sort.by === "date") {
        const date = getTransactionDate(t);
        return date ? new Date(date).getTime() : 0;
      }

      return t[sort.by] ?? "";
    };

    result.sort((a, b) => {
      const valueA = getSortValue(a);
      const valueB = getSortValue(b);

      if (typeof valueA === "number" && typeof valueB === "number") {
        return (valueA - valueB) * direction;
      }

      return (
        String(valueA).localeCompare(String(valueB), undefined, {
          numeric: true,
          sensitivity: "base",
        }) * direction
      );
    });

    return result;
  }, [transactions, search, filters, sort, walletsb]);

  // -------------------------------------------------------
  // PAGINATION
  // -------------------------------------------------------

  const pageCount = Math.ceil(filtered.length / rowsPerPage);

  // Keep page valid when filters reduce the result count
  useEffect(() => {
    if (pageCount > 0 && page >= pageCount) {
      setPage(pageCount - 1);
    } else if (pageCount === 0 && page !== 0) {
      setPage(0);
    }
  }, [page, pageCount]);

  const pageRows = useMemo(
    () => filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
    [filtered, page, rowsPerPage],
  );

  const selected = useMemo(
    () => transactions.find((t) => t.id === selectedId),
    [transactions, selectedId],
  );

  // -------------------------------------------------------
  // TABLE COLUMNS
  // -------------------------------------------------------

  const columns = [
    {
      label: "Reference",
      sortKey: "id",
      sx: {
        fontWeight: 600,
        color: "primary.main",
      },
      key: "id",
    },
    {
      label: "Description",
      render: (t) => <TwoLine title={t.description ?? t.desc ?? "—"} />,
    },
    {
      label: "Type",
      render: (t) => (
        <Chip
          size="small"
          label={t.type ?? "—"}
          variant="outlined"
          sx={{ borderRadius: "8px" }}
        />
      ),
    },
    {
      label: "Source",
      render: (t) => t.source?.name ?? t.sourceAccount?.name ?? "—",
    },
    {
      label: "Destination",
      render: (t) => t.destination?.name ?? t.destinationAccount?.name ?? "—",
    },
    {
      label: "Initiated By",
      key: "actor",
    },
    {
      label: "Date",
      sortKey: "date",
      render: (t) => {
        const date = getTransactionDate(t);
        return date ? formatDate(date) : "—";
      },
    },
    {
      label: "Status",
      render: (t) => <StatusChip status={t.status} />,
    },
    {
      label: "Amount",
      sortKey: "amount",
      align: "right",
      render: (t) => <Amount value={t.amount} />,
    },
  ];

  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------

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
        {/* FILTER BAR */}
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
            onChange={handleSearchChange}
            placeholder="Search reference, description, merchant..."
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
              {
                value: "All",
                label: "All Wallets",
              },
              ...walletsb.map((w) => ({
                value: String(w.id),
                label: w.name,
              })),
            ]}
          />

          <Filter
            label="Date Range"
            width={145}
            value={filters.range}
            onChange={setFilter("range")}
            options={[
              {
                value: "7d",
                label: "Last 7 days",
              },
              {
                value: "30d",
                label: "Last 30 days",
              },
              {
                value: "90d",
                label: "Last 90 days",
              },
              {
                value: "all",
                label: "All Time",
              },
            ]}
          />

          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setSearch("");
              setFilters({
                status: "All",
                type: "All",
                wallet: "All",
                range: "30d",
              });
              setSort({
                by: "id",
                order: "desc",
              });
              setPage(0);
            }}
          >
            Clear Filters
          </Button>
        </Box>

        {/* ACTIVE RESULT COUNT */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Showing {filtered.length} of {transactions.length} transactions
        </Typography>

        {/* TABLE */}
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

      {/* TRANSACTION DETAILS */}
      <TransactionDetailsDrawer
        selected={selected}
        onClose={() => setSelectedId(null)}
      />

      {/* CREATE TRANSACTION */}
      <InitiateTransactionDialog
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        form={form}
        setForm={setForm}
        walletOptions={walletOptions}
        destinationOptions={destinationOptions}
        onAddDestination={() => setCreateAccountOpen(true)}
      />

      {/* ADD DESTINATION ACCOUNT */}
      <AddDestinationAccountDialog
        open={createAccountOpen}
        onClose={() => setCreateAccountOpen(false)}
        onAccountAdded={(acc, typePrefix) => {
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
  const { data: categories = [], isLoading } = useCategories();

  // Reset form whenever the dialog opens
  useEffect(() => {
    if (open) {
      setForm({
        ...BLANK_EXPENSE,
        category: "",
      });
      create.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Automatically select the first category after loading
  useEffect(() => {
    if (!open || !categories.length) return;

    setForm((prev) => {
      const selectedCategoryExists = categories.some(
        (c) => String(c.id) === String(prev.category),
      );

      if (selectedCategoryExists) return prev;

      return {
        ...prev,
        category: String(categories[0].id),
      };
    });
  }, [open, categories, setForm]);

  const submit = () => {
    create.mutate(
      {
        amount: Number(form.amount),
        category: form.category,
        merchant: form.merchant,
        notes: form.notes,
        sourceAccount: form.sourceAccount,
        destinationAccount: form.destinationAccount,
        description: form.desc,
      },
      {
        onSuccess: () => onClose(),
      },
    );
  };

  const errorMessage = (() => {
    const m = create.error?.response?.data?.message;

    return Array.isArray(m)
      ? m[0]
      : (m ?? (create.error ? "Could not create transaction" : null));
  })();

  const isInvalid =
    !form.desc?.trim() ||
    !form.sourceAccount ||
    !form.destinationAccount ||
    form.sourceAccount === form.destinationAccount ||
    !(Number(form.amount) > 0) ||
    !form.category;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Initiate Transaction</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {/* Purpose / Description */}
          <TextField
            fullWidth
            label="Purpose / Description"
            value={form.desc}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                desc: e.target.value,
              }))
            }
          />

          {/* Source Wallet */}
          <TextField
            select
            fullWidth
            label="From Wallet"
            value={form.sourceAccount}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                sourceAccount: e.target.value,
                destinationAccount:
                  prev.destinationAccount === e.target.value
                    ? ""
                    : prev.destinationAccount,
              }))
            }
          >
            {walletOptions.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>

          {/* Destination Wallet / Account */}
          <Box>
            <TextField
              select
              fullWidth
              label="To Wallet / Account"
              value={form.destinationAccount}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  destinationAccount: e.target.value,
                }))
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

          {/* Merchant */}
          <TextField
            fullWidth
            label="Merchant / Recipient"
            value={form.merchant}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                merchant: e.target.value,
              }))
            }
          />

          {/* Budget Category */}
          <TextField
            select
            fullWidth
            label="Budget Category"
            value={String(form.category ?? "")}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                category: e.target.value,
              }))
            }
            disabled={isLoading || !categories.length}
          >
            {categories.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>

          {/* Amount */}
          <TextField
            fullWidth
            type="number"
            label="Amount (BDT)"
            value={form.amount}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                amount: e.target.value,
              }))
            }
            inputProps={{ min: 0 }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>

        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        <Button variant="contained" onClick={submit} disabled={isInvalid}>
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

  const isSearching = walletLoading || bankLoading;

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setType("WALLET");
      setQuery("");
      setSearchId(null);

      setNewAccount({
        providerName: "",
        accountHolder: "",
      });
    }
  }, [open]);

  // Search for wallet or bank account
  const handleSearch = () => {
    const value = query.trim();

    if (!value) return;

    setSearchId(value);
  };

  // Change destination type
  const handleTypeChange = (newType) => {
    setType(newType);
    setQuery("");
    setSearchId(null);

    setNewAccount({
      providerName: "",
      accountHolder: "",
    });
  };

  // Create a new external bank account
  const handleCreateBank = () => {
    if (
      !newAccount.providerName.trim() ||
      !newAccount.accountHolder.trim() ||
      !query.trim()
    ) {
      return;
    }

    createExternalAccount(
      {
        providerName: newAccount.providerName.trim(),
        accountHolder: newAccount.accountHolder.trim(),
        accountNumber: query.trim(),
        method: "bank",
        accountLast4: query.trim().slice(-4),
        label: `${newAccount.providerName.trim()} Account`,
      },
      {
        onSuccess: (acc) => {
          onAccountAdded(acc, "bank");
        },
      },
    );
  };

  const handleQueryChange = (value) => {
    setQuery(value);
    setSearchId(null);
  };

  const handleUseAccount = (account, accountType) => {
    onAccountAdded(account, accountType);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Add Destination {type === "WALLET" ? "Wallet" : "Account"}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {/* Destination Type */}
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

          {/* Description */}
          <Typography variant="body2" color="text.secondary">
            {type === "WALLET"
              ? "Enter a wallet ID to verify that it exists and is accessible."
              : "Enter a bank account number to check whether it already exists."}
          </Typography>

          {/* Search Input */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              fullWidth
              label={
                type === "WALLET" ? "Internal Wallet ID" : "Bank Account Number"
              }
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
            />

            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={!query.trim() || isSearching}
              sx={{ minWidth: 130 }}
            >
              {isSearching ? (
                <>
                  <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
                  Searching...
                </>
              ) : (
                "Search"
              )}
            </Button>
          </Stack>

          {/* WALLET RESULTS */}

          {/* Wallet Not Found / Error */}
          {type === "WALLET" && searchId === query.trim() && walletError && (
            <Alert severity="warning">
              <Typography fontWeight={600}>Wallet not found</Typography>
              No wallet was found with this ID, or you don't have permission to
              access it. Please check the wallet ID and try again.
            </Alert>
          )}

          {/* Wallet Found */}
          {type === "WALLET" && searchId === query.trim() && walletData && (
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
              <Stack direction="row" alignItems="center" spacing={1}>
                <CheckCircleRounded color="success" />

                <Typography fontWeight={700}>Wallet Found</Typography>
              </Stack>

              <KV label="Wallet Name">{walletData.name}</KV>

              <KV label="Wallet ID">{walletData.id}</KV>

              <KV label="Type">{walletData.type}</KV>

              <Button
                variant="contained"
                onClick={() => handleUseAccount(walletData, "wallet")}
              >
                Use This Wallet
              </Button>
            </Tile>
          )}

          {/* BANK ACCOUNT RESULTS */}

          {/* Bank Account Found */}
          {type === "BANK_ACCOUNT" && searchId === query.trim() && bankData && (
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
                onClick={() => handleUseAccount(bankData, "bank")}
              >
                Use This Account
              </Button>
            </Tile>
          )}

          {/* Bank Account Not Found - Show Creation Form */}
          {type === "BANK_ACCOUNT" &&
            searchId === query.trim() &&
            bankError?.response?.status === 404 && (
              <Box sx={{ display: "grid", gap: 2 }}>
                <Alert severity="info">
                  <Typography fontWeight={600}>
                    Bank Account Not Found
                  </Typography>
                  No existing account matches this account number. You can add
                  it using the details below.
                </Alert>

                <TextField
                  label="Bank Name"
                  value={newAccount.providerName}
                  onChange={(e) =>
                    setNewAccount((prev) => ({
                      ...prev,
                      providerName: e.target.value,
                    }))
                  }
                  fullWidth
                />

                <TextField
                  fullWidth
                  label="Account Holder Name"
                  value={newAccount.accountHolder}
                  onChange={(e) =>
                    setNewAccount((prev) => ({
                      ...prev,
                      accountHolder: e.target.value,
                    }))
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
                      />
                      Creating...
                    </>
                  ) : (
                    "Add Bank Account"
                  )}
                </Button>
              </Box>
            )}

          {/* Other Bank Lookup Errors */}
          {type === "BANK_ACCOUNT" &&
            searchId === query.trim() &&
            bankError &&
            bankError.response?.status !== 404 && (
              <Alert severity="error">
                <Typography fontWeight={600}>
                  Unable to verify bank account
                </Typography>
                Something went wrong while checking this account. Please try
                again later.
              </Alert>
            )}
        </Stack>
      </DialogContent>

      {/* Dialog Actions */}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
