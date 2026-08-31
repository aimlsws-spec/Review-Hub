import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/stores/auth.store'
import { getApiErrorMessage } from '@/utils'

interface ProfileFormValues {
  firstName: string
  lastName: string
}

/** Updates the logged-in user's own account (name), used by SettingsPage. */
export function useUpdateAccountProfileMutation() {
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation({
    mutationFn: (data: ProfileFormValues) => authApi.updateProfile(data),
    onSuccess: (res) => {
      setUser(res.data.data)
      toast.success('Profile updated')
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

export function useChangePasswordMutation(onSuccess?: () => void) {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Password changed successfully')
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

export function useSendOtpMutation() {
  return useMutation({
    mutationFn: (type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION') => authApi.sendOtp(type),
    onSuccess: () => toast.success('OTP sent successfully'),
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
