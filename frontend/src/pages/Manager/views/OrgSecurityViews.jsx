import { useState } from "react";
import { Alert, Avatar, Box, Chip, Divider, FormControlLabel, MenuItem, Switch, TextField, Typography } from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import RemoveCircleOutlineRounded from "@mui/icons-material/RemoveCircleOutlineRounded";
import FingerprintRounded from "@mui/icons-material/FingerprintRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import KeyRounded from "@mui/icons-material/KeyRounded";
import DevicesRounded from "@mui/icons-material/DevicesRounded";
import { Stagger } from "../motion.jsx";
import {
  Btn, Caption, DataTable, FormDialog, Heading, Meter, Panel, SearchField, StatusChip, Tile, TwoLine,
  matches, meterColor, percent,
} from "../components/SharedUI.jsx";
import { getScope, makeId } from "../helpers.js";
import { PERMISSION_MATRIX, money } from "../mockData.js";

const ROLE_LABELS = { org_admin: "Org Admin", dept_admin: "Dept Manager", employee: "Employee" };

/** "used / limit" caption row above a progress bar, as used in several tables. */
const UsageMeter = ({ used, limit, pct = percent(used, limit), color, height = 6 }) => (
  <Meter
    value={pct}
    height={height}
    color={color}
    left={<Caption color="text.primary">{money(used)} / {money(limit)}</Caption>}
    right={<Caption fontWeight={700} color="text.primary">{pct}%</Caption>}
  />
);

/* ───────── Departments ───────── */
const BLANK_DEPARTMENT = { name: "", code: "", manager: "Nadia Karim", monthlyBudget: "350000", walletBalance: "200000" };

export function DepartmentsView({ departments, onCreateDepartment }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK_DEPARTMENT);

  const create = () => {
    if (!form.name.trim()) return;
    onCreateDepartment({
      id: `DEPT-${form.code || "NEW"}`,
      name: form.name.trim(),
      code: form.code || "NEW",
      manager: form.manager,
      managerId: "USR-02",
      membersCount: 1,
      walletBalance: Number(form.walletBalance) || 0,
      monthlyBudget: Number(form.monthlyBudget) || 0,
      spent: 0,
      status: "Active",
    });
    setOpen(false);
  };

  const columns = [
    { label: "Department", render: (d) => <TwoLine title={d.name} sub={`Code: ${d.code}`} weight={700} /> },
    { label: "Department Manager", key: "manager" },
    { label: "Members", render: (d) => `${d.membersCount} members` },
    { label: "Wallet Balance", sx: { fontWeight: 700 }, render: (d) => money(d.walletBalance) },
    {
      label: "Budget Utilization",
      sx: { minWidth: 200 },
      render: (d) => {
        const pct = percent(d.spent, d.monthlyBudget);
        return <UsageMeter used={d.spent} limit={d.monthlyBudget} pct={pct} color={meterColor(pct, 85, 101)} />;
      },
    },
    { label: "Status", render: (d) => <StatusChip status={d.status} /> },
  ];

  return (
    <Stagger>
      <Panel
        title="Organization Departments & Cost Centers"
        subtitle="Manage departmental managers, treasury wallet liquidity, and monthly budget ceilings"
        action={<Btn variant="contained" startIcon={<AddRounded />} onClick={() => setOpen(true)}>Create Department</Btn>}
      >
        <DataTable columns={columns} rows={departments} minWidth={760} />
      </Panel>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Create Department"
        submitLabel="Create Department"
        onSubmit={create}
        form={form}
        setForm={setForm}
        fields={[
          { key: "name", label: "Department Name", placeholder: "e.g., Product Design" },
          { key: "code", label: "Cost Center Code", placeholder: "e.g., DSN", transform: (v) => v.toUpperCase() },
          { key: "manager", label: "Assigned Department Manager" },
          { key: "monthlyBudget", label: "Monthly Budget Ceiling (BDT)", type: "number" },
        ]}
      />
    </Stagger>
  );
}

