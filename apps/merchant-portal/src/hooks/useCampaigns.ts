import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { merchantApi, type CampaignFormInput } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage } from '@/utils'

interface CampaignsQueryParams {
  page?: number
  limit?: number
  status?: string
  campaignType?: string
}

/**
 * Campaign list for a merchant. `cacheTag` lets callers (e.g. CouponsPage, which
 * fetches all campaigns and filters client-side) keep a distinct cache entry from
 * CampaignsPage's paginated/filtered view without colliding on query keys.
 */
export function useCampaignsQuery(merchantId: string | undefined, params: CampaignsQueryParams, cacheTag?: string) {
  return useQuery({
    queryKey: cacheTag ? [...QUERY_KEYS.CAMPAIGNS, cacheTag] : [...QUERY_KEYS.CAMPAIGNS, params.page, params.status],
    queryFn: () => merchantApi.getCampaigns(merchantId!, params),
    enabled: !!merchantId,
  })
}

type CampaignAction = 'submit' | 'activate' | 'pause' | 'resume' | 'cancel'

const ACTION_MESSAGES: Record<CampaignAction, string> = {
  submit: 'Campaign submitted for review',
  activate: 'Campaign activated',
  pause: 'Campaign paused',
  resume: 'Campaign resumed',
  cancel: 'Campaign cancelled',
}

function runCampaignAction(id: string, action: CampaignAction) {
  if (action === 'submit') return merchantApi.submitCampaign(id)
  if (action === 'activate') return merchantApi.activateCampaign(id)
  if (action === 'pause') return merchantApi.pauseCampaign(id)
  if (action === 'resume') return merchantApi.resumeCampaign(id)
  return merchantApi.cancelCampaign(id)
}

/** Create/update, action (submit/activate/pause/resume/cancel), and delete mutations for campaigns. */
export function useCampaignMutations(merchantId: string | undefined, options?: {
  editingId?: string | null
  onSaveSuccess?: () => void
  onActionSuccess?: (action: CampaignAction) => void
  onDeleteSuccess?: () => void
}) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS })

  const saveMutation = useMutation({
    mutationFn: (input: CampaignFormInput) =>
      options?.editingId
        ? merchantApi.updateCampaign(options.editingId, input)
        : merchantApi.createCampaign(merchantId!, input),
    onSuccess: () => {
      toast.success(options?.editingId ? 'Campaign updated' : 'Campaign created as a draft')
      invalidate()
      options?.onSaveSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const actionMutation = useMutation({
    mutationFn: (params: { id: string; action: CampaignAction }) => runCampaignAction(params.id, params.action),
    onSuccess: (_, { action }) => {
      toast.success(ACTION_MESSAGES[action])
      invalidate()
      options?.onActionSuccess?.(action)
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => merchantApi.deleteCampaign(id),
    onSuccess: () => {
      toast.success('Campaign deleted')
      invalidate()
      options?.onDeleteSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  return { saveMutation, actionMutation, deleteMutation }
}
