import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSaveSubscriptionPlanMutation, useSubscriptionPlansQuery } from '@/hooks/useSubscriptionPlans'

import SubscriptionPlansPage from './SubscriptionPlansPage'

vi.mock('@/hooks/useSubscriptionPlans', () => ({ useSubscriptionPlansQuery: vi.fn(), useSaveSubscriptionPlanMutation: vi.fn() }))

const save = vi.fn()
const growth = {
  id: 'p-1',
  code: 'GROWTH',
  name: 'Growth',
  description: 'Up to 10 campaigns',
  monthlyPrice: '999.00',
  maxActiveCampaigns: 10,
  featuredSlots: 1,
  isPremium: false,
  isActive: false,
  sortOrder: 2,
  subscribers: 0,
}

describe('SubscriptionPlansPage', () => {
  beforeEach(() => {
    save.mockReset()
    vi.mocked(useSaveSubscriptionPlanMutation).mockReturnValue({ mutate: save, isPending: false } as never)
    vi.mocked(useSubscriptionPlansQuery).mockReturnValue({ data: { data: { data: [growth] } }, isLoading: false, isError: false, refetch: vi.fn() } as never)
  })

  it('lists plans, saying which are switched off', () => {
    render(<SubscriptionPlansPage />)

    const row = screen.getByText('Growth').closest('tr') as HTMLElement
    expect(within(row).getByText('₹999')).toBeInTheDocument()
    expect(within(row).getByText('No (switched off)')).toBeInTheDocument()
  })

  it('switches a plan on from the editor', async () => {
    const user = userEvent.setup()
    render(<SubscriptionPlansPage />)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByLabelText('Offered to merchants'))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(save).toHaveBeenCalledWith({
      planId: 'p-1',
      form: expect.objectContaining({ code: 'GROWTH', monthlyPrice: 999, maxActiveCampaigns: 10, isActive: true }),
    })
  })

  it('creates a plan with no campaign limit when that field is empty', async () => {
    const user = userEvent.setup()
    render(<SubscriptionPlansPage />)

    await user.click(screen.getByRole('button', { name: 'New plan' }))
    await user.type(screen.getByLabelText(/^code/i), 'gold')
    await user.type(screen.getByLabelText(/^name/i), 'Gold')
    await user.click(screen.getByRole('button', { name: 'Create plan' }))

    expect(save).toHaveBeenCalledWith({ planId: null, form: expect.objectContaining({ code: 'GOLD', name: 'Gold', maxActiveCampaigns: null }) })
  })
})
