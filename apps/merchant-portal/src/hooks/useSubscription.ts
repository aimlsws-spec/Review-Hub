import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { merchantApi } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'
import { useAuthStore } from '@/stores/auth.store'
import { getApiErrorMessage, requireValue } from '@/utils'

/** The merchant's plan, the plans on offer and the price of featuring a campaign. */
export function useSubscriptionQuery() {
  const merchantId = useAuthStore((s) => s.merchant?.id)
  return useQuery({
    queryKey: QUERY_KEYS.SUBSCRIPTION,
    queryFn: () => merchantApi.getSubscription(requireValue(merchantId, 'merchantId')),
    enabled: !!merchantId,
  })
}

/**
 * Subscribing and featuring take money from the wallet, so both refresh the wallet as well as the plan. A refusal
 * (e.g. not enough in the wallet) is shown as the server worded it.
 */
export function useSubscriptionMutations() {
  const merchantId = useAuthStore((s) => s.merchant?.id)
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.SUBSCRIPTION })
    qc.invalidateQueries({ queryKey: QUERY_KEYS.WALLET })
  }
  const id = () => requireValue(merchantId, 'merchantId')
  const onError = (err: unknown) => toast.error(getApiErrorMessage(err))

  const subscribe = useMutation({
    mutationFn: (planId: string) => merchantApi.subscribe(id(), planId),
    onSuccess: () => {
      toast.success('You are subscribed')
      refresh()
    },
    onError,
  })
  const cancel = useMutation({
    mutationFn: () => merchantApi.cancelSubscription(id()),
    onSuccess: () => {
      toast.success('Your plan will not renew')
      refresh()
    },
    onError,
  })
  const resume = useMutation({
    mutationFn: () => merchantApi.resumeSubscription(id()),
    onSuccess: () => {
      toast.success('Your plan will renew')
      refresh()
    },
    onError,
  })
  const feature = useMutation({
    mutationFn: (campaignId: string) => merchantApi.featureCampaign(id(), campaignId),
    onSuccess: ({ data }) => {
      toast.success(data.data.includedInPlan ? 'Featured, included in your plan' : 'Campaign featured')
      refresh()
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS })
    },
    onError,
  })

  return { subscribe, cancel, resume, feature }
}
