import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAnalyticsOverviewQuery } from '@/hooks/useAnalytics'
import { useAuthStore } from '@/stores/auth.store'

import AnalyticsPage from './AnalyticsPage'

vi.mock('@/hooks/useAnalytics', () => ({ useAnalyticsOverviewQuery: vi.fn() }))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))

const overview = (overrides: Record<string, unknown> = {}) => ({
  period: { days: 7, from: '2026-09-15', to: '2026-09-21' },
  totals: { campaigns: 2, activeCampaigns: 1, joins: 30, finished: 22, completions: 23, completionRate: 22 / 30, rewardsPaid: 1150, budgetSpent: 1150, costPerCompletion: 50 },
  campaigns: [
    { id: 'c1', title: 'Dinner review drive', status: 'COMPLETED', joins: 20, finished: 18, completionRate: 0.9, completions: 18, rewardsPaid: 900, spentBudget: 900, totalBudget: 2000, costPerCompletion: 50 },
    { id: 'c2', title: 'Brunch drive', status: 'ACTIVE', joins: 10, finished: 4, completionRate: 0.4, completions: 5, rewardsPaid: 250, spentBudget: 250, totalBudget: 5000, costPerCompletion: null },
  ],
  daily: [
    { date: '2026-09-19', joins: 0, completions: 0, rewardsPaid: 0 },
    { date: '2026-09-20', joins: 4, completions: 0, rewardsPaid: 0 },
    { date: '2026-09-21', joins: 2, completions: 3, rewardsPaid: 150 },
  ],
  ...overrides,
})

function returns(data: unknown, state: { isLoading?: boolean; isError?: boolean; refetch?: () => void } = {}) {
  vi.mocked(useAnalyticsOverviewQuery).mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn(), ...state } as never)
}

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.mocked(useAnalyticsOverviewQuery).mockReset()
    vi.mocked(useAuthStore).mockImplementation(((selector: (s: unknown) => unknown) => selector({ merchant: { id: 'merchant-1' } })) as never)
    returns(overview())
  })

  it('shows the totals: who joined, who finished, what was paid, and what each task cost', () => {
    render(<AnalyticsPage />)

    expect(within(screen.getByRole('region', { name: 'People who joined' })).getByText('30')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Finished the campaign' })).getByText(/73\.3% of those who joined/)).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Rewards paid' })).getByText(/1,150\.00/)).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Cost per completed task' })).getByText(/50\.00/)).toBeInTheDocument()
  })

  it('shows a dash, not a made-up cost, while nothing has been completed', () => {
    returns(overview({ totals: { ...overview().totals, completions: 0, costPerCompletion: null } }))
    render(<AnalyticsPage />)

    const card = within(screen.getByRole('region', { name: 'Cost per completed task' }))
    expect(card.getByText('—')).toBeInTheDocument()
    expect(card.getByText(/nothing completed yet/i)).toBeInTheDocument()
  })

  it('lists each campaign with its figures', () => {
    render(<AnalyticsPage />)

    const row = within(screen.getByText('Dinner review drive').closest('tr') as HTMLElement)
    expect(row.getByText('20')).toBeInTheDocument()
    expect(row.getByText(/90\.0%/)).toBeInTheDocument()
    expect(row.getByText(/2,000\.00/)).toBeInTheDocument()
  })

  it('has a bar for every day, each saying what it shows', () => {
    render(<AnalyticsPage />)

    const bars = screen.getAllByTestId('bar')
    expect(bars).toHaveLength(3)
    expect(bars[1]).toHaveAttribute('aria-label', expect.stringMatching(/20 Sep: 4 joined/))
  })

  it('can show the rewards paid instead of who joined', async () => {
    const user = userEvent.setup()
    render(<AnalyticsPage />)

    await user.click(screen.getByRole('button', { name: /rewards paid/i }))

    expect(screen.getByRole('button', { name: /rewards paid/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByTestId('bar')[2]).toHaveAttribute('aria-label', expect.stringMatching(/150\.00 paid for 3 completed tasks/))
  })

  it('draws a flat line, not a tall bar, for a day when nothing happened', () => {
    render(<AnalyticsPage />)

    expect(screen.getAllByTestId('bar')[0]).toHaveStyle({ height: '2px' })
  })

  it('starts on 30 days and asks again for another period', async () => {
    const user = userEvent.setup()
    render(<AnalyticsPage />)
    expect(vi.mocked(useAnalyticsOverviewQuery)).toHaveBeenLastCalledWith('merchant-1', 30)

    await user.selectOptions(screen.getByLabelText(/period/i), '90')

    expect(vi.mocked(useAnalyticsOverviewQuery)).toHaveBeenLastCalledWith('merchant-1', 90)
  })

  it('says so when there are no campaigns yet', () => {
    returns(overview({ totals: { ...overview().totals, campaigns: 0 }, campaigns: [] }))
    render(<AnalyticsPage />)

    expect(screen.getByText(/no campaigns yet/i)).toBeInTheDocument()
  })

  it('offers to try again when the figures could not be loaded', async () => {
    const refetch = vi.fn()
    returns(undefined, { isError: true, refetch })
    const user = userEvent.setup()
    render(<AnalyticsPage />)

    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(refetch).toHaveBeenCalled()
  })

  it('does not claim to know views: they are not tracked', () => {
    render(<AnalyticsPage />)
    expect(screen.queryByText(/views/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/conversion/i)).not.toBeInTheDocument()
  })
})
