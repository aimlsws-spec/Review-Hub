import { useQuery } from '@tanstack/react-query'

import { notificationApi } from '@/api/notification.api'
import { QUERY_KEYS } from '@/constants'

/** Recent notifications widget on the dashboard. */
export function useNotificationsQuery(params?: { limit?: number }) {
  return useQuery({
    queryKey: QUERY_KEYS.NOTIFICATIONS,
    queryFn: () => notificationApi.list(params),
  })
}
