import api from "./api"
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query"

export const useLedger = (page = 1, limit = 20) =>
  useQuery({
    queryKey: ['ledger', page, limit],
    queryFn: () => api.get('/ledger', { params: { page, limit } }).then((r) => r.data),
  });

export const useTeamLedger = (page = 1, limit = 20) =>
  useQuery({
    queryKey: ['team-ledger', page, limit],
    queryFn: () => api.get('/ledger/team', { params: { page, limit } }).then((r) => r.data),
  });

export const useCreateLedgerEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post('/ledger', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ledger'] }),
  });
};

export const useImportLedger = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post('/ledger/import', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ledger'] }),
  });
};