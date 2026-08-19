import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { merchantApi } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage } from '@/utils'
import type { SupportCategory, SupportPriority } from '@/types'

export function useSupportTicketsQuery(merchantId: string | undefined, page: number, limit: number) {
  return useQuery({
    queryKey: [...QUERY_KEYS.SUPPORT_TICKETS, page],
    queryFn: () => merchantApi.getTickets(merchantId!, { page, limit }),
    enabled: !!merchantId,
  })
}

export function useSupportTicketQuery(merchantId: string | undefined, ticketId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.SUPPORT_TICKETS, ticketId],
    queryFn: () => merchantApi.getTicket(merchantId!, ticketId!),
    enabled: !!merchantId && !!ticketId,
  })
}

interface CreateTicketInput {
  subject: string
  description: string
  category: SupportCategory
  priority: SupportPriority
}

export function useCreateTicketMutation(merchantId: string | undefined, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: CreateTicketInput) => merchantApi.createTicket(merchantId!, d),
    onSuccess: () => {
      toast.success('Ticket submitted')
      qc.invalidateQueries({ queryKey: QUERY_KEYS.SUPPORT_TICKETS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

export function useReplyToTicketMutation(merchantId: string | undefined, ticketId: string | null, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (message: string) => merchantApi.replyToTicket(merchantId!, ticketId!, message),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QUERY_KEYS.SUPPORT_TICKETS, ticketId] })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
