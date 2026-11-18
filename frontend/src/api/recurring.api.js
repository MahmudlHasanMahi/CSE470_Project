import api from './api'
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query"

export const useRecurring = () =>
  useQuery({ queryKey: ['recurring'], queryFn: () => api.get('/recurring-payments').then((r) => r.data) });

export const useCreateRecurring = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post('/recurring-payments', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  });
};

export const useSetRecurringStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api.patch(`/recurring-payments/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  });
};
