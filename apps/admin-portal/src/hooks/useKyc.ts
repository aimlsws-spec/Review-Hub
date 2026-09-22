import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import type { KycDocumentType, KycStatus } from '@/types'
import { getApiErrorMessage, requireValue } from '@/utils'

/** Fetches the paginated, filterable KYC review queue. */
export function useKycDocumentsQuery(params: {
  page: number
  limit: number
  status?: KycStatus | ''
  documentType?: KycDocumentType | ''
  search?: string
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.KYC, 'list', params.page, params.status, params.documentType, params.search],
    queryFn: () =>
      adminApi.listKycDocuments({
        page: params.page,
        limit: params.limit,
        status: params.status || undefined,
        documentType: params.documentType || undefined,
        search: params.search || undefined,
      }),
  })
}

/** Fetches one document with its full number; disabled until a document is selected. */
export function useKycDocumentQuery(documentId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.KYC, 'detail', documentId],
    queryFn: () => adminApi.getKycDocument(requireValue(documentId, 'documentId')),
    enabled: !!documentId,
    // Identity data: always re-read it, and drop it from memory as soon as nobody is looking.
    gcTime: 0,
  })
}

/**
 * Loads a KYC file for inline viewing. The file endpoint needs the auth header, so the bytes are
 * fetched and shown through a temporary object URL, which is revoked as soon as the viewer closes.
 * Nothing is kept in the query cache (gcTime 0) because this is an identity document.
 */
export function useKycFileUrl(documentId: string | null, enabled = true) {
  const [file, setFile] = useState<{ url: string; mimeType: string } | null>(null)

  const query = useQuery({
    queryKey: [...QUERY_KEYS.KYC, 'file', documentId],
    queryFn: async () => (await adminApi.getKycDocumentFile(requireValue(documentId, 'documentId'))).data,
    enabled: !!documentId && enabled,
    gcTime: 0,
    staleTime: 0,
    retry: false,
  })

  const blob = query.data
  useEffect(() => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    setFile({ url, mimeType: blob.type })
    return () => {
      URL.revokeObjectURL(url)
      setFile(null)
    }
  }, [blob])

  return { url: file?.url ?? null, mimeType: file?.mimeType ?? '', isLoading: query.isLoading, isError: query.isError }
}

/** Approves a document. The user is notified and, for a PAN, withdrawals unlock for them. */
export function useApproveKycMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentId: string) => adminApi.approveKycDocument(documentId),
    onSuccess: () => {
      toast.success('Document approved')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.KYC })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Rejects a document with a reason, which is shown to the user so they know what to fix. */
export function useRejectKycMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ documentId, reason }: { documentId: string; reason: string }) =>
      adminApi.rejectKycDocument(documentId, reason),
    onSuccess: () => {
      toast.success('Document rejected')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.KYC })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
