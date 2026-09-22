import { useMutation } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { merchantApi, type RecommendCampaignInput } from '@/api/merchant.api'
import { getApiErrorMessage, requireValue } from '@/utils'

/** Asks the campaign builder for a draft. It only reads; nothing is created on the server. */
export function useCampaignRecommendation(merchantId: string | undefined) {
  return useMutation({
    mutationFn: async (input: RecommendCampaignInput) => (await merchantApi.recommendCampaign(requireValue(merchantId, 'merchantId'), input)).data.data,
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
