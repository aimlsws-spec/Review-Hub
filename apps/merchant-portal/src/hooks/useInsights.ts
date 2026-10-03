import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { merchantApi } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage, requireValue } from '@/utils'

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

/** Suggestions the daily optimizer stored and the merchant has not dismissed, newest first. */
export function useSuggestionsQuery(merchantId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEYS.SUGGESTIONS, merchantId],
    queryFn: async () => (await merchantApi.listSuggestions(requireValue(merchantId, 'merchantId'))).data.data,
    enabled: !!merchantId,
  })
}

export function useDismissSuggestionMutation(merchantId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (suggestionId: string) => merchantApi.dismissSuggestion(requireValue(merchantId, 'merchantId'), suggestionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.SUGGESTIONS }),
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
