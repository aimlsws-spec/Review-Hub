import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import type { Campaign } from '@/types'
import { getApiErrorMessage } from '@/utils'

export type CampaignReviewKind = 'approve' | 'reject' | 'request-changes'

/** Fetches the paginated queue of campaigns awaiting moderation. */
export function useCampaignQueueQuery(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.CAMPAIGN_QUEUE, params.page],
    queryFn: () => adminApi.listPendingCampaigns(params),
  })
}

/** Approves, rejects, or requests changes on a campaign, refreshing the queue on success. */
export function useCampaignReviewMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ campaign, kind, note }: { campaign: Campaign; kind: CampaignReviewKind; note: string }) => {
      if (kind === 'approve') return adminApi.approveCampaign(campaign.id, note || undefined)
      if (kind === 'reject') return adminApi.rejectCampaign(campaign.id, note)
      return adminApi.requestCampaignChanges(campaign.id, note)
    },
    onSuccess: (_, { kind }) => {
      toast.success(kind === 'approve' ? 'Campaign approved' : kind === 'reject' ? 'Campaign rejected' : 'Changes requested')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGN_QUEUE })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
