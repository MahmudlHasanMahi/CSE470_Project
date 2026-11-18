import { useState } from "react";
import {
  Alert, Box, Button, FormControlLabel, MenuItem, Paper, Stack, Switch,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { useRecurring, useCreateRecurring, useSetRecurringStatus } from "../../../api/recurring.api.js";

const METHODS = ['CASH', 'CARD', 'BANK TRANSFER', 'MOBILE BANKING', 'WALLET'];
const FREQS = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const empty = { name: '', recipient: '', amount: '', paymentMethod: 'CARD', frequency: 'MONTHLY', startDate: '', endDate: '', autoPay: true };

export default function RecurringPage() {
  const { data, isLoading } = useRecurring();
  const create = useCreateRecurring();
  const setStatus = useSetRecurringStatus();
  const [form, setForm] = useState(empty);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = () =>
    create.mutate({ ...form, endDate: form.endDate || null }, { onSuccess: () => setForm(empty) });

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>Recurring Payments</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <TextField label="Name" value={form.name} onChange={set('name')} />
          <TextField label="Recipient" value={form.recipient} onChange={set('recipient')} />
          <TextField label="Amount" type="number" value={form.amount} onChange={set('amount')} />

          <TextField select label="Method" value={form.paymentMethod} onChange={set('paymentMethod')} sx={{ minWidth: 170 }}>
            {METHODS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </TextField>

          <TextField select label="Frequency" value={form.frequency} onChange={set('frequency')} sx={{ minWidth: 130 }}>
            {FREQS.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
          </TextField>

          <TextField label="Start date" type="date" slotProps={{ inputLabel: { shrink: true } }} value={form.startDate} onChange={set('startDate')} sx={{ minWidth: 180 }} />
          <TextField label="End date (optional)" type="date" slotProps={{ inputLabel: { shrink: true } }} value={form.endDate} onChange={set('endDate')} sx={{ minWidth: 180 }} />
          <FormControlLabel control={<Switch checked={form.autoPay} onChange={(e) => setForm({ ...form, autoPay: e.target.checked })} />} label="Auto-pay" />

          <Button variant="contained" onClick={submit} disabled={create.isPending}>Schedule</Button>
        </Stack>
        {create.isError && <Alert severity="error" sx={{ mt: 1 }}>{String(create.error.response?.data?.message || create.error.message)}</Alert>}
      </Paper>

      <Table size="small">
        <TableHead>
          <TableRow>
            {['Name', 'Recipient', 'Amount', 'Method', 'Frequency', 'Next due', 'Ends', 'Status', ''].map((h) => <TableCell key={h}>{h}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={9}>Loading...</TableCell></TableRow>}
          {data?.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.name}</TableCell>
              <TableCell>{r.recipient}</TableCell>
              <TableCell>{Number(r.amount).toFixed(2)}</TableCell>
              <TableCell>{r.paymentMethod}</TableCell>
              <TableCell>{r.frequency}</TableCell>
              <TableCell>{new Date(r.nextDueDate).toLocaleDateString()}</TableCell>
              <TableCell>{r.endDate ? new Date(r.endDate).toLocaleDateString() : '-'}</TableCell>
              <TableCell>{r.status}</TableCell>
              <TableCell>
                {r.status === 'ACTIVE' && <Button size="small" onClick={() => setStatus.mutate({ id: r.id, status: 'PAUSED' })}>Pause</Button>}
                {r.status === 'PAUSED' && <Button size="small" onClick={() => setStatus.mutate({ id: r.id, status: 'ACTIVE' })}>Resume</Button>}
                {['ACTIVE', 'PAUSED'].includes(r.status) && <Button size="small" color="error" onClick={() => setStatus.mutate({ id: r.id, status: 'CANCELLED' })}>Cancel</Button>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
