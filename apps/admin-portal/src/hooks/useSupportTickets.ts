import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage } from '@/utils'
import type { SupportTicketStatus } from '@/types'

/** Fetches the paginated, filterable list of support tickets. */
export function useSupportTicketsQuery(params: { page: number; limit: number; status?: SupportTicketStatus | '' }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.SUPPORT_TICKETS, params.page, params.status],
    queryFn: () => adminApi.listSupportTickets({ ...params, status: params.status || undefined }),
  })
}

/** Fetches a single support ticket's full detail, including its message thread. */
export function useSupportTicketDetailQuery(ticketId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.SUPPORT_TICKETS, ticketId],
    queryFn: () => adminApi.getSupportTicket(ticketId!),
    enabled: !!ticketId,
  })
}

/** Posts a reply (or internal note) on a ticket, refreshing detail and list caches on success. */
export function useReplySupportTicketMutation(ticketId: string | null, onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ message, internalNote }: { message: string; internalNote: boolean }) =>
      adminApi.replySupportTicket(ticketId!, message, internalNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.SUPPORT_TICKETS, ticketId] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUPPORT_TICKETS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Updates a ticket's status, refreshing detail and list caches on success. */
export function useUpdateSupportTicketStatusMutation(ticketId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (status: SupportTicketStatus) => adminApi.updateSupportTicketStatus(ticketId!, status),
    onSuccess: () => {
      toast.success('Status updated')
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.SUPPORT_TICKETS, ticketId] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUPPORT_TICKETS })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
