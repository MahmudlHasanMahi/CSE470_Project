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
import InsightsRounded from "@mui/icons-material/InsightsRounded";
import PieChartRounded from "@mui/icons-material/PieChartRounded";
import { alpha } from "@mui/material/styles";
import { motion } from "framer-motion";
import GridViewRounded from "@mui/icons-material/GridViewRounded";
import AccountBalanceWalletRounded from "@mui/icons-material/AccountBalanceWalletRounded";
import SwapHorizRounded from "@mui/icons-material/SwapHorizRounded";
import FactCheckRounded from "@mui/icons-material/FactCheckRounded";
import NotificationsRounded from "@mui/icons-material/NotificationsRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import ReceiptLongRounded from "@mui/icons-material/ReceiptLongRounded";
import AutorenewRounded from "@mui/icons-material/AutorenewRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import FingerprintRounded from "@mui/icons-material/FingerprintRounded";
import SwapVertRounded from "@mui/icons-material/SwapVertRounded";
import { Caption, lineColor } from "./SharedUI.jsx";
import { ROLES, money } from "../mockData.js";
import NavigationBar from "./NavigationBar.jsx";
import { useMe } from "../../../api/users.api.js";
import { useLogout } from "../../../api/auth.api.js";

export const NAV_GROUPS = [
  {
    group: "Overview",
    items: [{ id: "dashboard", label: "Dashboard", Icon: GridViewRounded }],
  },
  {
    group: "Financial Management",
    items: [
      { id: "wallets", label: "Wallets", Icon: AccountBalanceWalletRounded },
      { id: "transactions", label: "Transactions", Icon: SwapHorizRounded },
      { id: "analytics", label: "Spending Analysis", Icon: InsightsRounded },
      { id: "budgets", label: "Monthly Budgets", Icon: PieChartRounded },
      {
        id: "approvals",
        label: "Approvals",
        Icon: FactCheckRounded,
        badgeKey: "approvals",
      },
      { id: "ledger", label: "Ledger", Icon: ReceiptLongRounded },
      { id: "recurring", label: "Recurring Payments", Icon: AutorenewRounded },
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
  const logout = useLogout();

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
          {user?.name}
        </Typography>
        <Caption>{user?.email}</Caption>
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
      <MenuItem sx={{ color: "error.main" }} onClick={() => logout.mutate()}>
        <ListItemIcon sx={{ color: "error.main" }}>
          <LogoutRounded fontSize="small" />
        </ListItemIcon>
        Logout
      </MenuItem>
    </Menu>
  );
}

/* ───────── Shell ───────── */
export function NavigationShell({
  activeTab,
  onSelectTab,
  roleKey,
  onChangeRole,

  badges,
  children,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [profileAnchor, setProfileAnchor] = useState(null);
  const [roleAnchor, setRoleAnchor] = useState(null);

  // const [users, setUsers] = useState(null);
  const { data: user, isLoading, error } = useMe();

  const role = ROLES[roleKey] || ROLES.dept_admin;
  const activeLabel =
    NAV_ITEMS.find((i) => i.id === activeTab)?.label || "Dashboard";
  // const unreadCount = notifications.filter((n) => n.unread).length;

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

  const sidebarProps = { activeTab, role, badges };

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
          minWidth: collapsed ? 82 : 264,
          flexShrink: 0,
          overflow: "hidden",
          transition: "width 0.24s ease, min-width 0.24s ease",
          position: "sticky",
          top: 0,
          height: "100vh",
          borderRight: 1,
          borderColor: lineColor,
        }}
      >
        <NavigationBar
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
        <NavigationBar {...sidebarProps} collapsed={false} isMobile />
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
              label={user?.department}
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
              {/* <Badge badgeContent={unreadCount} color="primary">
                <NotificationsRounded fontSize="small" />
              </Badge> */}
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

      {/* <NotificationsPopover
        anchor={notifAnchor}
        onClose={() => setNotifAnchor(null)}
        notifications={notifications}
        role={role}
        onMarkAllRead={onMarkAllRead}
        onMarkRead={onMarkRead}
        onSelectTab={onSelectTab}
      /> */}
      <ProfileMenu
        anchor={profileAnchor}
        onClose={() => setProfileAnchor(null)}
        user={user}
        onSelectTab={onSelectTab}
      />
    </Box>
  );
}
