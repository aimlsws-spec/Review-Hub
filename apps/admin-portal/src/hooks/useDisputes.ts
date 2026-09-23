import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import type { DisputeDecision, DisputeStatus } from '@/types'
import { getApiErrorMessage } from '@/utils'

export function useDisputesQuery(params: { page: number; limit: number; status?: DisputeStatus | '' }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.DISPUTES, params.page, params.status],
    queryFn: () => adminApi.listDisputes({ ...params, status: params.status || undefined }),
  })
}

export function useResolveDisputeMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ disputeId, decision, notes }: { disputeId: string; decision: DisputeDecision; notes?: string }) =>
      adminApi.resolveDispute(disputeId, { decision, notes }),
    onSuccess: () => {
      toast.success('Dispute resolved')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DISPUTES })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
