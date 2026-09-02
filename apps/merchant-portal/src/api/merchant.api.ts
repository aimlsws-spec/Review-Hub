import type {
  ApiResponse,
  Merchant,
  MerchantWallet,
  WalletTransaction,
  MerchantDocument,
  MerchantBankAccount,
  TeamMember,
  MerchantInvitation,
  DashboardStats,
  PaginatedResponse,
  Campaign,
  CampaignType,
  CampaignVisibility,
  RewardType,
  MerchantReward,
  SupportTicket,
  SupportCategory,
  SupportPriority,
} from '@/types'
import type { Customer, CustomerType, CustomerStatus } from '@/types/customer'
import type { ApiReview, ApiReviewSource, ApiReviewStatus, ReviewStats } from '@/types/review'

import apiClient from './client'

export interface ReviewQueryParams {
  page?: number
  limit?: number
  source?: ApiReviewSource
  rating?: number
  status?: ApiReviewStatus
  search?: string
  dateFrom?: string
  dateTo?: string
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest'
}

export interface CreateReviewInput {
  customerName: string
  customerEmail?: string
  source: ApiReviewSource
  rating: number
  title?: string
  body: string
  reviewedAt?: string
}

export interface CampaignFormInput {
  title: string
  shortDescription?: string
  description: string
  campaignType: CampaignType
  visibility?: CampaignVisibility
  rewardType?: RewardType
  rewardAmount: number
  totalBudget: number
  maxParticipants?: number
  startAt?: string
  endAt?: string
}

/**
 * Every route below except getProfile() requires a merchantId path segment
 * (the backend guards ownership per-merchant via MerchantOwnershipGuard) —
 * getProfile() is the one bootstrap call that resolves it from the JWT instead.
 */
export interface RegisterMerchantInput {
  businessName: string
  email: string
  phone: string
  website?: string
  description?: string
}

