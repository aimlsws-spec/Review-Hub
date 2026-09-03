import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMerchantRewardsQuery } from '@/hooks/useRewards'
import { useAuthStore } from '@/stores/auth.store'

import RewardsPage from './RewardsPage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/hooks/useRewards', () => ({ useMerchantRewardsQuery: vi.fn() }))

const reward = {
  id: 'reward-1',
  userId: 'user-1',
  amount: '75',
  rewardType: 'CASH',
  status: 'CREDITED',
  createdAt: '2026-01-01T00:00:00Z',
  user: { firstName: 'Alex', lastName: 'Kim' },
  campaign: { title: 'Summer Sale Reviews' },
}

function mockAuthState(merchantId: string | undefined) {
  vi.mocked(useAuthStore).mockImplementation(
    ((selector: (s: { merchant: { id: string } | null }) => unknown) => selector({ merchant: merchantId ? { id: merchantId } : null })) as unknown as typeof useAuthStore,
  )
}

function renderPage() {
  return render(
    <MemoryRouter>
      <RewardsPage />
    </MemoryRouter>,
  )
}

describe('RewardsPage', () => {
  beforeEach(() => {
    mockAuthState('merchant-1')
    vi.mocked(useMerchantRewardsQuery).mockReturnValue({
      data: { data: { data: { data: [reward], total: 1, page: 1, limit: 10 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
  })

  it('shows an empty state when no rewards have been paid out', () => {
    vi.mocked(useMerchantRewardsQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 10 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()
    expect(screen.getByText(/no rewards paid out yet/i)).toBeInTheDocument()
  })

  it('shows an error state with a retry action', async () => {
    const refetch = vi.fn()
    vi.mocked(useMerchantRewardsQuery).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch } as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it('renders a reward row with participant, campaign, and amount', () => {
    renderPage()

    expect(screen.getByText('Alex Kim')).toBeInTheDocument()
    expect(screen.getByText('Summer Sale Reviews')).toBeInTheDocument()
    expect(screen.getByText(/75\.00/)).toBeInTheDocument()
  })

  it('falls back to a truncated user id when no user record is attached', () => {
    vi.mocked(useMerchantRewardsQuery).mockReturnValue({
      data: { data: { data: { data: [{ ...reward, user: undefined, campaign: undefined }], total: 1, page: 1, limit: 10 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()

    expect(screen.getByText('user-1'.slice(0, 8))).toBeInTheDocument()
  })
})
