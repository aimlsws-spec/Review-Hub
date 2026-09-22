import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import type { AudienceFilter, BroadcastStatus, CreateBroadcastPayload, NotificationTemplatePayload } from '@/types'
import { getApiErrorMessage, requireValue } from '@/utils'

/** Fetches the paginated list of broadcasts, newest first. */
export function useBroadcastsQuery(params: { page: number; limit: number; status?: BroadcastStatus | '' }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.BROADCASTS, 'list', params.page, params.status],
    queryFn: () => adminApi.listBroadcasts({ page: params.page, limit: params.limit, status: params.status || undefined }),
  })
}

/** One broadcast with its per-channel delivery counts. Refreshes on its own while it is being sent. */
export function useBroadcastQuery(broadcastId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.BROADCASTS, 'detail', broadcastId],
    queryFn: () => adminApi.getBroadcast(requireValue(broadcastId, 'broadcastId')),
    enabled: !!broadcastId,
    refetchInterval: (query) => (query.state.data?.data.data.status === 'SENDING' ? 3000 : false),
  })
}

/**
 * How many users a set of filters would reach. The previous answer stays on screen while the next one
 * loads, so the number does not flicker to nothing on every change.
 */
export function useAudiencePreviewQuery(audience: AudienceFilter, enabled = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AUDIENCE, 'preview', audience],
    queryFn: () => adminApi.previewAudience(audience),
    enabled,
    placeholderData: keepPreviousData,
  })
}

/** States with their cities, for the audience pickers. They change rarely, so they are cached for a while. */
export function useAudienceLocationsQuery() {
  return useQuery({
    queryKey: [...QUERY_KEYS.AUDIENCE, 'locations'],
    queryFn: () => adminApi.listAudienceLocations(),
    staleTime: 10 * 60 * 1000,
  })
}

/** Sends a broadcast now or schedules it. */
export function useCreateBroadcastMutation(onSuccess?: (scheduled: boolean) => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateBroadcastPayload) => adminApi.createBroadcast(payload),
    onSuccess: (_, payload) => {
      const scheduled = !!payload.scheduledAt
      toast.success(scheduled ? 'Broadcast scheduled' : 'Broadcast is being sent')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BROADCASTS })
      onSuccess?.(scheduled)
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Cancels a broadcast that has not started sending yet. */
export function useCancelBroadcastMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (broadcastId: string) => adminApi.cancelBroadcast(broadcastId),
    onSuccess: () => {
      toast.success('Broadcast cancelled')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BROADCASTS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

export function useNotificationTemplatesQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.NOTIFICATION_TEMPLATES,
    queryFn: () => adminApi.listNotificationTemplates(),
  })
}

export function useCreateTemplateMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: NotificationTemplatePayload) => adminApi.createNotificationTemplate(payload),
    onSuccess: () => {
      toast.success('Template created')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATION_TEMPLATES })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

export function useUpdateTemplateMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, payload }: { templateId: string; payload: Partial<NotificationTemplatePayload> }) =>
      adminApi.updateNotificationTemplate(templateId, payload),
    onSuccess: () => {
      toast.success('Template updated')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATION_TEMPLATES })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

export function useDeleteTemplateMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) => adminApi.deleteNotificationTemplate(templateId),
    onSuccess: () => {
      toast.success('Template deleted')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATION_TEMPLATES })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
