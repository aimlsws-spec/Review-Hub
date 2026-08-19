import apiClient from './client'
import type { ApiResponse, PaginatedResponse } from '@/types'

export interface ApiNotification {
  id: string
  title: string
  message: string
  type: string
  readAt: string | null
  createdAt: string
}

export const notificationApi = {
  list: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    apiClient.get<ApiResponse<PaginatedResponse<ApiNotification>>>('/notifications', { params }),

  getUnreadCount: () =>
    apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count'),

  markRead: (notificationId: string) =>
    apiClient.post<ApiResponse<ApiNotification>>(`/notifications/${notificationId}/read`),

  markAllRead: () =>
    apiClient.post<ApiResponse<{ updated: number }>>('/notifications/read-all'),
}
