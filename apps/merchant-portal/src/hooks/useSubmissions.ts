import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'

import { merchantApi } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'
import type { SubmissionStatus } from '@/types'
import { getApiErrorMessage, requireValue } from '@/utils'

interface SubmissionsQueryParams {
  page: number
  limit: number
  status?: SubmissionStatus
  campaignId?: string
}

/** The submissions to the merchant's campaigns, filtered by status and campaign. */
export function useSubmissionsQuery(merchantId: string | undefined, params: SubmissionsQueryParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.SUBMISSIONS, merchantId, params],
    queryFn: () => merchantApi.getSubmissions(requireValue(merchantId, 'merchantId'), params),
    enabled: !!merchantId,
  })
}

/**
 * A blob URL for a submission's proof file, so an <img> or <video> can show it (the file needs the merchant's
 * sign-in, which a plain src would not send). Released when the submission changes or the reviewer closes it.
 */
export function useSubmissionEvidenceUrl(merchantId: string | undefined, submissionId: string | undefined, hasFile: boolean) {
  const { data, isLoading, isError } = useQuery({
    queryKey: [...QUERY_KEYS.SUBMISSIONS, merchantId, submissionId, 'evidence'],
    queryFn: () => merchantApi.getSubmissionEvidence(requireValue(merchantId, 'merchantId'), requireValue(submissionId, 'submissionId')),
    enabled: !!merchantId && !!submissionId && hasFile,
    staleTime: Infinity,
  })
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const blob = data?.data
    if (!blob) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [data])

  return { url, isLoading: hasFile && isLoading, isError }
}

/** Approve and reject. Both refresh the list, so a decided submission leaves the "waiting" view. */
export function useSubmissionDecisions(merchantId: string | undefined, options?: { onDecided?: () => void }) {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: QUERY_KEYS.SUBMISSIONS })

  const approveMutation = useMutation({
    mutationFn: (submissionId: string) => merchantApi.approveSubmission(requireValue(merchantId, 'merchantId'), submissionId),
    onSuccess: () => {
      toast.success('Approved. The reward is on its way to the participant.')
      refresh()
      options?.onDecided?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ submissionId, reason }: { submissionId: string; reason: string }) =>
      merchantApi.rejectSubmission(requireValue(merchantId, 'merchantId'), submissionId, reason),
    onSuccess: () => {
      toast.success('Rejected. The participant will see your reason.')
      refresh()
      options?.onDecided?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  return { approveMutation, rejectMutation }
}
