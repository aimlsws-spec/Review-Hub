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

/** Fetches the paginated list of devices flagged by basic risk signals, riskiest first. */
export function useHighRiskDevicesQuery(params: { page: number; limit: number; minRiskScore: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.HIGH_RISK_DEVICES, params.page, params.minRiskScore],
    queryFn: () => adminApi.listHighRiskDevices(params),
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

/**
 * Claws back a flagged submission's reward and restores the merchant's
 * campaign budget in full. Refreshes both the fraud flag list and reward
 * queries, since a reversal changes reward status on the user/merchant side too.
 */
export function useReverseRewardMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ flagId, reason }: { flagId: string; reason: string }) => adminApi.reverseReward(flagId, reason),
    onSuccess: () => {
      toast.success('Reward reversed')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FRAUD_FLAGS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
