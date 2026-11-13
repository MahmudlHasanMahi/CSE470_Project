import {
  Alert, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Drawer,
  FormControlLabel, IconButton, InputAdornment, MenuItem, Switch, Table, TableBody, TableCell,
  TableHead, TableRow, TableSortLabel, TextField, Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { motion } from "framer-motion";
import SearchRounded from "@mui/icons-material/SearchRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import InboxRounded from "@mui/icons-material/InboxRounded";
import { fadeUp, CountUp, AnimatedProgress } from "../motion.jsx";
import { money } from "../mockData.js";

/* ───────── Tokens ───────── */
export const lineColor = (t) => alpha(t.palette.secondary.main, 0.5);
export const trackColor = (t) => alpha(t.palette.secondary.main, 0.32);
export const softPrimary = (t) => alpha(t.palette.primary.main, 0.14);

export const cardSx = {
  bgcolor: "background.paper",
  border: 1,
  borderColor: lineColor,
  borderRadius: "12px",
  boxShadow: "0 4px 20px rgba(43, 33, 64, 0.035)",
  transition: "box-shadow 0.22s ease, border-color 0.22s ease, transform 0.22s ease",
};

const dialogPaper = { borderRadius: "12px", bgcolor: "background.default" };

/* ───────── Small building blocks ───────── */
export const Btn = ({ sx, ...props }) => <Button {...props} sx={{ borderRadius: "10px", ...sx }} />;

export const Caption = ({ block, sx, ...props }) => (
  <Typography
    variant="caption"
    color="text.secondary"
    sx={{ display: block ? "block" : undefined, ...sx }}
    {...props}
  />
);

export const Heading = ({ sx, ...props }) => (
  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25, ...sx }} {...props} />
);

/** Bordered inner box. `paper` = white surface, `row` = flex row with space-between. */
export function Tile({ paper, row, p = 1.75, radius = 10, sx, ...props }) {
  return (
    <Box
      sx={{
        p,
        borderRadius: `${radius}px`,
        bgcolor: paper ? "background.paper" : "background.default",
        border: 1,
        borderColor: lineColor,
        ...(row && { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1.5 }),
        ...sx,
      }}
      {...props}
    />
  );
}

/** Bold title with a caption underneath. */
export const TwoLine = ({ title, sub, weight = 600 }) => (
  <Box>
    <Typography variant="body2" fontWeight={weight}>{title}</Typography>
    <Caption>{sub}</Caption>
  </Box>
);

/** Label on the left, value on the right. */
export const KV = ({ label, children }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    {typeof children === "string" ? <Typography variant="body2" fontWeight={600}>{children}</Typography> : children}
  </Box>
);

export const signed = (n) => `${n > 0 ? "+" : "−"}${money(Math.abs(n))}`;

export const Amount = ({ value, ...props }) => (
  <Typography
    variant="body2"
    fontWeight={700}
    color={value > 0 ? "success.main" : "text.primary"}
    sx={{ fontVariantNumeric: "tabular-nums" }}
    {...props}
  >
    {signed(value)}
  </Typography>
);

export const percent = (part, whole) => Math.round((part / (whole || 1)) * 100);

export const meterColor = (pct, warnAt = 90, errorAt = Infinity) =>
  pct >= errorAt ? "error" : pct >= warnAt ? "warning" : "primary";

/** Animated progress bar with optional left/right captions above it. */
export function Meter({ value, color, height = 8, delay = 0.25, left, right, sx }) {
  return (
    <Box sx={sx}>
      {(left || right) && (
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          {left}
          {right}
        </Box>
      )}
      <AnimatedProgress
        value={value}
        delay={delay}
        color={color}
        sx={{ height, borderRadius: Math.round(height / 2), bgcolor: trackColor }}
      />
    </Box>
  );
}

export const matches = (query, ...fields) =>
  fields.some((f) => f.toLowerCase().includes(query.toLowerCase()));

/* ───────── Cards ───────── */
export function Panel({ title, subtitle, action, children, sx }) {
  return (
    <Box component={motion.div} variants={fadeUp} sx={{ ...cardSx, p: { xs: 2.25, md: 3 }, ...sx }}>
      {(title || action) && (
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, mb: 2.25, flexWrap: "wrap" }}>
          <Box>
            {title && <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 16.5 }}>{title}</Typography>}
            {subtitle && <Caption block sx={{ mt: 0.25 }}>{subtitle}</Caption>}
          </Box>
          {action}
        </Box>
      )}
      {children}
    </Box>
  );
}

