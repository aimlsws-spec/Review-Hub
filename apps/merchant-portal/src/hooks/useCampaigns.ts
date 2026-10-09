import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { merchantApi, type CampaignFormInput, type CampaignUpdateInput } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'
import type { Campaign } from '@/types'
import { getApiErrorMessage, requireValue } from '@/utils'

interface CampaignsQueryParams {
  page?: number
  limit?: number
  status?: string
  campaignType?: string
}

/**
 * Campaign list for a merchant. `cacheTag` lets callers (e.g. SubmissionsPage, which
 * fetches campaigns for its filter) keep a distinct cache entry from
 * CampaignsPage's paginated/filtered view without colliding on query keys.
 */
export function useCampaignsQuery(merchantId: string | undefined, params: CampaignsQueryParams, cacheTag?: string) {
  return useQuery({
    queryKey: cacheTag ? [...QUERY_KEYS.CAMPAIGNS, cacheTag] : [...QUERY_KEYS.CAMPAIGNS, params.page, params.status],
    queryFn: () => merchantApi.getCampaigns(requireValue(merchantId, 'merchantId'), params),
    enabled: !!merchantId,
  })
}

export function useCampaignAnalyticsQuery(merchantId: string | undefined, campaignId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEYS.CAMPAIGNS, campaignId, 'analytics'],
    queryFn: () => merchantApi.getCampaignAnalytics(requireValue(merchantId, 'merchantId'), requireValue(campaignId, 'campaignId')),
    enabled: !!merchantId && !!campaignId,
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

/** Create/update, action (submit/activate/pause/resume/cancel), duplicate and delete mutations for campaigns. */
/** Uploads or removes a campaign's cover image, refreshing the campaign list after. */
export function useCampaignCoverMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS })

  const uploadCover = useMutation({
    mutationFn: ({ campaignId, file }: { campaignId: string; file: File }) => merchantApi.setCampaignCover(campaignId, file),
    onSuccess: () => {
      toast.success('Cover image saved')
      invalidate()
    },
    onError: (err) => toast.error(`The campaign was saved, but its cover image was not: ${getApiErrorMessage(err)}`),
  })

  const removeCover = useMutation({
    mutationFn: (campaignId: string) => merchantApi.removeCampaignCover(campaignId),
    onSuccess: () => {
      toast.success('Cover image removed')
      invalidate()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  return { uploadCover, removeCover }
}

export function useCampaignMutations(merchantId: string | undefined, options?: {
  editingId?: string | null
  onSaveSuccess?: () => void
  onActionSuccess?: (action: CampaignAction) => void
  onDeleteSuccess?: () => void
  onDuplicateSuccess?: (copy: Campaign) => void
}) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS })

  const saveMutation = useMutation({
    mutationFn: (input: CampaignFormInput | CampaignUpdateInput) =>
      options?.editingId
        ? merchantApi.updateCampaign(options.editingId, input)
        : merchantApi.createCampaign(requireValue(merchantId, 'merchantId'), input as CampaignFormInput),
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

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => merchantApi.duplicateCampaign(id),
    onSuccess: (res) => {
      toast.success('Campaign copied as a new draft. Set its dates, then submit it for review.')
      invalidate()
      options?.onDuplicateSuccess?.(res.data.data)
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  return { saveMutation, actionMutation, deleteMutation, duplicateMutation }
}
