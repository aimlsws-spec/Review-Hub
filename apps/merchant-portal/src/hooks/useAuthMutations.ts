import { useMutation } from '@tanstack/react-query'

import { authApi } from '@/api/auth.api'
import { useAuth } from '@/contexts/AuthContext'

interface LoginFormValues {
  email: string
  password: string
  rememberMe: boolean
}

/**
 * Wraps AuthContext's login() (which itself calls authApi.login + merchantApi.getProfile)
 * in a mutation so LoginPage stays a thin view component.
 */
export function useLoginMutation() {
  const { login } = useAuth()
  return useMutation({
    mutationFn: (data: LoginFormValues) => login(data),
  })
}

interface RegisterFormValues {
  firstName: string
  lastName: string
  email: string
  phone?: string
  password: string
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (data: RegisterFormValues) =>
      authApi.register({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
      }),
  })
}

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
