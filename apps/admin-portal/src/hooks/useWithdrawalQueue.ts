import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

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

/** Fetches approved withdrawals waiting for someone to send the money and record the bank reference. */
export function useAwaitingPayoutQuery(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.WITHDRAWAL_QUEUE, 'awaiting-payout', params.page],
    queryFn: () => adminApi.listAwaitingPayout(params),
  })
}

/** Records that the money was sent by bank transfer, with the bank's reference. */
export function useMarkWithdrawalPaidMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reference, note }: { id: string; reference: string; note?: string }) =>
      adminApi.markWithdrawalPaid(id, { reference, note }),
    onSuccess: () => {
      toast.success('Marked as paid')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WITHDRAWAL_QUEUE })
      onSuccess?.()
    },
    // A reference that was already used comes back as a plain message, which is what the admin needs to read.
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Records that the money could not be sent; it goes back to the user's available balance. */
export function useMarkWithdrawalFailedMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.markWithdrawalFailed(id, reason),
    onSuccess: () => {
      toast.success('Marked as failed. The money is back in the user\'s wallet')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WITHDRAWAL_QUEUE })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
