import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage } from '@/utils'

/** Fetches the paginated queue of merchant refund requests awaiting approval. */
export function useRefundQueueQuery(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.REFUND_QUEUE, params.page],
    queryFn: () => adminApi.listPendingRefunds(params),
  })
}

/** Approves a refund request, refreshing the queue on success. */
export function useApproveRefundMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => adminApi.approveRefund(id),
    onSuccess: () => {
      toast.success('Refund approved')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REFUND_QUEUE })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Rejects a refund request, refreshing the queue on success. */
export function useRejectRefundMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.rejectRefund(id, reason),
    onSuccess: () => {
      toast.success('Refund rejected')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REFUND_QUEUE })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