/* ───────── Members ───────── */
export function MembersView({ roleKey, members, onInviteMember, onToggleMemberStatus }) {
  const { user, isOrg, byDept } = getScope(roleKey);
  const blank = { name: "", email: "", department: "Marketing", role: "employee", monthlyLimit: "80000", perTxnLimit: "25000" };
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);

  const rows = byDept(members).filter((m) => matches(search, m.name, m.email, m.department));

  const invite = () => {
    if (!form.name.trim()) return;
    onInviteMember({
      id: makeId("USR", 20, 79),
      name: form.name.trim(),
      email: form.email.trim() || "member@ekpocket.io",
      department: isOrg ? form.department : user.department,
      role: form.role,
      roleLabel: ROLE_LABELS[form.role],
      walletsCount: 1,
      monthlyUsed: 0,
      monthlyLimit: Number(form.monthlyLimit) || 50000,
      perTxnLimit: Number(form.perTxnLimit) || 20000,
      status: "Active",
      webAuthnEnabled: false,
    });
    setOpen(false);
  };

  const columns = [
    {
      label: "Member",
      render: (m) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main", color: "text.primary" }}>{m.name[0]}</Avatar>
          <TwoLine title={m.name} sub={m.email} />
        </Box>
      ),
    },
    { label: "Department", key: "department" },
    {
      label: "Role",
      render: (m) => <Chip size="small" label={m.roleLabel} color={m.role === "org_admin" ? "primary" : "default"} variant="outlined" />,
    },
    { label: "Monthly Allowance Usage", sx: { minWidth: 185 }, render: (m) => <UsageMeter used={m.monthlyUsed} limit={m.monthlyLimit} /> },
    { label: "Per-Txn Cap", sx: { fontWeight: 600 }, render: (m) => money(m.perTxnLimit) },
    {
      label: "WebAuthn",
      render: (m) => (
        <Chip size="small" icon={<FingerprintRounded />} label={m.webAuthnEnabled ? "Enrolled" : "Pending"} color={m.webAuthnEnabled ? "success" : "default"} variant="outlined" />
      ),
    },
    { label: "Status", render: (m) => <StatusChip status={m.status} /> },
    {
      label: "Access",
      align: "right",
      render: (m) => <Btn size="small" onClick={() => onToggleMemberStatus(m.id)}>{m.status === "Active" ? "Suspend" : "Activate"}</Btn>,
    },
  ];

  return (
    <Stagger>
      <Panel
        title="Members, Employees & Spending Allowances"
        subtitle="Manage user roles, departmental assignments, and individual wallet spending limits"
        action={
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <SearchField value={search} onChange={setSearch} placeholder="Search name, email, dept..." />
            <Btn variant="contained" startIcon={<AddRounded />} onClick={() => setOpen(true)}>Add Member</Btn>
          </Box>
        }
      >
        <DataTable columns={columns} rows={rows} minWidth={780} />
      </Panel>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Invite Organization Member"
        submitLabel="Send Invite"
        onSubmit={invite}
        form={form}
        setForm={setForm}
        fields={[
          { key: "name", label: "Full Name" },
          { key: "email", label: "Work Email" },
          {
            key: "role",
            label: "Role",
            options: [
              { value: "employee", label: "Employee" },
              { value: "dept_admin", label: "Department Manager" },
              ...(isOrg ? [{ value: "org_admin", label: "Organization Admin" }] : []),
            ],
          },
          { key: "monthlyLimit", label: "Monthly Wallet Limit (BDT)", type: "number" },
          { key: "perTxnLimit", label: "Per-Transaction Cap (BDT)", type: "number" },
        ]}
      />
    </Stagger>
  );
}

/* ───────── Roles & permissions ───────── */
export function RolesView() {
  const roleColumns = [
    ["org_admin", "Organization Admin"],
    ["dept_admin", "Department Manager"],
    ["employee", "Employee"],
  ].map(([key, label]) => ({
    label: `${label} (\`${key}\`)`,
    align: "center",
    render: (row) =>
      row[key] ? <CheckCircleRounded color="success" fontSize="small" /> : <RemoveCircleOutlineRounded color="disabled" fontSize="small" />,
  }));

  return (
    <Stagger>
      <Panel
        title="Role-Based Access Control (RBAC) Matrix"
        subtitle="System permission boundaries enforced across Organization Admins, Department Managers, and Employees"
      >
        <DataTable
          rowKey="capability"
          minWidth={640}
          rows={PERMISSION_MATRIX}
          columns={[{ label: "Capability / Financial Control", key: "capability", sx: { fontWeight: 600 } }, ...roleColumns]}
        />
      </Panel>
    </Stagger>
  );
}

