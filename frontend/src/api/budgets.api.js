import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "./api";

// ---------- requests ----------

const getMonthlyBudget = async (month) =>
  (await api.get("/budgets", { params: { month } })).data;

const upsertBudgetItem = async (payload) =>
  (await api.put("/budgets/items", payload)).data;

const deleteBudgetItem = async (id) =>
  (await api.delete(`/budgets/items/${id}`)).data;

// ---------- hooks ----------

export function useMonthlyBudget(month) {
  return useQuery({
    queryKey: ["budgets", month],
    queryFn: () => getMonthlyBudget(month),
  });
}

export function useUpsertBudgetItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: upsertBudgetItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}

export function useDeleteBudgetItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBudgetItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}