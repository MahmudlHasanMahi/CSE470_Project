import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import api from "./api";

// ---------- requests ----------

const getWalletTransactions = async (walletId) =>
  (await api.get(`/wallets/${walletId}/transactions`)).data;

const getWalletById = async (walletId) =>
  (await api.get(`/wallets/${walletId}`)).data;

const getExternalAccountById = async (accountId) =>
  (await api.get(`/wallets/external-accounts/${accountId}`)).data;

export const createExternalAccount = async (data) => {
  const response = await api.post("/wallets/external-accounts", data);
  return response.data;
};

// ---------- hooks ----------

export function useWalletTransactions(walletId) {
  return useQuery({
    queryKey: ["transactions", "wallet", walletId],
    queryFn: () => getWalletTransactions(walletId),
    enabled: !!walletId,
  });
}

export function useWallet(walletId) {
  return useQuery({
    queryKey: ["wallet", walletId],
    queryFn: () => getWalletById(walletId),
    enabled: !!walletId,
    retry: false,
  });
}

export function useExternalAccount(accountId) {
  return useQuery({
    queryKey: ["externalAccount", accountId],
    queryFn: () => getExternalAccountById(accountId),
    enabled: !!accountId,
    retry: false,
  });
}

export function useCreateExternalAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createExternalAccount,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["externalAccount"],
      });
    },
  });
}
