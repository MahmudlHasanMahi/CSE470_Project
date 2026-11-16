import { useQuery } from "@tanstack/react-query";
import api from "./api";

// ---------- requests ---------- :)
const getMe = async () => (await api.get("/users/me")).data;
const getMyWallets = async () => (await api.get("/users/me/wallets")).data;
const getMyTransactions = async () =>
  (await api.get("/users/me/transactions")).data;

// ---------- hooks ---------- :)
export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: getMe });
}

export function useGetMyWallets() {
  return useQuery({ queryKey: ["wallets", "me"], queryFn: getMyWallets });
}

export function useGetMyTransactions() {
  return useQuery({
    queryKey: ["transactions", "me"],
    queryFn: getMyTransactions,
  });
}