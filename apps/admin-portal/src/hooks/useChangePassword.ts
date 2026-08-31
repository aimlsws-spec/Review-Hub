import { useMutation } from '@tanstack/react-query'

import { authApi } from '@/api/auth.api'
import { getApiErrorMessage } from '@/utils'

/** Changes the signed-in admin's password. */
export function useChangePasswordMutation(onSuccess?: () => void, onError?: (message: string) => void) {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => onSuccess?.(),
    onError: (err) => onError?.(getApiErrorMessage(err)),
  })
}
