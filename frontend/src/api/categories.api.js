import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "./api";

// ---------- requests ----------

const getCategories = async (type) =>
  (await api.get("/categories", { params: type ? { type } : undefined })).data;

const createCategory = async (payload) =>
  (await api.post("/categories", payload)).data;

const deleteCategory = async (id) =>
  (await api.delete(`/categories/${id}`)).data;

// ---------- hooks ----------

export function useCategories(type) {
  return useQuery({
    queryKey: ["categories", type || "all"],
    queryFn: () => getCategories(type),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}