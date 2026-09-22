import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import type { Merchant } from '@/types'
import { getApiErrorMessage, requireValue } from '@/utils'

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
    queryFn: () => adminApi.getMerchantDetail(requireValue(merchantId, 'merchantId')),
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

/** The bank transfers recorded as wallet top-ups for a merchant, newest first. */
export function useMerchantTopUpsQuery(merchantId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.MERCHANT_TOP_UPS, merchantId],
    queryFn: () => adminApi.listMerchantTopUps(requireValue(merchantId, 'merchantId'), { page: 1, limit: 5 }),
    enabled: !!merchantId,
  })
}

/** Records a bank transfer and adds it to the merchant's wallet. */
export function useRecordTopUpMutation(merchantId: string, onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { amount: number; bankReference: string; receivedOn: string; note?: string }) =>
      adminApi.recordMerchantTopUp(merchantId, data),
    onSuccess: (res) => {
      // A large amount is only recorded: another admin has to approve it before any money moves.
      toast.success(res.data.data.status === 'PENDING_APPROVAL' ? 'Recorded. Another admin has to approve it before the money is added.' : 'Money added to the merchant wallet')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MERCHANT_TOP_UPS })
      onSuccess?.()
    },
    // A reference that was already used comes back as a plain message, which is exactly what the admin needs to read.
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Large top-ups waiting for a second admin, across all merchants. */
export function useTopUpApprovalsQuery(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.MERCHANT_TOP_UPS, 'pending', params.page],
    queryFn: () => adminApi.listPendingTopUps(params),
  })
}

export type TopUpDecision = 'approve' | 'reject' | 'reverse'

const DECISION_MESSAGES: Record<TopUpDecision, string> = {
  approve: 'Approved. The money has been added to the wallet',
  reject: 'Rejected. Nothing was added',
  reverse: 'Reversed. The money was taken back out of the wallet',
}

/** Approves or rejects a large top-up, or reverses one made in error, refreshing the lists afterwards. */
export function useTopUpDecisionMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, decision, reason }: { id: string; decision: TopUpDecision; reason?: string }) => {
      if (decision === 'approve') return adminApi.approveTopUp(id)
      if (decision === 'reject') return adminApi.rejectTopUp(id, requireValue(reason, 'reason'))
      return adminApi.reverseTopUp(id, requireValue(reason, 'reason'))
    },
    onSuccess: (_, { decision }) => {
      toast.success(DECISION_MESSAGES[decision])
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MERCHANT_TOP_UPS })
      onSuccess?.()
    },
    // "Only ₹500.00 of this is still available" and "you recorded this, so a different admin has to approve it" come back as
    // plain messages, which is exactly what the admin needs to read.
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
