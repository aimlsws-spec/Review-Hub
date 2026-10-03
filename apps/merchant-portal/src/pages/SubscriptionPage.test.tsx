import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSubscriptionMutations, useSubscriptionQuery } from '@/hooks/useSubscription'

import SubscriptionPage from './SubscriptionPage'

vi.mock('@/hooks/useSubscription', () => ({ useSubscriptionQuery: vi.fn(), useSubscriptionMutations: vi.fn() }))

const growth = {
  id: 'p-growth',
  code: 'GROWTH',
  name: 'Growth',
  description: null,
  monthlyPrice: '999.00',
  priceWithGst: 1178.82,
  maxActiveCampaigns: 10,
  featuredSlots: 1,
  isPremium: false,
}
const mutation = () => ({ mutate: vi.fn(), isPending: false })
let mutations: Record<'subscribe' | 'cancel' | 'resume' | 'feature', ReturnType<typeof mutation>>

const withOverview = (current: unknown) =>
  vi.mocked(useSubscriptionQuery).mockReturnValue({
    data: { data: { data: { current, plans: [growth], featured: { price: 199, days: 7, priceWithGst: 234.82 } } } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never)

describe('SubscriptionPage', () => {
  beforeEach(() => {
    mutations = { subscribe: mutation(), cancel: mutation(), resume: mutation(), feature: mutation() }
    vi.mocked(useSubscriptionMutations).mockReturnValue(mutations as never)
  })

  it('offers the plans with their price including GST, and subscribes after confirming', async () => {
    withOverview(null)
    const user = userEvent.setup()
    render(<SubscriptionPage />)

    const card = screen.getByRole('region', { name: 'Growth' })
    expect(within(card).getByText(/1,178\.82/)).toBeInTheDocument()
    expect(within(card).getByText('• 1 featured campaign included')).toBeInTheDocument()

    await user.click(within(card).getByRole('button', { name: 'Choose Growth' }))
    expect(screen.getByText(/taken from your wallet now, and again each month/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Subscribe' }))

    expect(mutations.subscribe.mutate).toHaveBeenCalledWith('p-growth', expect.anything())
  })

  it('shows the current plan and lets the merchant cancel it', async () => {
    withOverview({ id: 's-1', status: 'ACTIVE', autoRenew: true, periodStart: '2026-10-03T00:00:00Z', periodEnd: '2026-11-03T00:00:00Z', plan: growth })
    const user = userEvent.setup()
    render(<SubscriptionPage />)

    expect(screen.getByRole('region', { name: 'Your plan' })).toHaveTextContent('Renews on')
    expect(screen.getByText('Your current plan')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel plan' }))
    expect(mutations.cancel.mutate).toHaveBeenCalled()
  })

  it('offers to keep a cancelled plan, and explains a failed renewal', () => {
    withOverview({ id: 's-1', status: 'PAST_DUE', autoRenew: false, periodStart: '2026-10-03T00:00:00Z', periodEnd: '2026-11-03T00:00:00Z', plan: growth })
    render(<SubscriptionPage />)

    expect(screen.getByText(/renewal could not be paid/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Keep my plan' })).toBeInTheDocument()
  })
})
