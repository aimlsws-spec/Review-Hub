import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage, requireValue } from '@/utils'

/** Tax kept back from user payouts in a financial year, with totals. An empty year means the current one. */
export function useTdsQuery(params: { financialYear?: string; status?: string; page: number; limit: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.TDS, params.financialYear, params.status, params.page],
    queryFn: () => adminApi.listTds({ ...params, financialYear: params.financialYear || undefined, status: params.status || undefined }),
  })
}

/** Downloads a financial year of deductions as a CSV file. It needs the auth header, so it is not a plain link. */
export function useExportTdsMutation() {
  return useMutation({
    mutationFn: async (financialYear?: string) => {
      const res = await adminApi.exportTds(financialYear || undefined)
      const url = URL.createObjectURL(res.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `tds-${financialYear || 'current'}.csv`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

export function useInvoicesQuery(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.INVOICES, 'list', params.page],
    queryFn: () => adminApi.listInvoices(params),
  })
}

/** The credit and debit notes issued against one invoice. */
export function useInvoiceNotesQuery(invoiceId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.INVOICES, 'notes', invoiceId],
    queryFn: () => adminApi.listInvoiceNotes(requireValue(invoiceId, 'invoiceId')),
    enabled: !!invoiceId,
  })
}

/** Issues a credit or debit note. A tax document only: no money moves. */
export function useIssueInvoiceNoteMutation(invoiceId: string, onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { type: 'CREDIT' | 'DEBIT'; taxableAmount: number; reason: string }) => adminApi.issueInvoiceNote(invoiceId, data),
    onSuccess: (res) => {
      toast.success(`${res.data.data.noteNumber} issued`)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INVOICES })
      onSuccess?.()
    },
    // "At most ₹400.00 more" and the like come back as plain messages, which is what the admin needs to read.
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
