import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCampaignsQuery } from '@/hooks/useCampaigns'
import { useAuthStore } from '@/stores/auth.store'

import CouponsPage from './CouponsPage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/hooks/useCampaigns', () => ({ useCampaignsQuery: vi.fn() }))

const couponCampaign = {
  id: 'campaign-1',
  title: 'Refer a Friend Gift Cards',
  rewardType: 'GIFT_CARD',
  status: 'ACTIVE',
  rewardAmount: '200',
  totalBudget: '20000',
  spentBudget: '4000',
}

const cashCampaign = {
  id: 'campaign-2',
  title: 'Cash Reward Reviews',
  rewardType: 'CASH',
  status: 'ACTIVE',
  rewardAmount: '50',
  totalBudget: '5000',
  spentBudget: '0',
}

function mockAuthState(merchantId: string | undefined) {
  vi.mocked(useAuthStore).mockImplementation(
    ((selector: (s: { merchant: { id: string } | null }) => unknown) => selector({ merchant: merchantId ? { id: merchantId } : null })) as unknown as typeof useAuthStore,
  )
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CouponsPage />
    </MemoryRouter>,
  )
}

describe('CouponsPage', () => {
  beforeEach(() => {
    mockAuthState('merchant-1')
  })

  it('shows an empty state when there are no coupon-reward campaigns', () => {
    vi.mocked(useCampaignsQuery).mockReturnValue({
      data: { data: { data: { data: [cashCampaign] } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()
    expect(screen.getByText(/no coupon campaigns yet/i)).toBeInTheDocument()
  })

  it('shows an error state with a retry action', async () => {
    const refetch = vi.fn()
    vi.mocked(useCampaignsQuery).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch } as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it('renders only campaigns with a coupon-style reward, filtering out cash campaigns', () => {
    vi.mocked(useCampaignsQuery).mockReturnValue({
      data: { data: { data: { data: [couponCampaign, cashCampaign] } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()

    expect(screen.getByText('Refer a Friend Gift Cards')).toBeInTheDocument()
    expect(screen.queryByText('Cash Reward Reviews')).not.toBeInTheDocument()
  })
})
