import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { authApi } from '@/api/auth.api'
import { QUERY_KEYS } from '@/constants'

/** The legal documents in force and whether the signed-in person accepted them. */
export function usePolicyStatus(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.POLICIES,
    queryFn: async () => (await authApi.getPolicies()).data.data,
    enabled,
  })
}

/** Accepts the current version of every policy, then refreshes the status so the gate closes. */
export function useAcceptPoliciesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authApi.acceptPolicies(),
    onSuccess: (res) => queryClient.setQueryData(QUERY_KEYS.POLICIES, res.data.data),
  })
}

/** One published legal page, loaded only while it is being shown. */
export function useContentPage(slug: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.CONTENT_PAGE, slug],
    queryFn: async () => (await authApi.getPage(slug as string)).data.data,
    enabled: slug !== null,
    // A page nobody has published is a 404 that a retry will not fix.
    retry: false,
  })
}
