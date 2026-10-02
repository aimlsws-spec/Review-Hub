import type { ApiResponse, ContentPage, LoginChallenge, LoginResponse, PolicyStatus, User } from '@/types'

import { apiClient } from './client'

export const authApi = {
  login: (email: string, password: string, rememberMe = false) =>
    apiClient.post<ApiResponse<LoginResponse | LoginChallenge>>('/auth/login', { email, password, rememberMe }),

  /** Finishes a sign-in from a new browser with the code that was sent. */
  verifyDevice: (challengeToken: string, code: string) =>
    apiClient.post<ApiResponse<LoginResponse>>('/auth/login/verify-device', { challengeToken, code }),

  resendDeviceCode: (challengeToken: string) => apiClient.post('/auth/login/resend-device-code', { challengeToken }),

  register: (data: { firstName: string; lastName: string; email: string; password: string; phone?: string; acceptPolicies: boolean }) =>
    apiClient.post<ApiResponse<LoginResponse>>('/auth/register', data),

  logout: () => apiClient.post('/auth/logout'),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (data: { email: string; code: string; password: string }) =>
    apiClient.post('/auth/reset-password', data),

  getMe: () => apiClient.get<ApiResponse<User>>('/auth/me'),

  updateProfile: (data: Partial<{ firstName: string; lastName: string; timezone: string; language: string }>) =>
    apiClient.patch<ApiResponse<User>>('/auth/profile', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.patch('/auth/change-password', { currentPassword, newPassword }),

  /** The legal documents in force, and whether the signed-in person accepted their current version. */
  getPolicies: () => apiClient.get<ApiResponse<PolicyStatus[]>>('/auth/policies'),

  acceptPolicies: () => apiClient.post<ApiResponse<PolicyStatus[]>>('/auth/policies/accept'),

  /** A published content page such as the Terms & Conditions. Public: works before signing in. */
  getPage: (slug: string) => apiClient.get<ApiResponse<ContentPage>>(`/pages/${slug}`),

  sendOtp: (type: string) => apiClient.post('/auth/send-otp', { type }),

  verifyOtp: (type: string, code: string) => apiClient.post('/auth/verify-otp', { type, code }),
}
