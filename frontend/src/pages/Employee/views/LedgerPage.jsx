import { useState } from "react";
import {
  Alert, Box, Button, MenuItem, Paper, Stack, Table, TableBody,
  TableCell, TableHead, TablePagination, TableRow, TextField, Typography,
} from "@mui/material";
import { useLedger, useCreateLedgerEntry, useImportLedger } from "../../../api/ledger.api.js";



const METHODS = ['CASH', 'CARD', 'BANK TRANSFER', 'MOBILE BANKING', 'WALLET'];
const empty = { amount: '', direction: 'OUT', paymentMethod: 'CARD', occurredAt: '', description: '' };

export default function LedgerPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useLedger(page + 1);
  const create = useCreateLedgerEntry();
  const importCsv = useImportLedger();
  const [form, setForm] = useState(empty);
  const [result, setResult] = useState(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = () =>
    create.mutate(form, { onSuccess: () => setForm(empty) });

  const onFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importCsv.mutate({ csv: reader.result, fileName: file.name }, { onSuccess: setResult });
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>Transaction Ledger</Typography>

      {data && (
        <Stack direction="row" spacing={4} mb={2}>
          <Typography>In: {data.totals.in.toFixed(2)}</Typography>
          <Typography>Out: {data.totals.out.toFixed(2)}</Typography>
          <Typography>Net: {data.totals.net.toFixed(2)}</Typography>
        </Stack>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>Record a transaction</Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <TextField label="Amount" type="number" value={form.amount} onChange={set('amount')} />
          <TextField select label="Direction" value={form.direction} onChange={set('direction')} sx={{ minWidth: 110 }}>
            <MenuItem value="IN">IN</MenuItem><MenuItem value="OUT">OUT</MenuItem>
          </TextField>
          <TextField select label="Method" value={form.paymentMethod} onChange={set('paymentMethod')} sx={{ minWidth: 170 }}>
            {METHODS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </TextField>
          <TextField label="Transaction date" type="date" slotProps={{ inputLabel: { shrink: true } }} value={form.occurredAt} onChange={set('occurredAt')} sx={{ minWidth: 180 }} />
          <TextField label="Description" value={form.description} onChange={set('description')} />
          <Button variant="contained" onClick={submit} disabled={create.isPending}>Add</Button>
        </Stack>
        {create.isError && <Alert severity="error" sx={{ mt: 1 }}>{String(create.error.response?.data?.message || create.error.message)}</Alert>}
      </Paper>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>Import from CSV</Typography>
        <Typography variant="body2" mb={1}>Columns: reference, date, description, direction, amount, paymentMethod, status</Typography>
        <Button variant="outlined" component="label">Choose CSV<input hidden type="file" accept=".csv" onChange={onFile} /></Button>
        {importCsv.isError && <Alert severity="error" sx={{ mt: 1 }}>{String(importCsv.error.response?.data?.message || importCsv.error.message)}</Alert>}
        {result && (
          <Alert severity={result.failed ? 'warning' : 'success'} sx={{ mt: 1 }}>
            Imported {result.imported}, failed {result.failed}.
            {result.errors.map((er, i) => <div key={i}>Line {er.line}: {er.error}</div>)}
          </Alert>
        )}
      </Paper>

      <Paper sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Date', 'Reference', 'Description', 'Dir', 'Amount', 'Method', 'Status', 'Source'].map((h) => <TableCell key={h}>{h}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={8}>Loading...</TableCell></TableRow>}
            {data?.items.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{new Date(t.occurredAt).toLocaleDateString()}</TableCell>
                <TableCell>{t.reference}</TableCell>
                <TableCell>{t.description}</TableCell>
                <TableCell>{t.direction}</TableCell>
                <TableCell>{Number(t.amount).toFixed(2)}</TableCell>
                <TableCell>{t.paymentMethod}</TableCell>
                <TableCell>{t.status}</TableCell>
                <TableCell>{t.source}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={data?.total || 0}
          page={page}
          rowsPerPage={data?.limit || 20}
          rowsPerPageOptions={[20]}
          onPageChange={(_, nextPage) => setPage(nextPage)}
        />
      </Paper>
    </Box>
  );
}