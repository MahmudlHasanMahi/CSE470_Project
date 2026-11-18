import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "./api";

// ---------- requests ---------- :)

const createTransaction = async (payload) =>
  (await api.post("/users/me/transactions", payload)).data;

const getExpenseAnalytics = async (month) =>
  (await api.get("/users/me/transactions/analytics", { params: { month } }))
    .data;

// ---------- hooks ---------- :)

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}

export function useExpenseAnalytics(month) {
  return useQuery({
    queryKey: ["transactions", "analytics", month],
    queryFn: () => getExpenseAnalytics(month),
  });
}