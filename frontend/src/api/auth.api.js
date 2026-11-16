import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./api";

// ---------- requests ---------- :)
async function loginRequest({ email, password }) {
  try {
    const { data } = await api.post("/auth/login", { email, password });
    return data;
  } catch (err) {
    const msg = err.response?.data?.message;
    throw new Error(
      Array.isArray(msg) ? msg[0] : msg || "Login failed. Please try again.",
      { cause: err },
    );
  }
}

async function logoutRequest() {
  await api.post("/auth/logout");
}

// ---------- hooks ---------- :)
export function useLogin() {
  return useMutation({ mutationFn: loginRequest });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      queryClient.clear(); // forget cached user and wallets
      window.location.href = "/login/";
    },
  });
}
