import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "./api";


export const FINANCIAL_HEALTH_KEY = "financial-health";
export const FINANCIAL_SCENARIOS_KEY = "financial-scenarios";

// ---------- requests ---------- :)
// The backend works out who you are from your login cookie, so we never send a user id.
const getDashboard = async (month) =>
  (await api.get("/financial-health/dashboard", { params: month ? { month } : {} }))
    .data;

// ---------- hooks ---------- :)
export function useFinancialDashboard(month) {
  return useQuery({
    queryKey: [FINANCIAL_HEALTH_KEY, "dashboard", month || "current"],
    queryFn: () => getDashboard(month),
    placeholderData: keepPreviousData, // keep the old numbers on screen while a new month loads
  });
}

/**
 * Call the returned function after an ACTUAL transaction is created/approved so the
 * dashboard and the simulator baseline reload with the new figures:
 *
**/
export function useRefreshFinancialData() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [FINANCIAL_HEALTH_KEY] }),
      queryClient.invalidateQueries({ queryKey: [FINANCIAL_SCENARIOS_KEY, "baseline"] }),
      queryClient.invalidateQueries({ queryKey: [FINANCIAL_SCENARIOS_KEY, "calculate"] }),
      queryClient.invalidateQueries({ queryKey: ["wallets"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
    ]);
}