export const merchantApi = {
  // Profile
  getProfile: () => apiClient.get<ApiResponse<Merchant>>('/merchants/me'),

  register: (data: RegisterMerchantInput) =>
    apiClient.post<ApiResponse<Merchant>>('/merchants/register', data),

  updateProfile: (merchantId: string, data: Partial<Merchant>) =>
    apiClient.patch<ApiResponse<Merchant>>(`/merchants/${merchantId}`, data),

  // Dashboard
  getDashboard: (merchantId: string) =>
    apiClient.get<ApiResponse<DashboardStats>>(`/merchants/${merchantId}/dashboard`),

  // Team
  getTeam: (merchantId: string) =>
    apiClient.get<ApiResponse<TeamMember[]>>(`/merchants/${merchantId}/team`),

  inviteMember: (merchantId: string, data: { email: string; role: string }) =>
    apiClient.post<ApiResponse<MerchantInvitation>>(`/merchants/${merchantId}/team/invite`, data),

  updateMemberRole: (merchantId: string, memberId: string, role: string) =>
    apiClient.patch<ApiResponse<TeamMember>>(`/merchants/${merchantId}/team/${memberId}`, { role }),

  removeMember: (merchantId: string, memberId: string) =>
    apiClient.delete(`/merchants/${merchantId}/team/${memberId}`),

  getInvitations: (merchantId: string) =>
    apiClient.get<ApiResponse<MerchantInvitation[]>>(`/merchants/${merchantId}/invitations`),

  cancelInvitation: (merchantId: string, invitationId: string) =>
    apiClient.delete(`/merchants/${merchantId}/invitations/${invitationId}`),

  // Wallet
  getWallet: (merchantId: string) =>
    apiClient.get<ApiResponse<MerchantWallet>>(`/merchants/${merchantId}/wallet`),

  getTransactions: (merchantId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<PaginatedResponse<WalletTransaction>>>(`/merchants/${merchantId}/wallet/transactions`, { params }),

  createRecharge: (merchantId: string, amount: number) =>
    apiClient.post<ApiResponse<{ razorpayOrderId: string; amount: number; currency: string }>>(
      `/merchants/${merchantId}/wallet/recharge`,
      { amount },
    ),

  verifyRecharge: (merchantId: string, data: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) =>
    apiClient.post<ApiResponse<WalletTransaction>>(`/merchants/${merchantId}/wallet/recharge/verify`, data),

  // KYC documents
  getDocuments: (merchantId: string) =>
    apiClient.get<ApiResponse<MerchantDocument[]>>(`/merchants/${merchantId}/kyc/documents`),

  uploadDocument: (merchantId: string, data: { documentType: string; documentNumber?: string; file: File }) => {
    const form = new FormData()
    form.append('documentType', data.documentType)
    if (data.documentNumber) form.append('documentNumber', data.documentNumber)
    form.append('file', data.file)
    return apiClient.post<ApiResponse<MerchantDocument>>(`/merchants/${merchantId}/kyc/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // Bank Accounts
  getBankAccounts: (merchantId: string) =>
    apiClient.get<ApiResponse<MerchantBankAccount[]>>(`/merchants/${merchantId}/bank-accounts`),

  addBankAccount: (merchantId: string, data: {
    bankName: string
    accountHolderName: string
    accountNumber: string
    ifscCode: string
    branch?: string
    upiId?: string
  }) => apiClient.post<ApiResponse<MerchantBankAccount>>(`/merchants/${merchantId}/bank-accounts`, data),

  setPrimaryBankAccount: (merchantId: string, bankId: string) =>
    apiClient.post(`/merchants/${merchantId}/bank-accounts/default`, { bankId }),

  deleteBankAccount: (merchantId: string, bankId: string) =>
    apiClient.delete(`/merchants/${merchantId}/bank-accounts/${bankId}`),

  // Campaigns
  getCampaigns: (merchantId: string, params?: { page?: number; limit?: number; status?: string; campaignType?: string }) =>
    apiClient.get<ApiResponse<PaginatedResponse<Campaign>>>(`/merchants/${merchantId}/campaigns`, { params }),

  createCampaign: (merchantId: string, data: CampaignFormInput) =>
    apiClient.post<ApiResponse<Campaign>>(`/merchants/${merchantId}/campaigns`, data),

  updateCampaign: (campaignId: string, data: Partial<Omit<CampaignFormInput, 'campaignType'>>) =>
    apiClient.patch<ApiResponse<Campaign>>(`/campaigns/${campaignId}`, data),

  submitCampaign: (campaignId: string) => apiClient.post<ApiResponse<Campaign>>(`/campaigns/${campaignId}/submit`),

  activateCampaign: (campaignId: string) => apiClient.post<ApiResponse<Campaign>>(`/campaigns/${campaignId}/activate`),

  pauseCampaign: (campaignId: string) => apiClient.post<ApiResponse<Campaign>>(`/campaigns/${campaignId}/pause`),

  resumeCampaign: (campaignId: string) => apiClient.post<ApiResponse<Campaign>>(`/campaigns/${campaignId}/resume`),

  cancelCampaign: (campaignId: string) => apiClient.post<ApiResponse<Campaign>>(`/campaigns/${campaignId}/cancel`),

  deleteCampaign: (campaignId: string) => apiClient.delete<ApiResponse<Campaign>>(`/campaigns/${campaignId}`),

  // Rewards paid out across this merchant's campaigns
  getMerchantRewards: (merchantId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<PaginatedResponse<MerchantReward>>>(`/merchants/${merchantId}/rewards`, { params }),

  // Support tickets
  getTickets: (merchantId: string, params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<ApiResponse<PaginatedResponse<SupportTicket>>>(`/merchants/${merchantId}/support/tickets`, { params }),

  getTicket: (merchantId: string, ticketId: string) =>
    apiClient.get<ApiResponse<SupportTicket>>(`/merchants/${merchantId}/support/tickets/${ticketId}`),

  createTicket: (merchantId: string, data: { subject: string; description: string; category?: SupportCategory; priority?: SupportPriority }) =>
    apiClient.post<ApiResponse<SupportTicket>>(`/merchants/${merchantId}/support/tickets`, data),

  replyToTicket: (merchantId: string, ticketId: string, message: string) =>
    apiClient.post<ApiResponse<SupportTicket>>(`/merchants/${merchantId}/support/tickets/${ticketId}/messages`, { message }),

  // Reviews (logged manually — not synced live from Google/Facebook/etc.)
  getReviews: (merchantId: string, params?: ReviewQueryParams) =>
    apiClient.get<ApiResponse<PaginatedResponse<ApiReview>>>(`/merchants/${merchantId}/reviews`, { params }),

  getReviewStats: (merchantId: string) =>
    apiClient.get<ApiResponse<ReviewStats>>(`/merchants/${merchantId}/reviews/stats`),

  createReview: (merchantId: string, data: CreateReviewInput) =>
    apiClient.post<ApiResponse<ApiReview>>(`/merchants/${merchantId}/reviews`, data),

  replyToReview: (merchantId: string, reviewId: string, reply: string) =>
    apiClient.post<ApiResponse<ApiReview>>(`/merchants/${merchantId}/reviews/${reviewId}/reply`, { reply }),

  updateReviewStatus: (merchantId: string, reviewId: string, status: ApiReviewStatus) =>
    apiClient.patch<ApiResponse<ApiReview>>(`/merchants/${merchantId}/reviews/${reviewId}/status`, { status }),

  deleteReview: (merchantId: string, reviewId: string) =>
    apiClient.delete(`/merchants/${merchantId}/reviews/${reviewId}`),

  // Customers (derived from campaign participation — read-only)
  getCustomers: (merchantId: string, params?: { page?: number; limit?: number; search?: string; type?: CustomerType; status?: CustomerStatus }) =>
    apiClient.get<ApiResponse<PaginatedResponse<Customer>>>(`/merchants/${merchantId}/customers`, { params }),

  getCustomerStats: (merchantId: string) =>
    apiClient.get<ApiResponse<{
      total: number
      active: number
      vip: number
      newThisPeriod: number
      returning: number
      totalLifetimeValue: number
      averageLifetimeValue: number
      retentionRate: number
    }>>(`/merchants/${merchantId}/customers/stats`),
}
