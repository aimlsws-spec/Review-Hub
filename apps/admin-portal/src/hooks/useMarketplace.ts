import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage } from '@/utils'

export interface MarketplaceItemFormData {
  title: string
  description: string
  thumbnailUrl: string
  category: string
  costAmount: number
  stock: number | null
  sortOrder: number
  isActive: boolean
}

/** Fetches the paginated catalogue of marketplace items. */
export function useMarketplaceItemsQuery(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.MARKETPLACE_ITEMS, params.page],
    queryFn: () => adminApi.listMarketplaceItems(params),
  })
}

/** Fetches the paginated redemption history across all users. */
export function useRedemptionsQuery(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.REDEMPTIONS, params.page],
    queryFn: () => adminApi.listRedemptions(params),
  })
}

/** Creates or updates a marketplace item depending on whether `editingId` is provided. */
export function useSaveMarketplaceItemMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ editingId, form }: { editingId: string | null; form: MarketplaceItemFormData }) =>
      editingId
        ? adminApi.updateMarketplaceItem(editingId, { ...form, stock: form.stock ?? undefined })
        : adminApi.createMarketplaceItem({ ...form, stock: form.stock ?? undefined }),
    onSuccess: (_, { editingId }) => {
      toast.success(editingId ? 'Item updated' : 'Item created')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MARKETPLACE_ITEMS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Deletes a marketplace item. */
export function useDeleteMarketplaceItemMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => adminApi.deleteMarketplaceItem(id),
    onSuccess: () => {
      toast.success('Item deleted')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MARKETPLACE_ITEMS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
