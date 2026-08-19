import { useQuery } from '@tanstack/react-query'
import { merchantApi } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'

/** Top-level dashboard stats for a merchant (DashboardPage). */
export function useDashboardStatsQuery(merchantId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEYS.DASHBOARD, merchantId],
    queryFn: () => merchantApi.getDashboard(merchantId!),
    enabled: !!merchantId,
  })
}
