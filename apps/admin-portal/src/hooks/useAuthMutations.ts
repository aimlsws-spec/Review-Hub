import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth.api'

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: ({ email }: { email: string }) => authApi.forgotPassword(email),
  })
}

interface ResetPasswordValues {
  email: string
  code: string
  password: string
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (data: ResetPasswordValues) =>
      authApi.resetPassword({ email: data.email, code: data.code, password: data.password }),
  })
}
