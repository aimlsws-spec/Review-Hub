import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import type { BadgeCriteriaType } from '@/types'
import { getApiErrorMessage } from '@/utils'

export interface BadgeFormData {
  code: string
  name: string
  description: string
  iconUrl?: string
  criteriaType: BadgeCriteriaType
  criteriaValue: number
  isActive: boolean
}

/** Fetches the paginated list of badges. */
export function useBadgesQuery(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.BADGES, params.page],
    queryFn: () => adminApi.listBadges(params),
  })
}

/** Creates or updates a badge depending on whether `editingId` is provided. */
export function useSaveBadgeMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ editingId, form }: { editingId: string | null; form: BadgeFormData }) =>
      editingId
        ? adminApi.updateBadge(editingId, form)
        : adminApi.createBadge(form),
    onSuccess: (_, { editingId }) => {
      toast.success(editingId ? 'Badge updated' : 'Badge created')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BADGES })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Deletes a badge. */
export function useDeleteBadgeMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => adminApi.deleteBadge(id),
    onSuccess: () => {
      toast.success('Badge deleted')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BADGES })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
