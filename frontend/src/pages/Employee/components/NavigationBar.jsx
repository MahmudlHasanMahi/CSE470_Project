import AccountBalanceWalletRounded from "@mui/icons-material/AccountBalanceWalletRounded";
import {
  alpha,
  Avatar,
  Badge,
  List,
  Box,
  Chip,
  IconButton,
  ListItemIcon,
  Typography,
  ListItemButton,
  ListItemText,
  Tooltip,
} from "@mui/material";
import NotificationsRounded from "@mui/icons-material/NotificationsRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import FactCheckRounded from "@mui/icons-material/FactCheckRounded";
import SwapHorizRounded from "@mui/icons-material/SwapHorizRounded";
import GridViewRounded from "@mui/icons-material/GridViewRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import MonitorHeartRounded from "@mui/icons-material/MonitorHeartRounded";
import ScienceRounded from "@mui/icons-material/ScienceRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import { Caption, lineColor } from "./SharedUI.jsx";
import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
const userAvatar = {
  width: 36,
  height: 36,
  bgcolor: "primary.main",
  fontSize: 13.5,
  fontWeight: 700,
};
const NAV_GROUPS = [
  {
    group: "Overview",
    items: [{ id: "dashboard", label: "Dashboard", Icon: GridViewRounded }],
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
    group: "Insights",
    items: [
      {
        id: "financial-health",
        label: "Financial Health",
        Icon: MonitorHeartRounded,
      },
      {
        id: "financial-scenarios",
        label: "Scenario Planning",
        Icon: ScienceRounded,
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
const iconBox = {
  border: 1,
  borderColor: lineColor,
  bgcolor: "background.paper",
  borderRadius: "10px",
};

const NavigationBar = ({
  collapsed,
  onToggleCollapse,
  role,
  badges,
  isMobile,
}) => {
  const [selectedTab, setSelectedTab] = useState("Dashboard");
  const navigate = useNavigate();
  const location = useLocation();

  const basePath = location.pathname.split("/")[1];

  const handleNav = (id) => {
    setSelectedTab(id);
    navigate(`/${basePath}/${id.toLowerCase()}`);
  };
  const mini = collapsed;
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: mini ? 82 : 264,
        minWidth: mini ? 82 : 264,
        boxSizing: "border-box",
        p: mini ? 1.5 : 2,
        bgcolor: "background.default",
        overflow: "hidden",
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
          flexShrink: 0,
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
                {items.map(({ id, label, Icon, badgeKey }) => {
                  const active = selectedTab === id;
                  const count = badges[badgeKey] || 0;
                  const icon = <Icon fontSize="small" />;
                  const button = (
                    <ListItemButton
                      key={id}
                      onClick={() => handleNav(id)}
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
        onClick={() => handleNav("profile")}
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
};

export default NavigationBar;
