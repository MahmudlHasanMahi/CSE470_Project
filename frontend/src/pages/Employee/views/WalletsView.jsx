import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Chip,
  Divider,
  FormControlLabel,
  Switch,
  Typography,
} from "@mui/material";
import WalletCard from "../../../components/WalletCard.jsx";
import AddRounded from "@mui/icons-material/AddRounded";
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
  SearchField,
  Tile,
  TwoLine,
  matches,
  percent,
} from "../components/SharedUI.jsx";
import { money } from "../mockData.js";
import { useGetMyWallets } from "../../../api/users.api.js";
 // adjust the ../ to your folder

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
  // wallets,
  roleKey,
  transactions,
  onCreateWallet,
  onUpdateWallet,
  onTopUpWallet,
}) {
  // const { wallets: scopeWallets } = getScope(roleKey);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [topUp, setTopUp] = useState(null); // { wallet, amount }
  const { data: wallets, isLoading, error } = useGetMyWallets();

  const visible =
    wallets?.filter((wallet) =>
      matches(search, wallet?.name, wallet.department, wallet.type),
    ) || [];
  const active = wallets?.find((w) => w.id === selectedId);

  // console.log(active);

  // const createWallet = () => {
  // if (!newWallet.name.trim()) return;
  // const perTxnLimit = Number(newWallet.perTxnLimit) || 25000;
  // const monthlyLimit = Number(newWallet.monthlyLimit) || 100000;
  // onCreateWallet({
  //   id: makeId("WLT", 400, 500),
  //   name: newWallet.name.trim(),
  //   type: newWallet.type,
  //   department: isOrg ? newWallet.department : user.department,
  //   balance: Number(newWallet.initialBalance) || 0,
  //   monthlyLimit,
  //   spentThisMonth: 0,
  //   perTxnLimit,
  //   status: "Active",
  //   rules: {
  //     requireReceiptAbove: 3000,
  //     biometricStepUpAbove: 50000,
  //     blockWeekendSpend: false,
  //     autoFreezeOnOverBudget: true,
  //   },
  //   members: [
  //     {
  //       userId: user.id,
  //       name: user.name,
  //       role: "Custodian",
  //       perTxnLimit,
  //       monthlyCap: monthlyLimit,
  //       used: 0,
  //       canSpend: true,
  //     },
  //   ],
  // });
  // setNewWallet(BLANK_WALLET);
  // setCreateOpen(false);
  // };

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
        <Btn
          variant="contained"
          startIcon={<AddRounded />}
          // onClick={() => setCreateOpen(true)}
        >
          Create Wallet
        </Btn>
      </Box>

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
                  <Chip size="small" label={"Not required"} />
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2">
                    WebAuthn biometric step-up above
                  </Typography>
                  <Chip size="small" color="primary" label={money(5000)} />
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
                        disabled={false}
                        // checked={active.rules[rule]}
                        // onChange={() => toggleRule(rule)}
                      />
                    }
                  />
                ))}
              </Tile>
            </Box>

            {/* list of transaction */}
            {/* <Box>
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
            </Box> */}
          </Box>
        )}
      </DetailDrawer>
      {/* 
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
      /> */}

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
