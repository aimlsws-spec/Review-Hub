import { useQuery } from '@tanstack/react-query'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'

/**
 * Fetches the four headline counters shown on the dashboard (pending campaigns,
 * pending withdrawals, unresolved fraud flags, total users). Each is requested
 * with limit:1 since only the `total` field is used.
 */
export function useDashboardStats() {
  const campaignQuery = useQuery({
    queryKey: [...QUERY_KEYS.CAMPAIGN_QUEUE, 'count'],
    queryFn: () => adminApi.listPendingCampaigns({ page: 1, limit: 1 }),
  })

  const withdrawalQuery = useQuery({
    queryKey: [...QUERY_KEYS.WITHDRAWAL_QUEUE, 'count'],
    queryFn: () => adminApi.listPendingWithdrawals({ page: 1, limit: 1 }),
  })

  const fraudQuery = useQuery({
    queryKey: [...QUERY_KEYS.FRAUD_FLAGS, 'count'],
    queryFn: () => adminApi.listFraudFlags({ page: 1, limit: 1, resolved: false }),
  })

  const usersQuery = useQuery({
    queryKey: [...QUERY_KEYS.USERS, 'count'],
    queryFn: () => adminApi.listUsers({ page: 1, limit: 1 }),
  })

  return {
    campaigns: { total: campaignQuery.data?.data.data.total, loading: campaignQuery.isLoading },
    withdrawals: { total: withdrawalQuery.data?.data.data.total, loading: withdrawalQuery.isLoading },
    fraudFlags: { total: fraudQuery.data?.data.data.total, loading: fraudQuery.isLoading },
    users: { total: usersQuery.data?.data.data.total, loading: usersQuery.isLoading },
  }
}
