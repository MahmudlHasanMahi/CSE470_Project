import { useEffect, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { motion } from "framer-motion";
import GridViewRounded from "@mui/icons-material/GridViewRounded";
import AccountBalanceWalletRounded from "@mui/icons-material/AccountBalanceWalletRounded";
import SwapHorizRounded from "@mui/icons-material/SwapHorizRounded";
import FactCheckRounded from "@mui/icons-material/FactCheckRounded";
import PieChartRounded from "@mui/icons-material/PieChartRounded";
import AutorenewRounded from "@mui/icons-material/AutorenewRounded";
import SavingsRounded from "@mui/icons-material/SavingsRounded";
import CorporateFareRounded from "@mui/icons-material/CorporateFareRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import AdminPanelSettingsRounded from "@mui/icons-material/AdminPanelSettingsRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import NotificationsRounded from "@mui/icons-material/NotificationsRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import FingerprintRounded from "@mui/icons-material/FingerprintRounded";
import SwapVertRounded from "@mui/icons-material/SwapVertRounded";
import { Caption, lineColor } from "./SharedUI.jsx";
import { ROLES, money } from "../mockData.js";

export const NAV_GROUPS = [
  {
    group: "Overview",
    items: [{ id: "overview", label: "Dashboard", Icon: GridViewRounded }],
  },
  {
    group: "Financial Management",
    items: [
      { id: "wallets", label: "Wallets", Icon: AccountBalanceWalletRounded },
      { id: "transactions", label: "Transactions", Icon: SwapHorizRounded },
      {
        id: "approvals",
        label: "Approvals",
        Icon: FactCheckRounded,
        badgeKey: "approvals",
      },
    ],
  },
  {
    group: "Security & Monitoring",
    items: [
      {
        id: "notifications",
        label: "Notifications",
        Icon: NotificationsRounded,
        badgeKey: "notifications",
      },
    ],
  },
  {
    group: "Account",
    items: [
      { id: "profile", label: "My Profile", Icon: PersonRounded },
      { id: "settings", label: "Settings", Icon: SettingsRounded },
      { id: "logout", label: "Logout", Icon: LogoutRounded },
    ],
  },
];

const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

const iconBox = {
  border: 1,
  borderColor: lineColor,
  bgcolor: "background.paper",
  borderRadius: "10px",
};
const userAvatar = {
  width: 36,
  height: 36,
  bgcolor: "primary.main",
  fontSize: 13.5,
  fontWeight: 700,
};
const menuPaper = (sx) => ({ sx: { borderRadius: "12px", mt: 1, ...sx } });

/* ───────── Sidebar ───────── */
function SidebarContent({
  collapsed,
  onToggleCollapse,
  activeTab,
  onSelectTab,
  role,
  badges,
  isMobile,
}) {
  const mini = collapsed && !isMobile; // icon-only rail
  const allowed = new Set(role.permissions);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        p: mini ? 1.5 : 2,
        bgcolor: "background.default",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: mini ? "center" : "space-between",
          px: mini ? 0 : 1,
          mb: 2,
          minHeight: 44,
        }}
      >
        {!mini && (
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
            <Typography
              sx={{
                fontFamily: '"Grand Hotel", cursive',
                fontSize: 33,
                lineHeight: 1,
                color: "primary.main",
              }}
            >
              EkPocket
            </Typography>
            <Chip
              size="small"
              label="Enterprise"
              sx={{
                height: 20,
                fontSize: 10.5,
                fontWeight: 600,
                bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                color: "primary.main",
              }}
            />
          </Box>
        )}
        {!isMobile && (
          <IconButton size="small" onClick={onToggleCollapse} sx={iconBox}>
            {collapsed ? (
              <ChevronRightRounded fontSize="small" />
            ) : (
              <ChevronLeftRounded fontSize="small" />
            )}
          </IconButton>
        )}
      </Box>

      {/* Sections */}
      <Box sx={{ flex: 1, overflowY: "auto", pr: 0.25 }}>
        {NAV_GROUPS.map(({ group, items }) => {
          const visible = items.filter(
            (i) => i.id === "logout" || allowed.has(i.id),
          );
          if (!visible.length) return null;
          return (
            <Box key={group} sx={{ mb: 2 }}>
              {!mini && (
                <Typography
                  variant="overline"
                  sx={{
                    px: 1.5,
                    mb: 0.5,
                    display: "block",
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "text.secondary",
                  }}
                >
                  {group}
                </Typography>
              )}
              <List disablePadding sx={{ display: "grid", gap: 0.4 }}>
                {visible.map(({ id, label, Icon, badgeKey }) => {
                  const active = activeTab === id;
                  const count = badges[badgeKey] || 0;
                  const icon = <Icon fontSize="small" />;
                  const button = (
                    <ListItemButton
                      key={id}
                      onClick={() => onSelectTab(id)}
                      sx={{
                        borderRadius: "12px",
                        py: 0.9,
                        px: mini ? 1.25 : 1.5,
                        justifyContent: mini ? "center" : "flex-start",
                        position: "relative",
                        color: active
                          ? "#fff"
                          : id === "logout"
                            ? "error.main"
                            : "text.primary",
                        "&:hover": {
                          bgcolor: active
                            ? "transparent"
                            : (t) => alpha(t.palette.primary.main, 0.08),
                        },
                      }}
                    >
                      {active && (
                        <Box
                          component={motion.div}
                          layoutId="ekpocket-nav-pill"
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 34,
                          }}
                          sx={{
                            position: "absolute",
                            inset: 0,
                            bgcolor: "primary.main",
                            borderRadius: "12px",
                            boxShadow: (t) =>
                              `0 6px 16px ${alpha(t.palette.primary.main, 0.32)}`,
                          }}
                        />
                      )}
                      <ListItemIcon
                        sx={{
                          minWidth: mini ? "auto" : 34,
                          position: "relative",
                          color: active
                            ? "#fff"
                            : id === "logout"
                              ? "error.main"
                              : "text.secondary",
                        }}
                      >
                        {count > 0 ? (
                          <Badge
                            badgeContent={count}
                            color={active ? "default" : "primary"}
                          >
                            {icon}
                          </Badge>
                        ) : (
                          icon
                        )}
                      </ListItemIcon>
                      {!mini && (
                        <ListItemText
                          primary={label}
                          primaryTypographyProps={{
                            fontSize: 13.75,
                            fontWeight: active ? 600 : 500,
                            noWrap: true,
                          }}
                          sx={{ position: "relative" }}
                        />
                      )}
                    </ListItemButton>
                  );
                  return mini ? (
                    <Tooltip key={id} title={label} placement="right">
                      {button}
                    </Tooltip>
                  ) : (
                    button
                  );
                })}
              </List>
            </Box>
          );
        })}
      </Box>

      {/* User card */}
      <Box
        onClick={() => onSelectTab("profile")}
        sx={{
          mt: 1,
          p: mini ? 1 : 1.5,
          borderRadius: "12px",
          bgcolor: "background.paper",
          border: 1,
          borderColor: lineColor,
          display: "flex",
          alignItems: "center",
          justifyContent: mini ? "center" : "flex-start",
          gap: 1.25,
          cursor: "pointer",
          "&:hover": { borderColor: "primary.main" },
        }}
      >
        <Avatar sx={userAvatar}>{role.user.avatar}</Avatar>
        {!mini && (
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {role.user.name}
            </Typography>
            <Caption block noWrap>
              {role.user.department} · {role.badge}
            </Caption>
          </Box>
        )}
      </Box>
    </Box>
  );
}

