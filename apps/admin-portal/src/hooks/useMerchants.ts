import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage } from '@/utils'
import type { Merchant } from '@/types'

export type MerchantReviewKind = 'approve' | 'reject' | 'request-documents'

/** Fetches merchants currently awaiting verification. */
export function usePendingMerchantsQuery(enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.MERCHANTS,
    queryFn: () => adminApi.listPendingMerchants(),
    enabled,
  })
}

/** Fetches the paginated, filterable list of all merchants. */
export function useAllMerchantsQuery(
  params: { page: number; limit: number; status?: string; search?: string },
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...QUERY_KEYS.MERCHANTS, 'all', params.page, params.status, params.search],
    queryFn: () => adminApi.listAllMerchants({ ...params, status: params.status || undefined, search: params.search || undefined }),
    enabled,
  })
}

/** Fetches a single merchant's full detail record, including KYC documents. */
export function useMerchantDetailQuery(merchantId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.MERCHANT_DETAIL, merchantId],
    queryFn: () => adminApi.getMerchantDetail(merchantId!),
    enabled: !!merchantId,
  })
}

/** Approves, rejects, or requests documents for a merchant, refreshing list/detail caches on success. */
export function useMerchantReviewMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MERCHANTS })
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MERCHANT_DETAIL })
  }

  return useMutation({
    mutationFn: ({ merchant, kind, note }: { merchant: Merchant; kind: MerchantReviewKind; note: string }) => {
      if (kind === 'approve') return adminApi.approveMerchant(merchant.id)
      if (kind === 'reject') return adminApi.rejectMerchant(merchant.id, note)
      return adminApi.requestMerchantDocuments(merchant.id, note || undefined)
    },
    onSuccess: (_, { kind }) => {
      toast.success(kind === 'approve' ? 'Merchant approved' : kind === 'reject' ? 'Merchant rejected' : 'Documents requested')
      invalidateAll()
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/**
 * Fetches a KYC document as a blob and opens it in a new tab. This can't be a
 * plain <a href> because the request needs an Authorization header, so it goes
 * through this mutation hook instead of being called from the component.
 */
export function useViewMerchantDocumentMutation() {
  return useMutation({
    mutationFn: async ({ merchantId, documentId }: { merchantId: string; documentId: string }) => {
      const res = await adminApi.getMerchantDocumentBlob(merchantId, documentId)
      const url = URL.createObjectURL(res.data)
      window.open(url, '_blank', 'noopener,noreferrer')
      // Revoke well after the new tab has had a chance to load the blob URL.
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