export function StatCard({ label, value, format, note, icon, tone = "primary", onClick }) {
  return (
    <Box
      component={motion.div}
      variants={fadeUp}
      whileHover={{ y: -2 }}
      onClick={onClick}
      sx={{
        ...cardSx,
        p: 2.25,
        cursor: onClick ? "pointer" : "default",
        "&:hover": {
          boxShadow: (t) => `0 10px 26px ${alpha(t.palette.primary.main, 0.12)}`,
          borderColor: (t) => alpha(t.palette.primary.main, 0.45),
        },
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: 13 }}>{label}</Typography>
        <Avatar
          variant="rounded"
          sx={{
            width: 34,
            height: 34,
            borderRadius: "10px",
            bgcolor: (t) => alpha(t.palette[tone]?.main || t.palette.primary.main, 0.12),
            color: `${tone}.main`,
          }}
        >
          {icon}
        </Avatar>
      </Box>
      <Typography variant="h5" sx={{ mt: 1.25, fontWeight: 700, fontSize: { xs: 20, md: 22 }, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
        <CountUp value={value} format={format} />
      </Typography>
      {note && <Caption block sx={{ mt: 0.5 }}>{note}</Caption>}
    </Box>
  );
}

const STATUS_TONES = {
  success: ["Posted", "Succeeded", "Active", "Approved", "Paid", "On Track"],
  primary: ["Ahead"],
  warning: ["Pending", "Warning", "Awaiting Hold Capture"],
  error: ["Failed", "Declined", "Rejected", "Over Budget", "Frozen"],
};

export function StatusChip({ status = "", size = "small" }) {
  // API values may be lower-case ("pending", "approved"); they map to the same tones
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  const color = Object.keys(STATUS_TONES).find((tone) => STATUS_TONES[tone].includes(label)) || "default";
  return <Chip size={size} label={label} color={color} variant="outlined" sx={{ fontWeight: 600, fontSize: 12, borderRadius: "8px" }} />;
}

export function SearchField({ value, onChange, placeholder = "Search...", sx }) {
  return (
    <TextField
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      sx={{ minWidth: { xs: "100%", sm: 240 }, "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "background.default" }, ...sx }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchRounded fontSize="small" sx={{ color: "text.secondary" }} />
          </InputAdornment>
        ),
      }}
    />
  );
}

/* ───────── Overlays ───────── */
export function DetailDrawer({ open, onClose, title, subtitle, width = 460, children, footer }) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: "100%", sm: width }, bgcolor: "background.default", borderLeft: 1, borderColor: lineColor, display: "flex", flexDirection: "column" },
      }}
    >
      <Box sx={{ p: 2.5, bgcolor: "background.paper", borderBottom: 1, borderColor: lineColor, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 17 }}>{title}</Typography>
          {subtitle && <Caption>{subtitle}</Caption>}
        </Box>
        <IconButton onClick={onClose} size="small"><CloseRounded /></IconButton>
      </Box>
      <Box sx={{ p: 2.5, flex: 1, overflowY: "auto" }}>{children}</Box>
      {footer && (
        <Box sx={{ p: 2, bgcolor: "background.paper", borderTop: 1, borderColor: lineColor, display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
          {footer}
        </Box>
      )}
    </Drawer>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, warningText, confirmLabel = "Confirm", confirmColor = "primary", children }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { ...dialogPaper, border: 1, borderColor: lineColor } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2 }}>
        {description && <Typography variant="body2" color="text.secondary">{description}</Typography>}
        {warningText && <Alert severity="warning" sx={{ borderRadius: "10px" }}>{warningText}</Alert>}
        {children}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Btn onClick={onClose} variant="outlined">Cancel</Btn>
        <Btn onClick={onConfirm} variant="contained" color={confirmColor}>{confirmLabel}</Btn>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Generic form dialog. `fields` is a list of
 * { key, label, type?, options?, placeholder?, show?, transform? }  (type "switch" renders a toggle).
 */
export function FormDialog({ open, onClose, title, fields, form, setForm, onSubmit, submitLabel = "Save", submitIcon, intro, children }) {
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: dialogPaper }}>
      <DialogTitle fontWeight={700}>{title}</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, pt: "8px !important" }}>
        {intro}
        {fields.map(({ key, type, options, show = true, transform = (v) => v, ...props }) => {
          if (!show) return null;
          if (type === "switch") {
            return (
              <FormControlLabel
                key={key}
                label={props.label}
                control={<Switch checked={form[key]} onChange={(e) => set(key, e.target.checked)} />}
              />
            );
          }
          return (
            <TextField
              key={key}
              size="small"
              fullWidth
              type={type}
              select={Boolean(options)}
              value={form[key]}
              onChange={(e) => set(key, transform(e.target.value))}
              {...props}
            >
              {options?.map((o) => (
                <MenuItem key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</MenuItem>
              ))}
            </TextField>
          );
        })}
        {children}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button onClick={onSubmit} variant="contained" startIcon={submitIcon}>{submitLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ───────── Tables ───────── */
/**
 * columns: [{ label, render?(row), key?, align?, sx?, sortKey? }]
 * Pass `sort={{ by, order }}` + `onSort(key)` to make columns with a sortKey sortable.
 */
export function DataTable({ columns, rows, rowKey = "id", minWidth = 740, onRowClick, sort, onSort }) {
  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small" sx={{ minWidth }}>
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableCell key={c.label} align={c.align}>
                {c.sortKey ? (
                  <TableSortLabel
                    active={sort.by === c.sortKey}
                    direction={sort.by === c.sortKey ? sort.order : "asc"}
                    onClick={() => onSort(c.sortKey)}
                  >
                    {c.label}
                  </TableSortLabel>
                ) : (
                  c.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row[rowKey]}
              hover
              onClick={onRowClick && (() => onRowClick(row))}
              sx={{ cursor: onRowClick ? "pointer" : undefined }}
            >
              {columns.map((c) => (
                <TableCell key={c.label} align={c.align} sx={c.sx}>
                  {c.render ? c.render(row) : row[c.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

export function EmptyState({ title = "No matching records", description = "Try adjusting your search or filters." }) {
  return (
    <Box sx={{ py: 6, px: 2, textAlign: "center", borderRadius: "12px", bgcolor: "background.default", border: 1, borderStyle: "dashed", borderColor: lineColor }}>
      <InboxRounded sx={{ fontSize: 38, color: "text.secondary", mb: 1 }} />
      <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>
      <Typography variant="body2" color="text.secondary">{description}</Typography>
    </Box>
  );
}
