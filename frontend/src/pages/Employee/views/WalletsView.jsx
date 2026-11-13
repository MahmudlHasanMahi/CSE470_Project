import { useState } from "react";
import {
  Avatar,
  Box,
  Chip,
  Divider,
  FormControlLabel,
  Switch,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import WalletCard from "../../../components/WalletCard.jsx";
import AccountBalanceWalletRounded from "@mui/icons-material/AccountBalanceWalletRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import LockOpenRounded from "@mui/icons-material/LockOpenRounded";
import { Stagger } from "../motion.jsx";
import {
  Amount,
  Btn,
  Caption,
  DetailDrawer,
  FormDialog,
  Heading,
  Meter,
  Panel,
  SearchField,
  StatusChip,
  Tile,
  TwoLine,
  lineColor,
  matches,
  meterColor,
  percent,
} from "../components/SharedUI.jsx";
import { getScope, makeId } from "../helpers.js";
import { money } from "../mockData.js";

const DEPARTMENTS = [
  "Marketing",
  "Engineering",
  "Operations",
  "Enterprise Sales",
  "People & HR",
];
const WALLET_TYPES = [
  "Departmental Master",
  "Shared Project",
  "Employee Sub-Wallet",
];
const BLANK_WALLET = {
  name: "",
  type: "Shared Project",
  department: "Marketing",
  monthlyLimit: "100000",
  perTxnLimit: "25000",
  initialBalance: "50000",
};

export function WalletsView({
  roleKey,
  wallets,
  transactions,
  onCreateWallet,
  onUpdateWallet,
  onTopUpWallet,
}) {
  const { user, isOrg, isEmployee, wallets: scopeWallets } = getScope(roleKey);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newWallet, setNewWallet] = useState(BLANK_WALLET);
  const [topUp, setTopUp] = useState(null); // { wallet, amount }
  console.log(wallets);
  const visible = scopeWallets(wallets).filter((w) =>
    matches(search, w.name, w.department, w.type),
  );
  const active = wallets.find((w) => w.id === selectedId);
  const activeTxns = active
    ? transactions.filter((t) => t.wallet === active.name)
    : [];
  const canEdit = !isEmployee;

  const toggleRule = (rule) =>
    canEdit &&
    onUpdateWallet(active.id, {
      rules: { ...active.rules, [rule]: !active.rules[rule] },
    });

  const toggleMember = (userId) =>
    canEdit &&
    onUpdateWallet(active.id, {
      members: active.members.map((m) =>
        m.userId === userId ? { ...m, canSpend: !m.canSpend } : m,
      ),
    });

  const createWallet = () => {
    if (!newWallet.name.trim()) return;
    const perTxnLimit = Number(newWallet.perTxnLimit) || 25000;
    const monthlyLimit = Number(newWallet.monthlyLimit) || 100000;
    onCreateWallet({
      id: makeId("WLT", 400, 500),
      name: newWallet.name.trim(),
      type: newWallet.type,
      department: isOrg ? newWallet.department : user.department,
      balance: Number(newWallet.initialBalance) || 0,
      monthlyLimit,
      spentThisMonth: 0,
      perTxnLimit,
      status: "Active",
      rules: {
        requireReceiptAbove: 3000,
        biometricStepUpAbove: 50000,
        blockWeekendSpend: false,
        autoFreezeOnOverBudget: true,
      },
      members: [
        {
          userId: user.id,
          name: user.name,
          role: "Custodian",
          perTxnLimit,
          monthlyCap: monthlyLimit,
          used: 0,
          canSpend: true,
        },
      ],
    });
    setNewWallet(BLANK_WALLET);
    setCreateOpen(false);
  };

  return (
    <Stagger>
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
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search wallets by name, type, or department..."
        />
        {canEdit && (
          <Btn
            variant="contained"
            startIcon={<AddRounded />}
            onClick={() => setCreateOpen(true)}
          >
            Create Wallet
          </Btn>
        )}
      </Box>

      {/* Wallet cards */}
      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, 1fr)",
            xl: "repeat(3, 1fr)",
          },
        }}
      >
        {visible.map((w, idx) => {
          const pct = percent(w.spentThisMonth, w.monthlyLimit);
          return <WalletCard key={idx} setSelectedId={setSelectedId} w={w} />;
        })}
      </Box>

      {/* Rules, members & history */}
      <DetailDrawer
        open={Boolean(active)}
        onClose={() => setSelectedId(null)}
        title={active?.name || ""}
        subtitle={
          active && `${active.id} · ${active.type} · ${active.department}`
        }
        width={520}
        footer={
          canEdit &&
          active && (
            <Btn
              variant="outlined"
              color={active.status === "Active" ? "error" : "success"}
              startIcon={
                active.status === "Active" ? (
                  <LockRounded />
                ) : (
                  <LockOpenRounded />
                )
              }
              onClick={() =>
                onUpdateWallet(active.id, {
                  status: active.status === "Active" ? "Frozen" : "Active",
                })
              }
            >
              {active.status === "Active" ? "Freeze Wallet" : "Unfreeze Wallet"}
            </Btn>
          )
        }
      >
        {active && (
          <Box sx={{ display: "grid", gap: 3 }}>
            <Tile
              paper
              radius={12}
              p={2}
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              {[
                ["Current Balance", active.balance],
                ["Per-Txn Ceiling", active.perTxnLimit],
              ].map(([label, value]) => (
                <Box key={label}>
                  <Caption>{label}</Caption>
                  <Typography variant="h5" fontWeight={700}>
                    {money(value)}
                  </Typography>
                </Box>
              ))}
            </Tile>

            <Box>
              <Heading>Spending Rules & Controls</Heading>
              <Tile paper radius={12} p={2} sx={{ display: "grid", gap: 1.25 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2">
                    Receipt required above
                  </Typography>
                  <Chip
                    size="small"
                    label={money(active.rules.requireReceiptAbove)}
                  />
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2">
                    WebAuthn biometric step-up above
                  </Typography>
                  <Chip
                    size="small"
                    color="primary"
                    label={money(active.rules.biometricStepUpAbove)}
                  />
                </Box>
                <Divider />
                {[
                  ["blockWeekendSpend", "Block weekend card & wallet charges"],
                  [
                    "autoFreezeOnOverBudget",
                    "Auto-enforce hard stop when monthly limit is reached",
                  ],
                ].map(([rule, label]) => (
                  <FormControlLabel
                    key={rule}
                    label={label}
                    control={
                      <Switch
                        disabled={isEmployee}
                        checked={active.rules[rule]}
                        onChange={() => toggleRule(rule)}
                      />
                    }
                  />
                ))}
              </Tile>
            </Box>

            <Box>
              <Heading>
                Wallet Members & Spending Permissions ({active.members.length})
              </Heading>
              <Box sx={{ display: "grid", gap: 1.25 }}>
                {active.members.map((m) => (
                  <Tile paper row key={m.userId} p={1.5}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {m.name} ·{" "}
                        <Chip
                          size="small"
                          label={m.role}
                          sx={{ height: 20, fontSize: 11 }}
                        />
                      </Typography>
                      <Caption>
                        Used {money(m.used)} / {money(m.monthlyCap)} · Max/txn{" "}
                        {money(m.perTxnLimit)}
                      </Caption>
                    </Box>
                    <Switch
                      size="small"
                      disabled={isEmployee}
                      checked={m.canSpend}
                      onChange={() => toggleMember(m.userId)}
                    />
                  </Tile>
                ))}
              </Box>
            </Box>

            <Box>
              <Heading>Recent Wallet Activity</Heading>
              <Box sx={{ display: "grid", gap: 1 }}>
                {activeTxns.length === 0 ? (
                  <Caption>
                    No recent transactions posted on this wallet.
                  </Caption>
                ) : (
                  activeTxns.map((t) => (
                    <Tile paper row key={t.id} p={1.25}>
                      <TwoLine title={t.desc} sub={`${t.date} · ${t.status}`} />
                      <Amount value={t.amount} />
                    </Tile>
                  ))
                )}
              </Box>
            </Box>
          </Box>
        )}
      </DetailDrawer>

      <FormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Departmental Wallet"
        submitLabel="Create Wallet"
        onSubmit={createWallet}
        form={newWallet}
        setForm={setNewWallet}
        fields={[
          {
            key: "name",
            label: "Wallet Name",
            placeholder: "e.g., Q4 Roadshow Operations",
          },
          { key: "type", label: "Wallet Type", options: WALLET_TYPES },
          {
            key: "department",
            label: "Department",
            options: DEPARTMENTS,
            show: isOrg,
          },
          {
            key: "initialBalance",
            label: "Initial Treasury Allocation (BDT)",
            type: "number",
          },
          {
            key: "monthlyLimit",
            label: "Monthly Spending Limit (BDT)",
            type: "number",
          },
          {
            key: "perTxnLimit",
            label: "Per-Transaction Cap (BDT)",
            type: "number",
          },
        ]}
      />

      <FormDialog
        open={Boolean(topUp)}
        onClose={() => setTopUp(null)}
        title={`Top Up ${topUp?.wallet.name ?? ""}`}
        submitLabel="Confirm Allocation"
        form={{ amount: topUp?.amount ?? "" }}
        setForm={(update) => setTopUp((t) => ({ ...t, ...update(t) }))}
        onSubmit={() => {
          onTopUpWallet(topUp.wallet.id, Number(topUp.amount) || 0);
          setTopUp(null);
        }}
        intro={
          topUp && (
            <Typography variant="body2" color="text.secondary">
              Current balance: <strong>{money(topUp.wallet.balance)}</strong>.
              Funds transfer instantly from the central treasury ledger.
            </Typography>
          )
        }
        fields={[
          { key: "amount", label: "Top-Up Amount (BDT)", type: "number" },
        ]}
      />
    </Stagger>
  );
}