/* ───────── Audit trail ───────── */
export function AuditLogsView({ roleKey, auditLogs }) {
  const { byDept } = getScope(roleKey);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("All");

  const actionTypes = ["All", ...new Set(auditLogs.map((l) => l.action))];
  const rows = byDept(auditLogs).filter(
    (l) => (action === "All" || l.action === action) && matches(search, l.actor, l.entity, l.action)
  );

  const Snapshot = ({ label, color, data }) => (
    <Box>
      <Caption block fontWeight={700} color={color}>{label}</Caption>
      <code>{data ? JSON.stringify(data) : "—"}</code>
    </Box>
  );

  return (
    <Stagger>
      <Panel
        title="Financial & Administrative Audit Trail"
        subtitle="Immutable record of approvals, wallet policy changes, treasury transfers, and declined actions"
        action={
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <SearchField value={search} onChange={setSearch} placeholder="Filter actor, entity, event..." />
            <TextField select size="small" label="Action Type" value={action} onChange={(e) => setAction(e.target.value)} sx={{ minWidth: 190 }}>
              {actionTypes.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </TextField>
          </Box>
        }
      >
        <Box sx={{ display: "grid", gap: 1.5 }}>
          {rows.map((log) => (
            <Tile key={log.id} radius={12} p={2}>
              <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Chip size="small" label={log.action} color="primary" variant="outlined" />
                  <Typography variant="body2" fontWeight={700}>{log.entity}</Typography>
                </Box>
                <Caption>{log.id} · {log.timestamp}</Caption>
              </Box>
              <Caption block sx={{ mt: 0.5 }}>
                Performed by <strong>{log.actor}</strong> ({log.actorRole}) · {log.department} · {log.ip}
              </Caption>

              {(log.before || log.after) && (
                <Tile
                  paper
                  radius={8}
                  p={1.25}
                  sx={{ mt: 1.25, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, fontFamily: "monospace", fontSize: 12 }}
                >
                  <Snapshot label="BEFORE" color="text.secondary" data={log.before} />
                  <Snapshot label="AFTER" color="primary.main" data={log.after} />
                </Tile>
              )}
            </Tile>
          ))}
        </Box>
      </Panel>
    </Stagger>
  );
}

/* ───────── Notifications ───────── */
export function NotificationsView({ notifications, onMarkAllRead, onMarkRead, onNavigate }) {
  return (
    <Stagger>
      <Panel
        title="Notification & Alert Center"
        subtitle="Approval escalations, failed payment alerts, and budget threshold warnings"
        action={<Btn size="small" variant="outlined" onClick={onMarkAllRead}>Mark All Read</Btn>}
      >
        <Box sx={{ display: "grid", gap: 1.5 }}>
          {notifications.map((n) => (
            <Tile
              row
              key={n.id}
              radius={12}
              p={2}
              sx={{ gap: 2, cursor: "pointer", ...(n.unread && { borderColor: "primary.main" }) }}
              onClick={() => {
                onMarkRead(n.id);
                if (n.targetTab) onNavigate(n.targetTab);
              }}
            >
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Chip size="small" label={n.category} />
                  <Typography variant="body2" fontWeight={700}>{n.title}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{n.body}</Typography>
              </Box>
              <Caption sx={{ flexShrink: 0 }}>{n.time}</Caption>
            </Tile>
          ))}
        </Box>
      </Panel>
    </Stagger>
  );
}

/* ───────── Profile, passkeys & settings ───────── */
const PREFERENCES = [
  ["approvalEmail", "Instant approval alerts"],
  ["overBudgetPush", "Budget threshold warnings"],
  ["failedTxSms", "Failed payment SMS alerts"],
  ["weeklyDigest", "Weekly treasury digest"],
];

export function ProfileSettingsView({ roleKey, biometricDevices, onRegisterBiometric, onRevokeBiometric, onNotifyToast }) {
  const { user, role } = getScope(roleKey);
  const [profile, setProfile] = useState({ name: user.name, phone: user.phone });
  const [prefs, setPrefs] = useState({ approvalEmail: true, overBudgetPush: true, failedTxSms: true, weeklyDigest: false });
  const [registerOpen, setRegisterOpen] = useState(false);
  const [device, setDevice] = useState({ name: "" });

  const register = () => {
    onRegisterBiometric({
      id: makeId("BIO", 10, 89),
      name: device.name.trim() || "Platform Biometric Key",
      authenticatorType: "FIDO2 / WebAuthn Passkey",
      registeredAt: "Nov 13, 2026",
      lastUsed: "Just now",
      status: "Active",
    });
    setDevice({ name: "" });
    setRegisterOpen(false);
  };

  return (
    <Stagger>
      <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", lg: "5fr 7fr" } }}>
        <Panel title="Personal Information" subtitle="Account identity and organizational placement">
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2.5 }}>
            <Avatar sx={{ width: 60, height: 60, bgcolor: "primary.main", fontSize: 22, fontWeight: 700 }}>{user.avatar}</Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>{user.name}</Typography>
              <Typography variant="body2" color="text.secondary">{user.title}</Typography>
              <Chip size="small" label={`${user.department} · ${role.badge}`} color="primary" variant="outlined" sx={{ mt: 0.5 }} />
            </Box>
          </Box>

          <Box sx={{ display: "grid", gap: 2 }}>
            <TextField label="Full Name" size="small" fullWidth value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <TextField label="Email Address" size="small" fullWidth value={user.email} disabled />
            <TextField label="Phone Number" size="small" fullWidth value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            <Btn variant="contained" onClick={() => onNotifyToast("Profile details updated.")}>Save Profile Changes</Btn>
          </Box>
        </Panel>

        <Panel
          title="WebAuthn Biometric & Passkey Devices"
          subtitle="Hardware and platform authenticators used to sign off high-value approvals (> ৳50,000)"
          action={
            <Btn variant="contained" size="small" startIcon={<FingerprintRounded />} onClick={() => setRegisterOpen(true)}>
              Register Biometric Device
            </Btn>
          }
        >
          <Box sx={{ display: "grid", gap: 1.5 }}>
            {biometricDevices.map((d) => (
              <Tile row key={d.id} radius={12}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Avatar variant="rounded" sx={{ bgcolor: "background.paper", color: "primary.main" }}><FingerprintRounded /></Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>{d.name}</Typography>
                    <Caption block>{d.authenticatorType}</Caption>
                    <Caption>Registered {d.registeredAt} · Last verified {d.lastUsed}</Caption>
                  </Box>
                </Box>
                <Btn size="small" color="error" startIcon={<DeleteOutlineRounded />} onClick={() => onRevokeBiometric(d.id)}>Revoke</Btn>
              </Tile>
            ))}
          </Box>

          <Divider sx={{ my: 2.5 }} />

          <Heading>Active Sessions & Security Notifications</Heading>
          <Tile row sx={{ mb: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <DevicesRounded color="primary" fontSize="small" />
              <TwoLine title="Current Session · Dhaka, Bangladesh" sub="Chrome on macOS · Authenticated via WebAuthn Passkey" />
            </Box>
            <Chip size="small" label="Active Now" color="success" variant="outlined" />
          </Tile>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 0.5 }}>
            {PREFERENCES.map(([key, label]) => (
              <FormControlLabel
                key={key}
                label={label}
                control={<Switch checked={prefs[key]} onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })} />}
              />
            ))}
          </Box>

          <Btn
            size="small"
            variant="outlined"
            startIcon={<KeyRounded />}
            sx={{ mt: 2 }}
            onClick={() => onNotifyToast("Password reset link dispatched to your corporate email.")}
          >
            Change Account Password
          </Btn>
        </Panel>
      </Box>

      <FormDialog
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        title="Register WebAuthn Biometric Device"
        submitLabel="Complete Biometric Scan"
        submitIcon={<FingerprintRounded />}
        onSubmit={register}
        form={device}
        setForm={setDevice}
        intro={
          <Alert severity="info" sx={{ borderRadius: "10px" }}>
            Touch your fingerprint sensor or security key when prompted by your browser to bind a cryptographic credential to your account.
          </Alert>
        }
        fields={[{ key: "name", label: "Device Label", placeholder: "e.g., YubiKey 5C NFC — Backup" }]}
      />
    </Stagger>
  );
}
