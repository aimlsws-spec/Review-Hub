import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage } from '@/utils'

/** Fetches the paginated queue of withdrawal requests awaiting approval. */
export function useWithdrawalQueueQuery(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.WITHDRAWAL_QUEUE, params.page],
    queryFn: () => adminApi.listPendingWithdrawals(params),
  })
}

/** Approves a withdrawal request, refreshing the queue on success. */
export function useApproveWithdrawalMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => adminApi.approveWithdrawal(id),
    onSuccess: () => {
      toast.success('Withdrawal approved')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WITHDRAWAL_QUEUE })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Rejects a withdrawal request, refreshing the queue on success. */
export function useRejectWithdrawalMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.rejectWithdrawal(id, reason),
    onSuccess: () => {
      toast.success('Withdrawal rejected')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WITHDRAWAL_QUEUE })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
