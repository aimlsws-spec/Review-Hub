import apiClient from './client'
import type { ApiResponse, LoginResponse, User } from '@/types'

export const authApi = {
  login: (email: string, password: string, rememberMe = false) =>
    apiClient.post<ApiResponse<LoginResponse>>('/auth/login', { email, password, rememberMe }),

  register: (data: { firstName: string; lastName: string; email: string; password: string; phone?: string }) =>
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

  sendOtp: (type: string) => apiClient.post('/auth/send-otp', { type }),

  verifyOtp: (type: string, code: string) => apiClient.post('/auth/verify-otp', { type, code }),
}
