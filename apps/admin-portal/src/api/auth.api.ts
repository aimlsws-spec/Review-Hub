import type { ApiResponse, LoginResponse, User } from '@/types'

import apiClient from './client'

export const authApi = {
  login: (email: string, password: string, rememberMe = false) =>
    apiClient.post<ApiResponse<LoginResponse>>('/auth/login', { email, password, rememberMe }),

  logout: () => apiClient.post('/auth/logout'),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (data: { email: string; code: string; password: string }) =>
    apiClient.post('/auth/reset-password', data),

  getMe: () => apiClient.get<ApiResponse<User>>('/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.patch('/auth/change-password', { currentPassword, newPassword }),
}
