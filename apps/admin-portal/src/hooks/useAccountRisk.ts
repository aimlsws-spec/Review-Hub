import { useQuery } from '@tanstack/react-query'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import { requireValue } from '@/utils'

/**
 * How risky a user's account looks: device risk, linked accounts and the reputation of their recent IP
 * addresses. Linked accounts and IP history are sensitive, so nothing is kept in memory once the panel closes.
 */
export function useAccountRiskQuery(userId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ACCOUNT_RISK, userId],
    queryFn: () => adminApi.getAccountRisk(requireValue(userId, 'userId')),
    enabled: !!userId,
    gcTime: 0,
  })
}
