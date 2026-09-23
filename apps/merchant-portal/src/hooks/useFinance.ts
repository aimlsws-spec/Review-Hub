import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { merchantApi } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage, requireValue } from '@/utils'

export function useSettlementsQuery(merchantId: string | undefined, params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.SETTLEMENTS, params.page],
    queryFn: () => merchantApi.getSettlements(requireValue(merchantId, 'merchantId'), params),
    enabled: !!merchantId,
  })
}

export function useInvoicesQuery(merchantId: string | undefined, params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.INVOICES, params.page],
    queryFn: () => merchantApi.getInvoices(requireValue(merchantId, 'merchantId'), params),
    enabled: !!merchantId,
  })
}

export function useInvoiceNotesQuery(merchantId: string | undefined, params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.INVOICE_NOTES, params.page],
    queryFn: () => merchantApi.getInvoiceNotes(requireValue(merchantId, 'merchantId'), params),
    enabled: !!merchantId,
  })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Downloads an invoice PDF. It needs the auth header, so it is not a plain link. */
export function useDownloadInvoiceMutation(merchantId: string | undefined) {
  return useMutation({
    mutationFn: async (invoice: { id: string; invoiceNumber: string }) => {
      const res = await merchantApi.downloadInvoice(requireValue(merchantId, 'merchantId'), invoice.id)
      downloadBlob(res.data, `${invoice.invoiceNumber}.pdf`)
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Downloads a credit/debit note PDF. It needs the auth header, so it is not a plain link. */
export function useDownloadInvoiceNoteMutation(merchantId: string | undefined) {
  return useMutation({
    mutationFn: async (note: { id: string; noteNumber: string }) => {
      const res = await merchantApi.downloadInvoiceNote(requireValue(merchantId, 'merchantId'), note.id)
      downloadBlob(res.data, `${note.noteNumber}.pdf`)
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
