import { useState } from "react";
import { Alert, Avatar, Box, Chip, Divider, Step, StepLabel, Stepper, Tab, Tabs, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckRounded from "@mui/icons-material/CheckRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import FingerprintRounded from "@mui/icons-material/FingerprintRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import EscalatorWarningRounded from "@mui/icons-material/EscalatorWarningRounded";
import ReceiptLongRounded from "@mui/icons-material/ReceiptLongRounded";
import { Stagger } from "../motion.jsx";
import {
  Btn, Caption, ConfirmDialog, DetailDrawer, EmptyState, Heading, Panel, StatusChip, Tile, softPrimary,
} from "../components/SharedUI.jsx";
import { getScope } from "../helpers.js";
import { STEP_UP_LIMIT, money } from "../mockData.js";

const POLICIES = [
  { title: "LEVEL 1 · STANDARD REVIEW", color: "text.secondary", value: `Up to ${money(STEP_UP_LIMIT)}`, text: "Single sign-off by assigned Department Manager" },
  { title: "LEVEL 2 · BIOMETRIC STEP-UP", color: "primary.main", value: `Above ${money(STEP_UP_LIMIT)}`, text: "Requires WebAuthn passkey verification + Finance Controller review" },
  { title: "ESCALATION SLA", color: "warning.main", value: "24 Hours / Over-Budget Flag", text: "Over-budget requests highlight variance before sign-off" },
];

/** Reject / Approve buttons, or a status chip once decided (or for employees). */
function DecisionActions({ item, isEmployee, onDecide }) {
  if (item.status !== "pending") return <StatusChip status={item.status} />;
  if (isEmployee) return <StatusChip status="Pending" />;
  return (
    <>
      <Btn size="small" variant="outlined" color="error" startIcon={<CloseRounded />} onClick={() => onDecide(item, "rejected")}>
        Reject
      </Btn>
      <Btn size="small" variant="contained" startIcon={<CheckRounded />} onClick={() => onDecide(item, "approved")}>
        Approve
      </Btn>
    </>
  );
}

export function ApprovalsView({ roleKey, approvals, onDecideApproval }) {
  const { isEmployee, approvals: scopeApprovals } = getScope(roleKey);
  const [tab, setTab] = useState("pending");
  const [inspectId, setInspectId] = useState(null);
  const [confirm, setConfirm] = useState(null); // { item, decision }
  const [note, setNote] = useState("");
  const [verified, setVerified] = useState(false);

  const scoped = scopeApprovals(approvals);
  const rows = scoped.filter((a) => tab === "all" || a.status === tab);
  const inspected = approvals.find((a) => a.id === inspectId);

  const approving = confirm?.decision === "approved";
  const needsStepUp = approving && confirm.item.amount > STEP_UP_LIMIT;

  const openDecision = (item, decision) => {
    setNote("");
    setVerified(false);
    setConfirm({ item, decision });
  };

  const confirmDecision = () => {
    if (needsStepUp && !verified) return;
    onDecideApproval(confirm.item.id, confirm.decision, note);
    setConfirm(null);
    setInspectId(null);
  };

  return (
    <Stagger>
      <Panel
        title="Approval Policies & Governance Thresholds"
        subtitle="Automated routing rules enforced across departmental wallets"
        sx={{ mb: 2.5 }}
      >
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" } }}>
          {POLICIES.map((p) => (
            <Tile key={p.title}>
              <Caption fontWeight={700} color={p.color}>{p.title}</Caption>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 0.25 }}>{p.value}</Typography>
              <Caption>{p.text}</Caption>
            </Tile>
          ))}
        </Box>
      </Panel>

      <Panel
        title={isEmployee ? "My Approval Requests" : "Departmental Approval Queue"}
        subtitle="Review financial context, budget variance, and multi-level sign-off progress"
        action={
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, textTransform: "none", fontWeight: 600, fontSize: 13 } }}
          >
            <Tab value="pending" label={`Pending (${scoped.filter((a) => a.status === "pending").length})`} />
            <Tab value="approved" label="Approved" />
            <Tab value="rejected" label="Rejected" />
            <Tab value="all" label="All History" />
          </Tabs>
        }
      >
        {rows.length === 0 ? (
          <EmptyState title="No approval requests in this queue" description="All caught up! Switch tabs to inspect historical approval decisions." />
        ) : (
          <Box sx={{ display: "grid", gap: 2 }}>
            {rows.map((item) => (
              <Tile
                key={item.id}
                radius={12}
                p={2.25}
                sx={item.overBudget && item.status === "pending" && { borderColor: (t) => alpha(t.palette.warning.main, 0.55) }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
                  <Box sx={{ display: "flex", gap: 1.5, flex: 1, minWidth: 260 }}>
                    <Avatar sx={{ bgcolor: softPrimary, color: "primary.main", fontWeight: 700 }}>{item.who[0]}</Avatar>
                    <Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <Typography variant="subtitle1" fontWeight={700}>{item.what}</Typography>
                        <Chip size="small" label={item.id} variant="outlined" sx={{ height: 22 }} />
                      </Box>
                      <Caption block sx={{ mt: 0.25 }}>
                        Requested by <strong>{item.who}</strong> ({item.role}) · {item.wallet} · {item.submittedAt}
                      </Caption>
                      <Box sx={{ display: "flex", gap: 0.75, mt: 1, flexWrap: "wrap" }}>
                        <Chip size="small" label={item.category} sx={{ bgcolor: "background.paper" }} />
                        {item.overBudget && <Chip size="small" color="warning" icon={<WarningAmberRounded />} label="Exceeds Budget Limit" />}
                        {item.escalated && (
                          <Chip size="small" color="error" variant="outlined" icon={<EscalatorWarningRounded />} label={`Escalated · ${item.slaDeadline}`} />
                        )}
                        {item.amount > STEP_UP_LIMIT && (
                          <Chip size="small" color="primary" variant="outlined" icon={<FingerprintRounded />} label="Biometric Step-Up Required" />
                        )}
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                    <Typography variant="h5" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>{money(item.amount)}</Typography>
                    <Caption>{item.level}</Caption>
                  </Box>
                </Box>

                <Tile paper row sx={{ mt: 1.75, p: 1.25, flexWrap: "wrap" }}>
                  <Caption><strong>Budget Impact:</strong> {item.budgetImpactText}</Caption>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <Btn size="small" onClick={() => setInspectId(item.id)}>Inspect Details</Btn>
                    <DecisionActions item={item} isEmployee={isEmployee} onDecide={openDecision} />
                  </Box>
                </Tile>
              </Tile>
            ))}
          </Box>
        )}
      </Panel>

      {/* Details + multi-level stepper */}
      <DetailDrawer
        open={Boolean(inspected)}
        onClose={() => setInspectId(null)}
        title={inspected ? `${inspected.id} · Approval Review` : ""}
        subtitle={inspected && `${inspected.department} · ${inspected.submittedAt}`}
        footer={
          inspected?.status === "pending" &&
          !isEmployee && (
            <>
              <Btn variant="outlined" color="error" onClick={() => openDecision(inspected, "rejected")}>Reject Request</Btn>
              <Btn variant="contained" onClick={() => openDecision(inspected, "approved")}>Approve ({money(inspected.amount)})</Btn>
            </>
          )
        }
      >
        {inspected && (
          <Box sx={{ display: "grid", gap: 2.5 }}>
            <Tile paper radius={12} p={2}>
              <Caption>Requested Disbursement</Caption>
              <Typography variant="h4" fontWeight={700}>{money(inspected.amount)}</Typography>
              <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>{inspected.what}</Typography>
              <Caption>Merchant: {inspected.merchant} · Wallet: {inspected.wallet}</Caption>
            </Tile>

            {inspected.overBudget && (
              <Alert severity="warning" sx={{ borderRadius: "10px" }}>
                <strong>Over-Budget Warning:</strong> {inspected.budgetImpactText}
              </Alert>
            )}

            <Box>
              <Heading sx={{ mb: 1.5 }}>Multi-Level Approval Progress</Heading>
              <Stepper activeStep={inspected.currentStep} orientation="vertical">
                {inspected.steps.map((s, i) => (
                  <Step key={i} completed={s.status === "done"}>
                    <StepLabel optional={<Caption>{s.time}</Caption>}>{s.label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            <Divider />

            <Box>
              <Heading sx={{ mb: 0.75 }}>Business Justification & Supporting Receipt</Heading>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{inspected.notes}</Typography>
              <Chip icon={<ReceiptLongRounded />} label={`Attachment: ${inspected.receiptRef}`} variant="outlined" />
            </Box>
          </Box>
        )}
      </DetailDrawer>

      {/* Confirmation + WebAuthn step-up */}
      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={confirmDecision}
        title={approving ? `Confirm Approval — ${money(confirm.item.amount)}` : `Reject Request ${confirm?.item.id ?? ""}`}
        description={
          confirm &&
          `You are about to ${approving ? "approve" : "reject"} "${confirm.item.what}" requested by ${confirm.item.who} from ${confirm.item.wallet}.`
        }
        warningText={approving && confirm.item.overBudget ? confirm.item.budgetImpactText : null}
        confirmLabel={needsStepUp && !verified ? "Verify Fingerprint First" : approving ? "Confirm & Authorize" : "Confirm Rejection"}
        confirmColor={approving ? "primary" : "error"}
      >
        {needsStepUp && (
          <Tile row sx={{ borderColor: verified ? "success.main" : "primary.main" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <FingerprintRounded color={verified ? "success" : "primary"} />
              <Box>
                <Typography variant="body2" fontWeight={700}>WebAuthn Step-Up Required</Typography>
                <Caption>Transactions over {money(STEP_UP_LIMIT)} require passkey sign-off</Caption>
              </Box>
            </Box>
            <Btn size="small" variant={verified ? "outlined" : "contained"} color={verified ? "success" : "primary"} sx={{ borderRadius: undefined }} onClick={() => setVerified(true)}>
              {verified ? "Verified ✓" : "Authenticate"}
            </Btn>
          </Tile>
        )}
        <TextField
          label="Audit Comment (Optional)"
          size="small"
          fullWidth
          multiline
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add context for the audit log..."
        />
      </ConfirmDialog>
    </Stagger>
  );
}
