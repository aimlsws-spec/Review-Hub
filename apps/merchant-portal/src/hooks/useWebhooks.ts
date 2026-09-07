import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { merchantApi } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage } from '@/utils'

export function useWebhooksQuery(merchantId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.WEBHOOKS,
    queryFn: () => merchantApi.listWebhooks(merchantId!),
    enabled: !!merchantId,
  })
}

export function useWebhookDeliveriesQuery(merchantId: string | undefined, webhookId: string, params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.WEBHOOK_DELIVERIES, webhookId, params.page],
    queryFn: () => merchantApi.listWebhookDeliveries(merchantId!, webhookId, params),
    enabled: !!merchantId && !!webhookId,
  })
}

export function useCreateWebhookMutation(merchantId: string | undefined, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { url: string; events: string[]; enabled?: boolean }) => merchantApi.createWebhook(merchantId!, data),
    onSuccess: () => {
      toast.success('Webhook created')
      qc.invalidateQueries({ queryKey: QUERY_KEYS.WEBHOOKS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

export function useUpdateWebhookMutation(merchantId: string | undefined, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ webhookId, data }: { webhookId: string; data: Partial<{ url: string; events: string[]; enabled: boolean }> }) =>
      merchantApi.updateWebhook(merchantId!, webhookId, data),
    onSuccess: () => {
      toast.success('Webhook updated')
      qc.invalidateQueries({ queryKey: QUERY_KEYS.WEBHOOKS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

export function useDeleteWebhookMutation(merchantId: string | undefined, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (webhookId: string) => merchantApi.deleteWebhook(merchantId!, webhookId),
    onSuccess: () => {
      toast.success('Webhook removed')
      qc.invalidateQueries({ queryKey: QUERY_KEYS.WEBHOOKS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
