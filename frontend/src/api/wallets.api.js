import { useQuery } from "@tanstack/react-query";
import api from "./api";

// ---------- requests ---------- :)
const getWalletTransactions = async (walletId) =>
  (await api.get(`/wallets/${walletId}/transactions`)).data;

// ---------- hooks ---------- :)
export function useWalletTransactions(walletId) {
  return useQuery({
    queryKey: ["transactions", "wallet", walletId],
    queryFn: () => getWalletTransactions(walletId),
    enabled: !!walletId, // don't call the API until we have a wallet id
  });
}
