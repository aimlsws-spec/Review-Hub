import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { merchantApi, type CreateReviewInput, type ReviewQueryParams } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'
import type { ApiReviewStatus } from '@/types/review'
import { requireValue } from '@/utils'

export function useReviewsQuery(merchantId: string | undefined, params: ReviewQueryParams, cacheTag?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.REVIEWS, merchantId, cacheTag ?? params],
    queryFn: () => merchantApi.getReviews(requireValue(merchantId, 'merchantId'), params),
    enabled: !!merchantId,
  })
}

/** Small "recent reviews" slice used by the dashboard widget. */
export function useRecentReviewsQuery(merchantId: string | undefined) {
  return useReviewsQuery(merchantId, { limit: 5, sort: 'newest' }, 'recent')
}

export function useReviewStatsQuery(merchantId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEYS.REVIEW_STATS, merchantId],
    queryFn: () => merchantApi.getReviewStats(requireValue(merchantId, 'merchantId')),
    enabled: !!merchantId,
  })
}

export function useReviewMutations(merchantId: string | undefined, options?: {
  onReplySuccess?: () => void
  onResolveSuccess?: () => void
  onCreateSuccess?: () => void
}) {
  const queryClient = useQueryClient()

  function invalidateReviews() {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REVIEWS })
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REVIEW_STATS })
  }

  const replyMutation = useMutation({
    mutationFn: ({ reviewId, text }: { reviewId: string; text: string }) =>
      merchantApi.replyToReview(requireValue(merchantId, 'merchantId'), reviewId, text),
    onSuccess: () => { invalidateReviews(); toast.success('Reply sent'); options?.onReplySuccess?.() },
    onError: () => toast.error('Failed to send reply'),
  })

  const resolveMutation = useMutation({
    mutationFn: (reviewId: string) => merchantApi.updateReviewStatus(requireValue(merchantId, 'merchantId'), reviewId, 'RESOLVED' as ApiReviewStatus),
    onSuccess: () => { invalidateReviews(); toast.success('Marked as resolved'); options?.onResolveSuccess?.() },
    onError: () => toast.error('Failed to update review'),
  })

  const createMutation = useMutation({
    mutationFn: (input: CreateReviewInput) => merchantApi.createReview(requireValue(merchantId, 'merchantId'), input),
    onSuccess: () => { invalidateReviews(); toast.success('Review logged'); options?.onCreateSuccess?.() },
    onError: () => toast.error('Failed to log review'),
  })

  return { replyMutation, resolveMutation, createMutation, invalidateReviews }
}
