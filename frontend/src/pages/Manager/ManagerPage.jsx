import { useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { NavigationShell } from "./components/NavigationShell.jsx";
import { ConfirmDialog } from "./components/SharedUI.jsx";
import { OverviewView } from "./views/OverviewView.jsx";
import { WalletsView } from "./views/WalletsView.jsx";
import { TransactionsView } from "./views/TransactionsView.jsx";
import { ApprovalsView } from "./views/ApprovalsView.jsx";
import {
  BudgetsView,
  RecurringView,
  SavingsView,
} from "./views/BudgetsRecurringSavings.jsx";
import {
  AuditLogsView,
  DepartmentsView,
  MembersView,
  NotificationsView,
  ProfileSettingsView,
  RolesView,
} from "./views/OrgSecurityViews.jsx";
import {
  INITIAL_APPROVALS,
  INITIAL_AUDIT_LOGS,
  INITIAL_BIOMETRIC_DEVICES,
  INITIAL_BUDGETS,
  INITIAL_DEPARTMENTS,
  INITIAL_MEMBERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_RECURRING,
  INITIAL_SAVINGS,
  INITIAL_TRANSACTIONS,
  INITIAL_WALLETS,
  ROLES,
  money,
} from "./mockData.js";
import { NOW, getScope, makeId, useList } from "./helpers.js";

const toggle = (key, a, b) => (item) => ({ [key]: item[key] === a ? b : a });

/** A freshly posted transaction; callers only supply what differs. */
const postedTx = ({ gateway, ...tx }) => ({
  id: makeId("TX", 4822, 150),
  ...NOW,
  status: "Posted",
  attempts: [
    {
      attempt: 1,
      timestamp: NOW.time,
      gateway,
      status: "Succeeded",
      code: "200 OK",
    },
  ],
  ...tx,
});

export default function ManagerPage() {
  const [roleKey, setRoleKey] = useState("dept_admin");
  const [activeTab, setActiveTab] = useState("overview");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [wallets, walletList] = useList(INITIAL_WALLETS);
  const [budgets, budgetList] = useList(INITIAL_BUDGETS);
  const [approvals, approvalList] = useList(INITIAL_APPROVALS);
  const [transactions, txList] = useList(INITIAL_TRANSACTIONS);
  const [recurring, recurringList] = useList(INITIAL_RECURRING);
  const [savings, savingsList] = useList(INITIAL_SAVINGS);
  const [departments, departmentList] = useList(INITIAL_DEPARTMENTS);
  const [members, memberList] = useList(INITIAL_MEMBERS);
  const [auditLogs, auditList] = useList(INITIAL_AUDIT_LOGS);
  const [notifications, notificationList] = useList(INITIAL_NOTIFICATIONS);
  const [biometricDevices, deviceList] = useList(INITIAL_BIOMETRIC_DEVICES);

  const scope = getScope(roleKey);
  const { user } = scope;

  const notify = (message, severity = "success") =>
    setToast({ open: true, message, severity });
  const closeToast = () => setToast((t) => ({ ...t, open: false }));

  const audit = (action, entity, before, after) =>
    auditList.add({
      id: makeId("AUD", 7713, 200),
      timestamp: "Nov 13, 2026 · Just now",
      actor: user.name,
      actorRole: roleKey,
      department: user.department,
      action,
      entity,
      ip: "103.145.88.14 · EkPocket Web",
      before,
      after,
    });

  /* ───── Navigation ───── */
  const selectTab = (id) =>
    id === "logout" ? setLogoutOpen(true) : setActiveTab(id);

  const changeRole = (next) => {
    setRoleKey(next);
    if (!ROLES[next].permissions.includes(activeTab)) setActiveTab("overview");
    notify(
      `Switched workspace view to ${ROLES[next].label} (${ROLES[next].user.name})`,
      "info",
    );
  };

  /* ───── Approvals ───── */
  const decideApproval = (id, decision, note = "") => {
    const target = approvals.find((a) => a.id === id);
    if (!target) return;
    const approved = decision === "approved";

    approvalList.patch(id, (a) => ({
      status: decision,
      currentStep: a.steps.length,
      steps: a.steps.map((s) => ({
        ...s,
        status: "done",
        time:
          s.status === "done"
            ? s.time
            : `${approved ? "Approved" : "Rejected"} · ${NOW.time}`,
      })),
    }));

    if (approved) {
      walletList.patchAll(
        (w) => ({
          balance: Math.max(w.balance - target.amount, 0),
          spentThisMonth: w.spentThisMonth + target.amount,
        }),
        (w) => w.name === target.wallet,
      );
      txList.add(
        postedTx({
          desc: target.what,
          merchant: target.merchant,
          wallet: target.wallet,
          department: target.department,
          actor: target.who,
          type: "Expense",
          amount: -target.amount,
          receipt: target.receiptRef,
          gateway: "EkPocket Approved Disbursement",
        }),
      );
    }

    audit(
      approved ? "APPROVAL_GRANTED" : "APPROVAL_REJECTED",
      `${target.id} (${target.what})`,
      { status: "pending", amount: target.amount },
      { status: decision, reviewer: user.name, note: note || undefined },
    );
    notify(
      `${target.id} ${approved ? "approved & disbursed" : "rejected"}.`,
      approved ? "success" : "warning",
    );
  };

  /* ───── Wallets ───── */
  const createWallet = (wallet) => {
    walletList.add(wallet);
    audit("WALLET_CREATED", `${wallet.id} (${wallet.name})`, null, {
      balance: wallet.balance,
      monthlyLimit: wallet.monthlyLimit,
    });
    notify(`Created wallet "${wallet.name}" with ${money(wallet.balance)}.`);
  };

  const updateWallet = (id, patch) => {
    const old = wallets.find((w) => w.id === id);
    walletList.patch(id, patch);
    audit(
      "WALLET_UPDATED",
      `${id} (${old?.name})`,
      old?.rules,
      patch.rules || patch,
    );
    notify("Wallet configuration updated.");
  };

  const topUpWallet = (id, amount) => {
    const old = wallets.find((w) => w.id === id);
    if (!old || amount <= 0) return;
    walletList.patch(id, (w) => ({ balance: w.balance + amount }));
    txList.add(
      postedTx({
        desc: `Treasury allocation top-up — ${old.name}`,
        merchant: "Corporate Central Treasury",
        wallet: old.name,
        department: old.department,
        actor: user.name,
        type: "Top-Up",
        amount,
        receipt: "TR-ALLOC.pdf",
        gateway: "Internal Ledger Rail",
      }),
    );
    audit(
      "TREASURY_TOPUP",
      `${old.id} (${old.name})`,
      { balance: old.balance },
      { balance: old.balance + amount },
    );
    notify(`Allocated ${money(amount)} to ${old.name}.`);
  };

  /* ───── Transactions ───── */
  const retryFailed = (id) => {
    txList.patch(id, (t) => ({
      status: "Posted",
      failureReason: undefined,
      attempts: [
        ...(t.attempts || []),
        {
          attempt: (t.attempts?.length || 0) + 1,
          timestamp: NOW.time,
          gateway: "Manager Policy Override",
          status: "Succeeded",
          code: "200 OK",
        },
      ],
    }));
    audit(
      "TX_OVERRIDE_RETRIED",
      id,
      { status: "Failed" },
      { status: "Posted" },
    );
    notify(`Transaction ${id} overridden and settled.`);
  };

  const submitExpense = (form) => {
    const level2 = form.amount > 50000;
    const request = {
      id: makeId("APR", 905, 90),
      requesterId: user.id,
      who: user.name,
      role: user.title,
      department: user.department,
      wallet: form.wallet,
      category: form.category,
      what: form.desc,
      merchant: form.merchant || "Submitted Vendor",
      amount: form.amount,
      submittedAt: "Nov 13, Just now",
      slaDeadline: "24h remaining",
      level: level2
        ? "Level 2 (Controller + Dept Manager)"
        : "Level 1 (Dept Manager)",
      currentStep: 1,
      steps: [
        { label: `Submitted by ${user.name}`, status: "done", time: NOW.time },
        { label: "Dept Manager Review", status: "active", time: "Pending" },
      ],
      overBudget: false,
      budgetImpactText: `Allocates ${money(form.amount)} against ${form.category}.`,
      escalated: false,
      receiptAttached: true,
      receiptRef: "UPLOADED-RECEIPT.pdf",
      notes: form.notes || "Submitted via EkPocket Web Portal.",
      status: "pending",
    };
    approvalList.add(request);
    notify(`Request ${request.id} submitted to approval queue.`);
  };

  /* ───── Budgets, recurring, savings ───── */
  const saveBudget = (budget) => {
    budgetList.upsert(budget);
    audit(
      "BUDGET_CONFIGURED",
      `${budget.department} · ${budget.category}`,
      null,
      {
        allocated: budget.allocated,
        hardStop: budget.hardStop,
      },
    );
    notify(`Budget policy saved for ${budget.category}.`);
  };

  const createRecurring = (rec) => {
    recurringList.add(rec);
    notify(`Scheduled recurring payment "${rec.title}".`);
  };

  const toggleRecurring = (id) => {
    recurringList.patch(id, toggle("status", "Active", "Paused"));
    notify("Recurring schedule status updated.");
  };

  const allocateSavings = (id, amount) => {
    savingsList.patch(id, (g) => ({ allocated: g.allocated + amount }));
    notify(`Allocated ${money(amount)} to savings goal.`);
  };

  /* ───── Organization & security ───── */
  const createDepartment = (dept) => {
    departmentList.add(dept);
    notify(`Department "${dept.name}" created.`);
  };

  const inviteMember = (member) => {
    memberList.add(member);
    notify(`Invitation sent to ${member.name}.`);
  };

  const toggleMember = (id) => {
    memberList.patch(id, toggle("status", "Active", "Suspended"));
    notify("Member account status updated.");
  };

  const registerBiometric = (device) => {
    deviceList.add(device);
    audit("WEBAUTHN_DEVICE_REGISTERED", device.name, null, {
      type: device.authenticatorType,
    });
    notify(`Registered biometric device "${device.name}".`);
  };

  const revokeBiometric = (id) => {
    deviceList.remove(id);
    notify("Biometric device revoked.", "warning");
  };

  const markAllRead = () => notificationList.patchAll({ unread: false });
  const markRead = (id) => notificationList.patch(id, { unread: false });

  const badges = {
    approvals: scope.byDept(approvals.filter((a) => a.status === "pending"))
      .length,
    notifications: notifications.filter((n) => n.unread).length,
  };

  /* ───── Views ───── */
  const views = {
    overview: (
      <OverviewView
        {...{
          roleKey,
          wallets,
          budgets,
          approvals,
          transactions,
          recurring,
          departments,
        }}
        onDecideApproval={decideApproval}
        onNavigate={setActiveTab}
        onOpenNewTransfer={() => setActiveTab("transactions")}
        onExportReport={() =>
          notify("Exported November financial statement (CSV & PDF).")
        }
      />
    ),
    wallets: (
      <WalletsView
        {...{ roleKey, wallets, transactions }}
        onCreateWallet={createWallet}
        onUpdateWallet={updateWallet}
        onTopUpWallet={topUpWallet}
      />
    ),
    transactions: (
      <TransactionsView
        {...{ roleKey, transactions, wallets }}
        onRetryFailedTransaction={retryFailed}
        onSubmitExpense={submitExpense}
      />
    ),
    approvals: (
      <ApprovalsView
        {...{ roleKey, approvals }}
        onDecideApproval={decideApproval}
      />
    ),
    budgets: (
      <BudgetsView {...{ roleKey, budgets }} onSaveBudget={saveBudget} />
    ),
    recurring: (
      <RecurringView
        {...{ roleKey, recurring, wallets }}
        onCreateRecurring={createRecurring}
        onToggleRecurring={toggleRecurring}
      />
    ),
    savings: (
      <SavingsView
        {...{ roleKey, savings }}
        onAllocateSavings={allocateSavings}
      />
    ),
    departments: (
      <DepartmentsView
        {...{ departments }}
        onCreateDepartment={createDepartment}
      />
    ),
    members: (
      <MembersView
        {...{ roleKey, members }}
        onInviteMember={inviteMember}
        onToggleMemberStatus={toggleMember}
      />
    ),
    roles: <RolesView />,
    audit: <AuditLogsView {...{ roleKey, auditLogs }} />,
    notifications: (
      <NotificationsView
        {...{ notifications }}
        onMarkAllRead={markAllRead}
        onMarkRead={markRead}
        onNavigate={setActiveTab}
      />
    ),
    profile: (
      <ProfileSettingsView
        {...{ roleKey, biometricDevices }}
        onRegisterBiometric={registerBiometric}
        onRevokeBiometric={revokeBiometric}
        onNotifyToast={notify}
      />
    ),
  };
  views.settings = views.profile;

  return (
    <NavigationShell
      {...{ activeTab, roleKey, notifications, badges }}
      onSelectTab={selectTab}
      onChangeRole={changeRole}
      onMarkAllRead={markAllRead}
      onMarkRead={markRead}
      searchData={{ wallets, transactions }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${roleKey}-${activeTab}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
        >
          {views[activeTab]}
        </motion.div>
      </AnimatePresence>

      <ConfirmDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false);
          notify("Session locked. Redirecting to EkPocket sign-in...", "info");
        }}
        title="Sign Out of EkPocket?"
        description="Your active WebAuthn session token will be terminated on this browser."
        confirmLabel="Sign Out"
        confirmColor="error"
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={3600}
        onClose={closeToast}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={closeToast}
          severity={toast.severity}
          variant="filled"
          sx={{ borderRadius: "10px" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </NavigationShell>
  );
}
