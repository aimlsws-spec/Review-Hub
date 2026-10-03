import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useReferralsQuery } from '@/hooks/useUsers'

import { ReferralTreePanel } from './ReferralTreePanel'

vi.mock('@/hooks/useUsers', () => ({ useReferralsQuery: vi.fn() }))

const levels: Record<string, unknown> = {
  'u-1': {
    data: [
      { id: 'r-1', referredUserId: 'u-2', name: 'Asha Rao', joinedAt: '2026-09-01T00:00:00Z', rewardIssued: true, ownReferralCount: 1 },
      { id: 'r-2', referredUserId: 'u-3', name: 'Ravi', joinedAt: '2026-09-02T00:00:00Z', rewardIssued: false, ownReferralCount: 0 },
    ],
    total: 3,
    page: 1,
    limit: 50,
    referrer: { id: 'r-0', referrerId: 'u-0', name: 'Meena K' },
  },
  'u-2': {
    data: [{ id: 'r-3', referredUserId: 'u-4', name: 'Kiran', joinedAt: '2026-09-05T00:00:00Z', rewardIssued: false, ownReferralCount: 0 }],
    total: 1,
    page: 1,
    limit: 50,
    referrer: { id: 'r-1', referrerId: 'u-1', name: 'Self' },
  },
}

describe('ReferralTreePanel', () => {
  beforeEach(() => {
    vi.mocked(useReferralsQuery).mockImplementation(
      (userId: string) => ({ data: { data: { data: levels[userId] } }, isLoading: false, isError: false }) as never,
    )
  })

  it('shows who referred the user and their direct referrals', () => {
    render(<ReferralTreePanel userId="u-1" />)

    expect(screen.getByText('Referred by Meena K.')).toBeInTheDocument()
    expect(screen.getByText('Ravi')).toBeInTheDocument()
    expect(screen.getByText('Reward paid')).toBeInTheDocument()
    expect(screen.getByText('Showing the newest 2 of 3.')).toBeInTheDocument()
  })

  it('opens the next level only when asked', async () => {
    render(<ReferralTreePanel userId="u-1" />)
    expect(screen.queryByText('Kiran')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Asha Rao/ }))

    expect(screen.getByText('Kiran')).toBeInTheDocument()
    expect(useReferralsQuery).toHaveBeenCalledWith('u-2')
  })

  it('says so when the user referred nobody', () => {
    vi.mocked(useReferralsQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 50, referrer: null } } },
      isLoading: false,
      isError: false,
    } as never)
    render(<ReferralTreePanel userId="u-9" />)

    expect(screen.getByText('Joined without a referral.')).toBeInTheDocument()
    expect(screen.getByText('Has not referred anyone.')).toBeInTheDocument()
  })
})
