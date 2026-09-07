import type {
  AdminUser,
  AiModel,
  AiProvider,
  AiPromptTemplate,
  AiUsageLog,
  AnalyticsEvent,
  ApiResponse,
  AuditAction,
  AuditLog,
  Badge,
  BadgeCriteriaType,
  Campaign,
  CMSPage,
  CMSPageStatus,
  DailyAnalytics,
  DailyRewardPrize,
  FAQ,
  FeatureFlag,
  FraudFlag,
  FraudRiskLevel,
  JobExecutionLog,
  JobType,
  MarketplaceItem,
  Merchant,
  MerchantAnalytics,
  MerchantDetail,
  MerchantRefund,
  PaginatedResult,
  PlatformConfiguration,
  Redemption,
  ReversedReward,
  RiskyDevice,
  ScheduledJob,
  Settlement,
  SystemSetting,
  UserAnalytics,
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

  // ── Gamification: badges ──────────────────────────────────────────────
  listBadges: (params: { page: number; limit: number; isActive?: boolean }) =>
    apiClient.get<ApiResponse<PaginatedResult<Badge>>>('/admin/gamification/badges', { params }),

  createBadge: (data: { code: string; name: string; description: string; iconUrl?: string; criteriaType: BadgeCriteriaType; criteriaValue: number; isActive?: boolean }) =>
    apiClient.post<ApiResponse<Badge>>('/admin/gamification/badges', data),

  updateBadge: (badgeId: string, data: Partial<{ name: string; description: string; iconUrl: string; criteriaType: BadgeCriteriaType; criteriaValue: number; isActive: boolean }>) =>
    apiClient.patch<ApiResponse<Badge>>(`/admin/gamification/badges/${badgeId}`, data),

  deleteBadge: (badgeId: string) => apiClient.delete<ApiResponse<Badge>>(`/admin/gamification/badges/${badgeId}`),

  // ── Gamification: daily reward prizes ─────────────────────────────────
  listDailyRewardPrizes: (params: { page: number; limit: number; isActive?: boolean }) =>
    apiClient.get<ApiResponse<PaginatedResult<DailyRewardPrize>>>('/admin/gamification/prizes', { params }),

  createDailyRewardPrize: (data: { label: string; amount: number; weight: number; isActive?: boolean }) =>
    apiClient.post<ApiResponse<DailyRewardPrize>>('/admin/gamification/prizes', data),

  updateDailyRewardPrize: (prizeId: string, data: Partial<{ label: string; amount: number; weight: number; isActive: boolean }>) =>
    apiClient.patch<ApiResponse<DailyRewardPrize>>(`/admin/gamification/prizes/${prizeId}`, data),

  deleteDailyRewardPrize: (prizeId: string) => apiClient.delete<ApiResponse<DailyRewardPrize>>(`/admin/gamification/prizes/${prizeId}`),

  // ── Marketplace ────────────────────────────────────────────────────────
  listMarketplaceItems: (params: { page: number; limit: number; category?: string; isActive?: boolean }) =>
    apiClient.get<ApiResponse<PaginatedResult<MarketplaceItem>>>('/admin/marketplace/items', { params }),

  createMarketplaceItem: (data: { title: string; description: string; thumbnailUrl?: string; category?: string; costAmount: number; stock?: number; sortOrder?: number; isActive?: boolean }) =>
    apiClient.post<ApiResponse<MarketplaceItem>>('/admin/marketplace/items', data),

  updateMarketplaceItem: (itemId: string, data: Partial<{ title: string; description: string; thumbnailUrl: string; category: string; costAmount: number; stock: number; sortOrder: number; isActive: boolean }>) =>
    apiClient.patch<ApiResponse<MarketplaceItem>>(`/admin/marketplace/items/${itemId}`, data),

  deleteMarketplaceItem: (itemId: string) => apiClient.delete<ApiResponse<MarketplaceItem>>(`/admin/marketplace/items/${itemId}`),

  listRedemptions: (params: { page: number; limit: number }) =>
    apiClient.get<ApiResponse<PaginatedResult<Redemption>>>('/admin/marketplace/redemptions', { params }),

  // ── Settlements ────────────────────────────────────────────────────────
  listSettlements: (params: { page: number; limit: number }) =>
    apiClient.get<ApiResponse<PaginatedResult<Settlement>>>('/admin/settlements', { params }),

  generateSettlements: (data?: { periodStart?: string; periodEnd?: string }) =>
    apiClient.post<ApiResponse<unknown>>('/admin/settlements/generate', data ?? {}),

  // ── Analytics ──────────────────────────────────────────────────────────
  listAnalyticsEvents: (params: { page: number; limit: number; eventName?: string; eventCategory?: string }) =>
    apiClient.get<ApiResponse<PaginatedResult<AnalyticsEvent>>>('/admin/analytics/events', { params }),

  getDailyAnalytics: (from: string, to: string) =>
    apiClient.get<ApiResponse<DailyAnalytics[]>>('/admin/analytics/daily', { params: { from, to } }),

  getMerchantAnalytics: (merchantId: string) =>
    apiClient.get<ApiResponse<MerchantAnalytics | null>>(`/admin/analytics/merchants/${merchantId}`),

  getUserAnalytics: (userId: string) =>
    apiClient.get<ApiResponse<UserAnalytics | null>>(`/admin/analytics/users/${userId}`),

  // ── Scheduled jobs ─────────────────────────────────────────────────────
  listScheduledJobs: () => apiClient.get<ApiResponse<ScheduledJob[]>>('/admin/scheduled-jobs'),

  createScheduledJob: (data: { jobName: string; jobType: JobType; cronExpression: string; enabled?: boolean }) =>
    apiClient.post<ApiResponse<ScheduledJob>>('/admin/scheduled-jobs', data),

  updateScheduledJob: (jobId: string, data: Partial<{ cronExpression: string; enabled: boolean }>) =>
    apiClient.patch<ApiResponse<ScheduledJob>>(`/admin/scheduled-jobs/${jobId}`, data),

  deleteScheduledJob: (jobId: string) => apiClient.delete<ApiResponse<ScheduledJob>>(`/admin/scheduled-jobs/${jobId}`),

  listJobExecutionLogs: (jobId: string, params: { page: number; limit: number }) =>
    apiClient.get<ApiResponse<PaginatedResult<JobExecutionLog>>>(`/admin/scheduled-jobs/${jobId}/logs`, { params }),

  // ── AI providers ───────────────────────────────────────────────────────
  listAiProviders: () => apiClient.get<ApiResponse<AiProvider[]>>('/admin/ai-providers'),

  createAiProvider: (data: { name: string; provider: string; apiEndpoint?: string; model?: string; enabled?: boolean; priority?: number; timeout?: number }) =>
    apiClient.post<ApiResponse<AiProvider>>('/admin/ai-providers', data),

  updateAiProvider: (providerId: string, data: Partial<{ apiEndpoint: string; model: string; enabled: boolean; priority: number; timeout: number }>) =>
    apiClient.patch<ApiResponse<AiProvider>>(`/admin/ai-providers/${providerId}`, data),

  deleteAiProvider: (providerId: string) => apiClient.delete<ApiResponse<AiProvider>>(`/admin/ai-providers/${providerId}`),

  addAiModel: (providerId: string, data: { modelName: string; version?: string; maxTokens?: number; temperature?: number; enabled?: boolean }) =>
    apiClient.post<ApiResponse<AiModel>>(`/admin/ai-providers/${providerId}/models`, data),

  removeAiModel: (modelId: string) => apiClient.delete<ApiResponse<AiModel>>(`/admin/ai-providers/models/${modelId}`),

  addAiPromptTemplate: (providerId: string, data: { name: string; prompt: string; version?: string; active?: boolean }) =>
    apiClient.post<ApiResponse<AiPromptTemplate>>(`/admin/ai-providers/${providerId}/prompt-templates`, data),

  removeAiPromptTemplate: (templateId: string) =>
    apiClient.delete<ApiResponse<AiPromptTemplate>>(`/admin/ai-providers/prompt-templates/${templateId}`),

  listAiUsageLogs: (providerId: string, params: { page: number; limit: number }) =>
    apiClient.get<ApiResponse<PaginatedResult<AiUsageLog>>>(`/admin/ai-providers/${providerId}/usage-logs`, { params }),

  // ── Platform configuration ─────────────────────────────────────────────
  getPlatformConfiguration: () => apiClient.get<ApiResponse<PlatformConfiguration>>('/admin/platform-configuration'),

  updatePlatformConfiguration: (data: Partial<Omit<PlatformConfiguration, 'id' | 'appVersion' | 'apiVersion'>>) =>
    apiClient.patch<ApiResponse<PlatformConfiguration>>('/admin/platform-configuration', data),
}
