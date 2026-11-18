import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import api from "./api";
import { FINANCIAL_SCENARIOS_KEY } from "./financial-health.api";

// ---------- requests ---------- :)
const getBaseline = async () => (await api.get("/financial-scenarios/baseline")).data;
const calculate = async (items) =>
  (await api.post("/financial-scenarios/calculate", { items })).data;
const listScenarios = async () => (await api.get("/financial-scenarios")).data;
const createScenario = async (body) => (await api.post("/financial-scenarios", body)).data;
const deleteScenario = async (id) => (await api.delete(`/financial-scenarios/${id}`)).data;

// ---------- hooks ---------- :)

// Actual figures + projection with no hypothetical changes.
export function useScenarioBaseline() {
  return useQuery({
    queryKey: [FINANCIAL_SCENARIOS_KEY, "baseline"],
    queryFn: getBaseline,
  });
}

// What-if result for the items on screen. Nothing is saved by this call.
export function useScenarioCalculation(items) {
  return useQuery({
    queryKey: [FINANCIAL_SCENARIOS_KEY, "calculate", items],
    queryFn: () => calculate(items),
    enabled: items.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useSavedScenarios() {
  return useQuery({
    queryKey: [FINANCIAL_SCENARIOS_KEY, "list"],
    queryFn: listScenarios,
  });
}

// Saving only refreshes the saved list. It deliberately does NOT refresh the
// Financial Health dashboard, because a scenario is not a real transaction.
export function useSaveScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createScenario,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [FINANCIAL_SCENARIOS_KEY, "list"] }),
  });
}

export function useDeleteScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteScenario,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [FINANCIAL_SCENARIOS_KEY, "list"] }),
  });
}
