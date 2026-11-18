import { useState } from "react";
import {
  Alert,
  Box,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";
import { useTeamLedger } from "../../api/ledger.api.js";

export default function TeamLedgerPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading, error } = useTeamLedger(page + 1);
  const title =
    data?.scope === "organization"
      ? "Organization Ledger"
      : data?.departmentName
        ? `${data.departmentName} Department Ledger`
        : "Department Ledger";

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        {title}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {String(error.response?.data?.message || error.message)}
        </Alert>
      )}

      {data && (
        <Stack direction="row" spacing={4} mb={2}>
          <Typography>In: {data.totals.in.toFixed(2)}</Typography>
          <Typography>Out: {data.totals.out.toFixed(2)}</Typography>
          <Typography>Net: {data.totals.net.toFixed(2)}</Typography>
        </Stack>
      )}

      <Paper sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {[
                "Employee",
                "Department",
                "Date",
                "Reference",
                "Description",
                "Direction",
                "Amount",
                "Method",
                "Status",
              ].map((heading) => (
                <TableCell key={heading}>{heading}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={9}>Loading...</TableCell>
              </TableRow>
            )}
            {data?.items.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.user.name}</TableCell>
                <TableCell>{entry.user.department?.name || "—"}</TableCell>
                <TableCell>
                  {new Date(entry.occurredAt).toLocaleDateString()}
                </TableCell>
                <TableCell>{entry.reference}</TableCell>
                <TableCell>{entry.description || "—"}</TableCell>
                <TableCell>{entry.direction}</TableCell>
                <TableCell>{Number(entry.amount).toFixed(2)}</TableCell>
                <TableCell>{entry.paymentMethod}</TableCell>
                <TableCell>{entry.status}</TableCell>
              </TableRow>
            ))}
            {!isLoading && !error && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={9}>No ledger entries found.</TableCell>
              </TableRow>
            )}
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
