import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import type { AllCampaignsParams, Campaign } from '@/types'
import { getApiErrorMessage } from '@/utils'

export type CampaignReviewKind = 'approve' | 'reject' | 'request-changes'

/** Fetches the paginated queue of campaigns awaiting moderation. */
export function useCampaignQueueQuery(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.CAMPAIGN_QUEUE, params.page],
    queryFn: () => adminApi.listPendingCampaigns(params),
  })
}

/** Every merchant's campaigns in any status. Keeps the last page on screen while the next one loads. */
export function useAllCampaignsQuery(params: AllCampaignsParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ALL_CAMPAIGNS, params],
    queryFn: () => adminApi.listAllCampaigns(params),
    placeholderData: keepPreviousData,
  })
}

/** One campaign in full, for the detail view. */
export function useCampaignDetailQuery(campaignId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEYS.CAMPAIGN_QUEUE, 'detail', campaignId],
    queryFn: () => adminApi.getCampaignDetail(campaignId as string),
    enabled: !!campaignId,
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
