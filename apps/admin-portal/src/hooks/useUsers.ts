import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import type { AdminUser, UserStatus } from '@/types'
import { getApiErrorMessage } from '@/utils'

export type UserActionKind = 'suspend' | 'ban' | 'reactivate'

/** Fetches the paginated, filterable list of platform users for the Users page. */
export function useUsersQuery(params: { page: number; limit: number; status?: UserStatus | ''; search?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.USERS, params.page, params.status, params.search],
    queryFn: () => adminApi.listUsers({ ...params, status: params.status || undefined }),
  })
}

/** Fetches a single user's full detail record; disabled until a userId is selected. */
export function useUserDetailQuery(userId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.USER_DETAIL, userId],
    queryFn: () => adminApi.getUser(userId!),
    enabled: !!userId,
  })
}

/** Suspends, bans, or reactivates a user, refreshing the list and detail caches on success. */
export function useUserActionMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ user, action }: { user: AdminUser; action: UserActionKind }) => {
      if (action === 'suspend') return adminApi.suspendUser(user.id)
      if (action === 'ban') return adminApi.banUser(user.id)
      return adminApi.reactivateUser(user.id)
    },
    onSuccess: (_, { action }) => {
      toast.success(`User ${action === 'reactivate' ? 'reactivated' : action + 'ed'}`)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USERS })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_DETAIL })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
