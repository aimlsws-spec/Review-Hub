import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage } from '@/utils'

/** Fetches the paginated list of settlements across all merchants. */
export function useSettlementsQuery(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.SETTLEMENTS, params.page],
    queryFn: () => adminApi.listSettlements(params),
  })
}

/** Manually triggers settlement generation for a period (defaults to the prior UTC day). */
export function useGenerateSettlementsMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data?: { periodStart?: string; periodEnd?: string }) => adminApi.generateSettlements(data),
    onSuccess: () => {
      toast.success('Settlement generation triggered')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTLEMENTS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
