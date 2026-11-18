import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { NavigationShell } from "../components/NavigationShell";
import { AnimatePresence, motion } from "framer-motion";

const EmployeePageLayout = () => {
  const [roleKey, setRoleKey] = useState("dept_admin");
  const [activeTab, setActiveTab] = useState("overview");

  const badges = {
    // approvals: scope.byDept(approvals.filter((a) => a.status === "pending"))
    // .length,
    // notifications: notifications.filter((n) => n.unread).length,
  };
  return (
    <>
      <NavigationShell
        {...{ activeTab, roleKey, badges }}
        // onSelectTab={selectTab}
        // onChangeRole={changeRole}
        // onMarkAllRead={markAllRead}
        // onMarkRead={markRead}
        // searchData={{ wallets, transactions }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${roleKey}-${activeTab}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>

        {/* <ConfirmDialog
          open={logoutOpen}
          onClose={() => setLogoutOpen(false)}
          onConfirm={() => {
            setLogoutOpen(false);
            notify(
              "Session locked. Redirecting to EkPocket sign-in...",
              "info",
            );
          }}
          title="Sign Out of EkPocket?"
          description="Your active WebAuthn session token will be terminated on this browser."
          confirmLabel="Sign Out"
          confirmColor="error"
        />

        <Snackbar
          open={toast.open}
          autoHideDuration={3600}
          onClose={closeToast}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={closeToast}
            severity={toast.severity}
            variant="filled"
            sx={{ borderRadius: "10px" }}
          >
            {toast.message}
          </Alert>
        </Snackbar> */}
      </NavigationShell>
    </>
  );
};

export default EmployeePageLayout;
