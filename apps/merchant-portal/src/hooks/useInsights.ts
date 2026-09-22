import { useQuery } from '@tanstack/react-query'

import { merchantApi } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'
import { requireValue } from '@/utils'

/** What this merchant's campaigns cost per completed task, with suggestions (DashboardPage). */
export function useMerchantInsightsQuery(merchantId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEYS.DASHBOARD, merchantId, 'insights'],
    queryFn: async () => (await merchantApi.getInsights(requireValue(merchantId, 'merchantId'))).data.data,
    enabled: !!merchantId,
    // The numbers move slowly; refetching on every focus would only cost database work.
    staleTime: 5 * 60 * 1000,
  })
}
