import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./api";

// ---------- requests ---------- :)

const createTransaction = async (payload) =>
  (await api.post("/users/me/transactions", payload)).data;

// ---------- hooks ---------- :)

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}
