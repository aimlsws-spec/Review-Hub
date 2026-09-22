import { useQuery } from '@tanstack/react-query'

import { merchantApi } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'
import { requireValue } from '@/utils'

/** How this merchant's campaigns are doing over the last `days` days. */
export function useAnalyticsOverviewQuery(merchantId: string | undefined, days: number) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ANALYTICS, merchantId, days],
    queryFn: async () => (await merchantApi.getAnalyticsOverview(requireValue(merchantId, 'merchantId'), days)).data.data,
    enabled: !!merchantId,
    // Rewards are paid in the background and the figures move slowly; refetching on every focus would only cost database work.
    staleTime: 60 * 1000,
  })
}
