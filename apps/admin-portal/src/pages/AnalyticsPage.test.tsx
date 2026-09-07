import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useAnalyticsEventsQuery,
  useDailyAnalyticsQuery,
  useMerchantAnalyticsQuery,
  useUserAnalyticsQuery,
} from '@/hooks/useAnalytics'

import AnalyticsPage from './AnalyticsPage'

vi.mock('@/hooks/useAnalytics', () => ({
  useDailyAnalyticsQuery: vi.fn(),
  useMerchantAnalyticsQuery: vi.fn(),
  useUserAnalyticsQuery: vi.fn(),
  useAnalyticsEventsQuery: vi.fn(),
}))

const dailyRow = {
  id: 'daily-1',
  date: '2026-08-15T00:00:00Z',
  newUsers: 12,
  activeUsers: 100,
  campaignsCreated: 3,
  campaignsCompleted: 1,
  submissions: 40,
  rewardsPaid: 500,
  withdrawals: 200,
  revenue: 1000,
  platformCommission: 100,
}

const merchantAnalytics = {
  id: 'ma-1',
  merchantId: 'merchant-1',
  totalCampaigns: 5,
  totalParticipants: 50,
  totalBudget: 10000,
  totalSpent: 8000,
  averageCompletionRate: 0.75,
  totalRevenueGenerated: 2000,
}

const event = {
  id: 'event-1',
  eventName: 'campaign.viewed',
  eventCategory: 'campaign',
  entityType: 'campaign',
  entityId: 'campaign-1',
  userId: null,
  merchantId: null,
  campaignId: 'campaign-1',
  metadata: null,
  createdAt: '2026-08-15T10:00:00Z',
}

function renderPage() {
  return render(<AnalyticsPage />)
}

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.mocked(useDailyAnalyticsQuery).mockReturnValue({
      data: { data: { data: [dailyRow] } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useMerchantAnalyticsQuery).mockReturnValue({
      data: { data: { data: merchantAnalytics } },
      isLoading: false,
      isError: false,
      isFetched: true,
    } as never)
    vi.mocked(useUserAnalyticsQuery).mockReturnValue({
      data: { data: { data: null } },
      isLoading: false,
      isError: false,
      isFetched: false,
    } as never)
    vi.mocked(useAnalyticsEventsQuery).mockReturnValue({
      data: { data: { data: { data: [event], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
  })

  it('renders daily trend totals and the daily table', () => {
    renderPage()

    expect(screen.getAllByText('12').length).toBeGreaterThan(0)
    expect(screen.getAllByText('40').length).toBeGreaterThan(0)
    expect(screen.getByText('15 Aug 2026')).toBeInTheDocument()
  })

  it('renders recent events', () => {
    renderPage()
    expect(screen.getByText('campaign.viewed')).toBeInTheDocument()
  })

  it('shows merchant analytics after typing a merchant id', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText(/merchant id/i), 'merchant-1')

    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
