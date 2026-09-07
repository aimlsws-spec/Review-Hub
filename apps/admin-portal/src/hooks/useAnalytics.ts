import { useQuery } from '@tanstack/react-query'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'

/** Fetches the paginated list of raw analytics events, optionally filtered. */
export function useAnalyticsEventsQuery(params: { page: number; limit: number; eventName?: string; eventCategory?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ANALYTICS_EVENTS, params],
    queryFn: () => adminApi.listAnalyticsEvents(params),
  })
}

/** Fetches daily platform analytics for a date range. */
export function useDailyAnalyticsQuery(from: string, to: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.DAILY_ANALYTICS, from, to],
    queryFn: () => adminApi.getDailyAnalytics(from, to),
    enabled: !!from && !!to,
  })
}

/** Fetches aggregate analytics for one merchant. Disabled until a merchant id is provided. */
export function useMerchantAnalyticsQuery(merchantId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.MERCHANT_ANALYTICS, merchantId],
    queryFn: () => adminApi.getMerchantAnalytics(merchantId),
    enabled: !!merchantId,
  })
}

/** Fetches aggregate analytics for one user. Disabled until a user id is provided. */
export function useUserAnalyticsQuery(userId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.USER_ANALYTICS, userId],
    queryFn: () => adminApi.getUserAnalytics(userId),
    enabled: !!userId,
  })
}