/* ───────── Top-bar popups ───────── */
function NotificationsPopover({
  anchor,
  onClose,
  notifications,
  role,
  onMarkAllRead,
  onMarkRead,
  onSelectTab,
}) {
  const unread = notifications.filter((n) => n.unread).length;
  const go = (tab) => {
    onClose();
    onSelectTab(tab);
  };

  return (
    <Popover
      open={Boolean(anchor)}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      PaperProps={menuPaper({
        width: 370,
        maxWidth: "92vw",
        bgcolor: "background.paper",
        border: 1,
        borderColor: lineColor,
      })}
    >
      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="subtitle2" fontWeight={700}>
          Notifications ({unread} unread)
        </Typography>
        <Button size="small" onClick={onMarkAllRead}>
          Mark all read
        </Button>
      </Box>
      <Divider />
      <List disablePadding sx={{ maxHeight: 340, overflowY: "auto" }}>
        {notifications.map((n) => (
          <ListItemButton
            key={n.id}
            onClick={() => {
              onMarkRead(n.id);
              onClose();
              if (n.targetTab && role.permissions.includes(n.targetTab))
                onSelectTab(n.targetTab);
            }}
            sx={{
              alignItems: "flex-start",
              py: 1.5,
              px: 2,
              bgcolor: n.unread
                ? (t) => alpha(t.palette.primary.main, 0.05)
                : "transparent",
              borderBottom: 1,
              borderColor: lineColor,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Typography variant="body2" fontWeight={n.unread ? 700 : 500}>
                  {n.title}
                </Typography>
                <Caption sx={{ flexShrink: 0 }}>{n.time}</Caption>
              </Box>
              <Caption block sx={{ mt: 0.4 }}>
                {n.body}
              </Caption>
            </Box>
          </ListItemButton>
        ))}
      </List>
      {role.permissions.includes("notifications") && (
        <Box sx={{ p: 1.25, textAlign: "center" }}>
          <Button size="small" fullWidth onClick={() => go("notifications")}>
            Open Notification Center
          </Button>
        </Box>
      )}
    </Popover>
  );
}

function ProfileMenu({ anchor, onClose, user, onSelectTab }) {
  const entries = [
    { tab: "profile", label: "My Profile", Icon: PersonRounded },
    { tab: "profile", label: "Biometric Devices", Icon: FingerprintRounded },
    { tab: "settings", label: "Settings", Icon: SettingsRounded },
  ];
  const go = (tab) => {
    onClose();
    onSelectTab(tab);
  };

  return (
    <Menu
      anchorEl={anchor}
      open={Boolean(anchor)}
      onClose={onClose}
      PaperProps={menuPaper({ width: 240 })}
    >
      <Box sx={{ px: 2, py: 1.25 }}>
        <Typography variant="body2" fontWeight={700}>
          {user.name}
        </Typography>
        <Caption>{user.email}</Caption>
      </Box>
      <Divider />
      {entries.map(({ tab, label, Icon }) => (
        <MenuItem key={label} onClick={() => go(tab)}>
          <ListItemIcon>
            <Icon fontSize="small" />
          </ListItemIcon>
          {label}
        </MenuItem>
      ))}
      <Divider />
      <MenuItem sx={{ color: "error.main" }} onClick={() => go("logout")}>
        <ListItemIcon sx={{ color: "error.main" }}>
          <LogoutRounded fontSize="small" />
        </ListItemIcon>
        Logout
      </MenuItem>
    </Menu>
  );
}

function QuickSearch({ open, onClose, role, searchData, onSelectTab }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const has = (...fields) => fields.some((f) => f.toLowerCase().includes(q));

  const results = !q
    ? []
    : [
        ...NAV_ITEMS.filter(
          (i) => role.permissions.includes(i.id) && has(i.label),
        ).map((i) => ({
          type: "Page",
          title: i.label,
          meta: "Navigate to section",
          tab: i.id,
        })),
        ...searchData.wallets
          .filter((w) => has(w.name, w.department))
          .map((w) => ({
            type: "Wallet",
            title: w.name,
            meta: `${w.department} · Balance ${money(w.balance)}`,
            tab: "wallets",
          })),
        ...searchData.transactions
          .filter((t) => has(t.desc, t.id))
          .map((t) => ({
            type: "Transaction",
            title: `${t.id} — ${t.desc}`,
            meta: `${t.wallet} · ${money(Math.abs(t.amount))}`,
            tab: "transactions",
          })),
      ].slice(0, 8);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "12px",
          bgcolor: "background.default",
          border: 1,
          borderColor: lineColor,
        },
      }}
    >
      <DialogContent sx={{ p: 2 }}>
        <TextField
          autoFocus
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search wallets, transactions, approvals, or jump to a page..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded color="primary" />
              </InputAdornment>
            ),
          }}
        />
        <List sx={{ mt: 1 }}>
          {results.length === 0 ? (
            <Caption block sx={{ px: 1, py: 2 }}>
              {q
                ? "No matching records found."
                : "Type a keyword like 'Singapore', 'AWS', 'Wallets', or 'Approvals'."}
            </Caption>
          ) : (
            results.map((r, i) => (
              <ListItemButton
                key={i}
                sx={{ borderRadius: "10px" }}
                onClick={() => {
                  onClose();
                  setQuery("");
                  onSelectTab(r.tab);
                }}
              >
                <ListItemText primary={r.title} secondary={r.meta} />
                <Chip size="small" label={r.type} variant="outlined" />
              </ListItemButton>
            ))
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
}

/* ───────── Shell ───────── */
export function NavigationShell({
  activeTab,
  onSelectTab,
  roleKey,
  onChangeRole,
  notifications,
  onMarkAllRead,
  onMarkRead,
  searchData,
  badges,
  children,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [profileAnchor, setProfileAnchor] = useState(null);
  const [roleAnchor, setRoleAnchor] = useState(null);

  const role = ROLES[roleKey] || ROLES.dept_admin;
  const activeLabel =
    NAV_ITEMS.find((i) => i.id === activeTab)?.label || "Dashboard";
  const unreadCount = notifications.filter((n) => n.unread).length;

  // ⌘K / Ctrl+K toggles quick search
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleNav = (id) => {
    setMobileOpen(false);
    onSelectTab(id);
  };
  const sidebarProps = { activeTab, onSelectTab: handleNav, role, badges };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      {/* Desktop sidebar */}
      <Box
        component="aside"
        sx={{
          display: { xs: "none", md: "block" },
          width: collapsed ? 82 : 264,
          flexShrink: 0,
          transition: "width 0.24s ease",
          position: "sticky",
          top: 0,
          height: "100vh",
          borderRight: 1,
          borderColor: lineColor,
        }}
      >
        <SidebarContent
          {...sidebarProps}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
      </Box>

      {/* Mobile drawer */}
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{ sx: { width: 272, bgcolor: "background.default" } }}
      >
        <SidebarContent {...sidebarProps} collapsed={false} isMobile />
      </Drawer>

      <Box
        sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}
      >
        {/* Top bar */}
        <Box
          component="header"
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            px: { xs: 2, md: 3.5 },
            py: 1.5,
            bgcolor: (t) => alpha(t.palette.background.default, 0.88),
            backdropFilter: "blur(10px)",
            borderBottom: 1,
            borderColor: lineColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <IconButton
              onClick={() => setMobileOpen(true)}
              sx={{
                display: { xs: "inline-flex", md: "none" },
                border: 1,
                borderColor: lineColor,
              }}
            >
              <MenuRounded fontSize="small" />
            </IconButton>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ lineHeight: 1.2 }}
            >
              {activeLabel}
            </Typography>
            <Chip
              size="small"
              label={role.user.department}
              sx={{
                height: 22,
                fontSize: 11.5,
                fontWeight: 600,
                bgcolor: "background.paper",
                border: 1,
                borderColor: lineColor,
              }}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Button
              size="small"
              onClick={() => setSearchOpen(true)}
              startIcon={<SearchRounded fontSize="small" />}
              sx={{
                ...iconBox,
                display: { xs: "none", sm: "inline-flex" },
                color: "text.secondary",
                px: 1.5,
                py: 0.65,
                textTransform: "none",
                minWidth: 190,
                justifyContent: "space-between",
              }}
            >
              <span>Quick jump...</span>
              <Chip
                size="small"
                label="⌘K"
                sx={{
                  height: 20,
                  fontSize: 11,
                  bgcolor: "background.default",
                  ml: 1,
                }}
              />
            </Button>

            <Button
              size="small"
              variant="outlined"
              onClick={(e) => setRoleAnchor(e.currentTarget)}
              endIcon={<SwapVertRounded fontSize="small" />}
              sx={{
                ...iconBox,
                color: "text.primary",
                textTransform: "none",
                fontWeight: 600,
                fontSize: 12.5,
              }}
            >
              Role: {role.label}
            </Button>
            <Menu
              anchorEl={roleAnchor}
              open={Boolean(roleAnchor)}
              onClose={() => setRoleAnchor(null)}
              PaperProps={menuPaper({ minWidth: 230 })}
            >
              <Caption block sx={{ px: 2, py: 0.75 }}>
                Preview Role-Based Experience
              </Caption>
              {Object.values(ROLES).map((r) => (
                <MenuItem
                  key={r.key}
                  selected={r.key === roleKey}
                  onClick={() => {
                    onChangeRole(r.key);
                    setRoleAnchor(null);
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {r.label}
                    </Typography>
                    <Caption>
                      {r.user.name} · {r.user.department}
                    </Caption>
                  </Box>
                </MenuItem>
              ))}
            </Menu>

            <IconButton
              onClick={(e) => setNotifAnchor(e.currentTarget)}
              sx={iconBox}
            >
              <Badge badgeContent={unreadCount} color="primary">
                <NotificationsRounded fontSize="small" />
              </Badge>
            </IconButton>

            <IconButton
              onClick={(e) => setProfileAnchor(e.currentTarget)}
              sx={{ p: 0.25 }}
            >
              <Avatar sx={userAvatar}>{role.user.avatar}</Avatar>
            </IconButton>
          </Box>
        </Box>

        <Box
          component="main"
          sx={{
            flex: 1,
            p: { xs: 2, md: 3.5 },
            maxWidth: 1520,
            width: "100%",
            mx: "auto",
          }}
        >
          {children}
        </Box>
      </Box>

      <NotificationsPopover
        anchor={notifAnchor}
        onClose={() => setNotifAnchor(null)}
        notifications={notifications}
        role={role}
        onMarkAllRead={onMarkAllRead}
        onMarkRead={onMarkRead}
        onSelectTab={onSelectTab}
      />
      <ProfileMenu
        anchor={profileAnchor}
        onClose={() => setProfileAnchor(null)}
        user={role.user}
        onSelectTab={onSelectTab}
      />
      <QuickSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        role={role}
        searchData={searchData}
        onSelectTab={onSelectTab}
      />
    </Box>
  );
}
