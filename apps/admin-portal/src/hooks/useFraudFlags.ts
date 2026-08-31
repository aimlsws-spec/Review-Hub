import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import type { FraudRiskLevel } from '@/types'
import { getApiErrorMessage } from '@/utils'

/** Fetches the paginated, filterable list of fraud flags. */
export function useFraudFlagsQuery(params: { page: number; limit: number; resolved?: boolean; riskLevel?: FraudRiskLevel | '' }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.FRAUD_FLAGS, params.page, params.resolved, params.riskLevel],
    queryFn: () => adminApi.listFraudFlags({ ...params, riskLevel: params.riskLevel || undefined }),
  })
}

/** Marks a fraud flag as resolved, refreshing the list on success. */
export function useResolveFraudFlagMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => adminApi.resolveFraudFlag(id),
    onSuccess: () => {
      toast.success('Fraud flag resolved')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FRAUD_FLAGS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
