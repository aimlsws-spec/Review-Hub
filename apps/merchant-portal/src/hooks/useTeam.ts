import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { merchantApi } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage, requireValue } from '@/utils'

export function useTeamQuery(merchantId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.TEAM,
    queryFn: () => merchantApi.getTeam(requireValue(merchantId, 'merchantId')),
    enabled: !!merchantId,
  })
}

export function useInvitationsQuery(merchantId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.INVITATIONS,
    queryFn: () => merchantApi.getInvitations(requireValue(merchantId, 'merchantId')),
    enabled: !!merchantId,
  })
}

export function useInviteMemberMutation(merchantId: string | undefined, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: { email: string; role: string }) => merchantApi.inviteMember(requireValue(merchantId, 'merchantId'), d),
    onSuccess: () => {
      toast.success('Invitation sent successfully')
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TEAM })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

export function useRemoveMemberMutation(merchantId: string | undefined, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => merchantApi.removeMember(requireValue(merchantId, 'merchantId'), id),
    onSuccess: () => {
      toast.success('Member removed')
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TEAM })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

export function useUpdateMemberRoleMutation(merchantId: string | undefined, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      merchantApi.updateMemberRole(requireValue(merchantId, 'merchantId'), memberId, role),
    onSuccess: () => {
      toast.success('Role updated')
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TEAM })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

export function useCancelInvitationMutation(merchantId: string | undefined, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) => merchantApi.cancelInvitation(requireValue(merchantId, 'merchantId'), invitationId),
    onSuccess: () => {
      toast.success('Invitation cancelled')
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVITATIONS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
