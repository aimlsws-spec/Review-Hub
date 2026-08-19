import apiClient from './client'
import type { ApiResponse, LoginResponse, User } from '@/types'

export const authApi = {
  login: (email: string, password: string, rememberMe = false) =>
    apiClient.post<ApiResponse<LoginResponse>>('/auth/login', { email, password, rememberMe }),

  logout: () => apiClient.post('/auth/logout'),

  getMe: () => apiClient.get<ApiResponse<User>>('/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.patch('/auth/change-password', { currentPassword, newPassword }),
}
