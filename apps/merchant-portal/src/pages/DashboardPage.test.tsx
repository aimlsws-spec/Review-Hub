import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCampaignAnalyticsQuery, useCampaignsQuery } from '@/hooks/useCampaigns'
import { useDashboardStatsQuery } from '@/hooks/useDashboard'
import { useMerchantInsightsQuery } from '@/hooks/useInsights'
import { useNotificationsQuery } from '@/hooks/useNotifications'
import { useRecentReviewsQuery } from '@/hooks/useReviews'
import { useAuthStore } from '@/stores/auth.store'

import DashboardPage from './DashboardPage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/hooks/useCampaigns', () => ({ useCampaignsQuery: vi.fn(), useCampaignAnalyticsQuery: vi.fn() }))
vi.mock('@/hooks/useDashboard', () => ({ useDashboardStatsQuery: vi.fn() }))
vi.mock('@/hooks/useInsights', () => ({ useMerchantInsightsQuery: vi.fn() }))
vi.mock('@/hooks/useNotifications', () => ({ useNotificationsQuery: vi.fn() }))
vi.mock('@/hooks/useReviews', () => ({ useRecentReviewsQuery: vi.fn() }))

const merchant = { id: 'merchant-1', status: 'ACTIVE', verificationStatus: 'APPROVED' }
const user = { firstName: 'Jane' }

const stats = {
  totalCampaigns: 4,
  activeCampaigns: 2,
  totalParticipants: 120,
  walletBalance: '5000',
  totalSpent: '2000',
  totalBudget: '7000',
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(useAuthStore).mockReturnValue({ user, merchant } as never)
    vi.mocked(useCampaignsQuery).mockReturnValue({ data: { data: { data: { data: [] } } }, isLoading: false } as never)
    vi.mocked(useCampaignAnalyticsQuery).mockReturnValue({ data: undefined, isLoading: false } as never)
    vi.mocked(useDashboardStatsQuery).mockReturnValue({ data: { data: { data: stats } }, isLoading: false } as never)
    vi.mocked(useMerchantInsightsQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() } as never)
    vi.mocked(useNotificationsQuery).mockReturnValue({ data: { data: { data: { data: [] } } }, isLoading: false } as never)
    vi.mocked(useRecentReviewsQuery).mockReturnValue({ data: { data: { data: { data: [] } } }, isLoading: false } as never)
  })

  it('shows an onboarding prompt when there is no merchant yet', () => {
    vi.mocked(useAuthStore).mockReturnValue({ user, merchant: null } as never)
    renderPage()

    expect(screen.getByText(/complete your merchant profile/i)).toBeInTheDocument()
  })

  it('renders the metric cards with dashboard stats', () => {
    renderPage()

    expect(screen.getByText(/welcome back, jane/i)).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('₹5,000.00')).toBeInTheDocument()
  })

  it('shows a verification banner when KYC is incomplete', () => {
    vi.mocked(useAuthStore).mockReturnValue({ user, merchant: { ...merchant, verificationStatus: 'PENDING' } } as never)
    renderPage()

    expect(screen.getByText(/verification pending/i)).toBeInTheDocument()
  })

  it('renders recent reviews when available', () => {
    vi.mocked(useRecentReviewsQuery).mockReturnValue({
      data: {
        data: {
          data: {
            data: [{ id: 'review-1', customerName: 'Alex Kim', source: 'GOOGLE', rating: 5, body: 'Great service!', reviewedAt: '2026-01-01T00:00:00Z', reply: null }],
          },
        },
      },
      isLoading: false,
    } as never)
    renderPage()

    expect(screen.getByText('Alex Kim')).toBeInTheDocument()
    expect(screen.getByText('Great service!')).toBeInTheDocument()
  })

  it('shows live campaign performance from the real joins and rewards', () => {
    vi.mocked(useCampaignsQuery).mockReturnValue({
      data: { data: { data: { data: [{ id: 'campaign-1', title: 'Try our menu', totalBudget: '5000.00' }] } } },
      isLoading: false,
    } as never)
    // The rate is a 0-1 fraction, and the money arrives as numbers, as the server sends them.
    vi.mocked(useCampaignAnalyticsQuery).mockReturnValue({
      data: { data: { data: { joins: 40, finished: 24, completions: 30, rejections: 2, completionRate: 0.6, budgetUsed: 1250, rewardPaid: 1250, avgCompletionSec: 900 } } },
      isLoading: false,
    } as never)
    renderPage()

    expect(screen.getByText('Try our menu')).toBeInTheDocument()
    expect(screen.getByText('40')).toBeInTheDocument()
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText(/60\.0%/)).toBeInTheDocument()
    expect(screen.getByText(/Rewards paid:/)).toBeInTheDocument()
    expect(screen.getByText(/₹1,250\.00 \/ ₹5,000\.00/)).toBeInTheDocument()
  })

  it('no longer shows views or a conversion rate, which nothing measures', () => {
    vi.mocked(useCampaignsQuery).mockReturnValue({
      data: { data: { data: { data: [{ id: 'campaign-1', title: 'Try our menu', totalBudget: '5000.00' }] } } },
      isLoading: false,
    } as never)
    vi.mocked(useCampaignAnalyticsQuery).mockReturnValue({
      data: { data: { data: { joins: 0, finished: 0, completions: 0, rejections: 0, completionRate: 0, budgetUsed: 0, rewardPaid: 0, avgCompletionSec: 0 } } },
      isLoading: false,
    } as never)
    renderPage()

    expect(screen.queryByText(/Views:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Conversion:/)).not.toBeInTheDocument()
  })
})
