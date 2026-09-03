import type {
  AdminUser,
  ApiResponse,
  AuditAction,
  AuditLog,
  Campaign,
  CMSPage,
  CMSPageStatus,
  FAQ,
  FeatureFlag,
  FraudFlag,
  FraudRiskLevel,
  Merchant,
  MerchantDetail,
  MerchantRefund,
  PaginatedResult,
  ReversedReward,
  RiskyDevice,
  SystemSetting,
  UserStatus,
  WithdrawalRequest,
  SupportTicket,
  SupportTicketStatus,
  SupportCategory,
  SupportPriority,
} from '@/types'

import apiClient from './client'

export const adminApi = {
  // ── Users ──────────────────────────────────────────────────────────────
  listUsers: (params: { page: number; limit: number; status?: UserStatus; search?: string }) =>
    apiClient.get<ApiResponse<PaginatedResult<AdminUser>>>('/admin/users', { params }),

  getUser: (userId: string) => apiClient.get<ApiResponse<AdminUser>>(`/admin/users/${userId}`),

  suspendUser: (userId: string, reason?: string) =>
    apiClient.post<ApiResponse<AdminUser>>(`/admin/users/${userId}/suspend`, { reason }),

  banUser: (userId: string, reason?: string) =>
    apiClient.post<ApiResponse<AdminUser>>(`/admin/users/${userId}/ban`, { reason }),

  reactivateUser: (userId: string) => apiClient.post<ApiResponse<AdminUser>>(`/admin/users/${userId}/reactivate`),

  // ── Merchant verification queue ───────────────────────────────────────
  listPendingMerchants: () =>
    apiClient.get<ApiResponse<Merchant[]>>('/admin/merchants/pending'),

  listAllMerchants: (params: { page: number; limit: number; status?: string; search?: string }) =>
    apiClient.get<ApiResponse<PaginatedResult<Merchant>>>('/admin/merchants', { params }),

  getMerchantDetail: (merchantId: string) =>
    apiClient.get<ApiResponse<MerchantDetail>>(`/admin/merchants/${merchantId}`),

  approveMerchant: (merchantId: string) =>
    apiClient.post<ApiResponse<Merchant>>('/admin/merchants/approve', { merchantId }),

  rejectMerchant: (merchantId: string, reason: string) =>
    apiClient.post<ApiResponse<Merchant>>('/admin/merchants/reject', { merchantId, reason }),

  requestMerchantDocuments: (merchantId: string, message?: string) =>
    apiClient.post<ApiResponse<Merchant>>('/admin/merchants/request-documents', { merchantId, message }),

  toggleMerchantStatus: (merchantId: string, status: string) =>
    apiClient.patch<ApiResponse<Merchant>>(`/admin/merchants/${merchantId}/status`, { status }),

  /** Fetches a KYC document as a blob (auth header required, so it can't be a plain <a href>). */
  getMerchantDocumentBlob: (merchantId: string, documentId: string) =>
    apiClient.get<Blob>(`/admin/merchants/${merchantId}/documents/${documentId}/file`, { responseType: 'blob' }),

  // ── Campaign approval queue ───────────────────────────────────────────
  listPendingCampaigns: (params: { page: number; limit: number }) =>
    apiClient.get<ApiResponse<PaginatedResult<Campaign>>>('/admin/campaigns/pending', { params }),

  approveCampaign: (campaignId: string, comments?: string) =>
    apiClient.post<ApiResponse<Campaign>>(`/admin/campaigns/${campaignId}/approve`, { comments }),

  rejectCampaign: (campaignId: string, reason: string) =>
    apiClient.post<ApiResponse<Campaign>>(`/admin/campaigns/${campaignId}/reject`, { reason }),

  requestCampaignChanges: (campaignId: string, comments: string) =>
    apiClient.post<ApiResponse<Campaign>>(`/admin/campaigns/${campaignId}/request-changes`, { comments }),

  // ── Withdrawal queue ───────────────────────────────────────────────────
  listPendingWithdrawals: (params: { page: number; limit: number }) =>
    apiClient.get<ApiResponse<PaginatedResult<WithdrawalRequest>>>('/admin/withdrawals/pending', { params }),

  approveWithdrawal: (withdrawalId: string) =>
    apiClient.post<ApiResponse<WithdrawalRequest>>(`/withdrawals/${withdrawalId}/approve`),

  rejectWithdrawal: (withdrawalId: string, rejectionReason: string) =>
    apiClient.post<ApiResponse<WithdrawalRequest>>(`/withdrawals/${withdrawalId}/reject`, { rejectionReason }),

  // ── Merchant refund queue ──────────────────────────────────────────────
  listPendingRefunds: (params: { page: number; limit: number }) =>
    apiClient.get<ApiResponse<PaginatedResult<MerchantRefund>>>('/admin/merchants/refunds/pending', { params }),

  approveRefund: (refundId: string) =>
    apiClient.post<ApiResponse<MerchantRefund>>(`/admin/merchants/refunds/${refundId}/approve`),

  rejectRefund: (refundId: string, rejectionReason: string) =>
    apiClient.post<ApiResponse<MerchantRefund>>(`/admin/merchants/refunds/${refundId}/reject`, { rejectionReason }),

  // ── Fraud flags ────────────────────────────────────────────────────────
  listFraudFlags: (params: { page: number; limit: number; resolved?: boolean; riskLevel?: FraudRiskLevel }) =>
    apiClient.get<ApiResponse<PaginatedResult<FraudFlag>>>('/admin/fraud-flags', { params }),

  resolveFraudFlag: (flagId: string) => apiClient.post<ApiResponse<FraudFlag>>(`/admin/fraud-flags/${flagId}/resolve`),

  reverseReward: (flagId: string, reason: string) =>
    apiClient.post<ApiResponse<ReversedReward>>(`/admin/fraud-flags/${flagId}/reverse-reward`, { reason }),

  listHighRiskDevices: (params: { page: number; limit: number; minRiskScore?: number }) =>
    apiClient.get<ApiResponse<PaginatedResult<RiskyDevice>>>('/admin/fraud-flags/high-risk-devices', { params }),

  // ── CMS pages ──────────────────────────────────────────────────────────
  listCmsPages: (params: { page: number; limit: number; status?: CMSPageStatus }) =>
    apiClient.get<ApiResponse<PaginatedResult<CMSPage>>>('/admin/cms/pages', { params }),

  getCmsPage: (pageId: string) => apiClient.get<ApiResponse<CMSPage>>(`/admin/cms/pages/${pageId}`),

  createCmsPage: (data: { title: string; slug: string; content: string; metaTitle?: string; metaDescription?: string; status?: CMSPageStatus }) =>
    apiClient.post<ApiResponse<CMSPage>>('/admin/cms/pages', data),

  updateCmsPage: (pageId: string, data: Partial<{ title: string; content: string; metaTitle: string; metaDescription: string; status: CMSPageStatus }>) =>
    apiClient.patch<ApiResponse<CMSPage>>(`/admin/cms/pages/${pageId}`, data),

  deleteCmsPage: (pageId: string) => apiClient.delete<ApiResponse<CMSPage>>(`/admin/cms/pages/${pageId}`),

  // ── FAQs ───────────────────────────────────────────────────────────────
  listFaqs: (params: { page: number; limit: number; category?: string; isActive?: boolean }) =>
    apiClient.get<ApiResponse<PaginatedResult<FAQ>>>('/admin/cms/faqs', { params }),

  createFaq: (data: { category: string; question: string; answer: string; sortOrder?: number; isActive?: boolean }) =>
    apiClient.post<ApiResponse<FAQ>>('/admin/cms/faqs', data),

  updateFaq: (faqId: string, data: Partial<{ category: string; question: string; answer: string; sortOrder: number; isActive: boolean }>) =>
    apiClient.patch<ApiResponse<FAQ>>(`/admin/cms/faqs/${faqId}`, data),

  deleteFaq: (faqId: string) => apiClient.delete<ApiResponse<FAQ>>(`/admin/cms/faqs/${faqId}`),

  // ── System settings ────────────────────────────────────────────────────
  listSettings: (category?: string) =>
    apiClient.get<ApiResponse<SystemSetting[]>>('/admin/settings', { params: category ? { category } : undefined }),

  createSetting: (data: { key: string; value: unknown; dataType?: string; category?: string; description?: string }) =>
    apiClient.post<ApiResponse<SystemSetting>>('/admin/settings', data),

  updateSetting: (key: string, data: { value: unknown; description?: string }) =>
    apiClient.patch<ApiResponse<SystemSetting>>(`/admin/settings/${key}`, data),

  // ── Feature flags ──────────────────────────────────────────────────────
  listFeatureFlags: () => apiClient.get<ApiResponse<FeatureFlag[]>>('/admin/feature-flags'),

  createFeatureFlag: (data: { key: string; description?: string; enabled?: boolean; rolloutPercentage?: number }) =>
    apiClient.post<ApiResponse<FeatureFlag>>('/admin/feature-flags', data),

  updateFeatureFlag: (key: string, data: Partial<{ description: string; enabled: boolean; rolloutPercentage: number }>) =>
    apiClient.patch<ApiResponse<FeatureFlag>>(`/admin/feature-flags/${key}`, data),

  // ── Audit logs ─────────────────────────────────────────────────────────
  listAuditLogs: (params: { page: number; limit: number; entity?: string; actorId?: string; action?: AuditAction }) =>
    apiClient.get<ApiResponse<PaginatedResult<AuditLog>>>('/admin/audit-logs', { params }),

  // ── Support tickets ────────────────────────────────────────────────────
  listSupportTickets: (params: { page: number; limit: number; status?: SupportTicketStatus; category?: SupportCategory; priority?: SupportPriority }) =>
    apiClient.get<ApiResponse<PaginatedResult<SupportTicket>>>('/admin/support/tickets', { params }),

  getSupportTicket: (ticketId: string) =>
    apiClient.get<ApiResponse<SupportTicket>>(`/admin/support/tickets/${ticketId}`),

  replySupportTicket: (ticketId: string, message: string, internalNote?: boolean) =>
    apiClient.post<ApiResponse<SupportTicket>>(`/admin/support/tickets/${ticketId}/messages`, { message, internalNote }),

  updateSupportTicketStatus: (ticketId: string, status: SupportTicketStatus) =>
    apiClient.patch<ApiResponse<SupportTicket>>(`/admin/support/tickets/${ticketId}/status`, { status }),
}
