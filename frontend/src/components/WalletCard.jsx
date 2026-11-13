import { Panel } from "../pages/Employee/components/SharedUI";
import { Box, Avatar, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AccountBalanceWalletRounded from "@mui/icons-material/AccountBalanceWalletRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import {
  Caption,
  StatusChip,
  meterColor,
  lineColor,
  Meter,
  percent,
  Tile,
  Btn,
} from "../pages/Employee/components/SharedUI";
import { money } from "../pages/Employee/mockData";
const WalletCard = ({ key, w, setSelectedId }) => {
  const pct = percent(w.spentThisMonth, w.monthlyLimit);
  return (
    <Panel
      key={w.id}
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        cursor: "pointer",
        "&:hover": {
          borderColor: "primary.main",
          boxShadow: (t) =>
            `0 12px 28px ${alpha(t.palette.primary.main, 0.12)}`,
        },
      }}
    >
      <Box onClick={() => setSelectedId(w.id)}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Avatar
              variant="rounded"
              sx={{
                bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                color: "primary.main",
                borderRadius: "10px",
              }}
            >
              <AccountBalanceWalletRounded fontSize="small" />
            </Avatar>
            <Box>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{ lineHeight: 1.25 }}
              >
                {w.name}
              </Typography>
              <Caption>
                {w.department} · {w.type}
              </Caption>
            </Box>
          </Box>
          <StatusChip status={w.status} />
        </Box>

        <Box sx={{ my: 2.5 }}>
          <Caption>Available Balance</Caption>
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {money(w.balance)}
          </Typography>
        </Box>

        <Meter
          sx={{ mb: 2 }}
          value={pct}
          height={7}
          delay={0.2 + key * 0.08}
          color={meterColor(pct)}
          left={<Caption>Monthly Spend Allowance</Caption>}
          right={
            <Caption fontWeight={600} color="text.primary">
              {money(w.spentThisMonth)} / {money(w.monthlyLimit)}
            </Caption>
          }
        />

        <Tile row p={1.25}>
          <Caption>Per-Transaction Limit</Caption>
          <Caption fontWeight={700} color="text.primary">
            {money(w.perTxnLimit)}
          </Caption>
        </Tile>
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 1,
          mt: 2,
          pt: 1.5,
          borderTop: 1,
          borderColor: lineColor,
        }}
      >
        <Btn
          size="small"
          fullWidth
          variant="outlined"
          startIcon={<TuneRounded />}
          onClick={() => setSelectedId(w.id)}
        >
          View Details
        </Btn>
        {/* {canEdit && (
          <Btn
            size="small"
            variant="contained"
            sx={{ flexShrink: 0 }}
            onClick={() => setTopUp({ wallet: w, amount: "50000" })}
          >
            Top Up
          </Btn>
        )} */}
      </Box>
    </Panel>
  );
};

export default WalletCard;
