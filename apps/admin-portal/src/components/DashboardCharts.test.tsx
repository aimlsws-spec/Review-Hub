import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useDashboardSeries } from '@/hooks/useDashboardStats'

import { DashboardCharts } from './DashboardCharts'

vi.mock('@/hooks/useDashboardStats', () => ({ useDashboardSeries: vi.fn() }))

// jsdom has no layout, so ResponsiveContainer would measure 0×0 and draw nothing: give it a fixed size.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) => (
      <actual.ResponsiveContainer width={600} height={200}>
        {children}
      </actual.ResponsiveContainer>
    ),
  }
})

const day = (overrides: Record<string, unknown> = {}) => ({
  day: '2026-10-02',
  commission: 0,
  newUsers: 0,
  campaignsCreated: 0,
  withdrawalsRequested: 0,
  withdrawalsPaid: 0,
  fraudFlags: 0,
  ...overrides,
})

const withSeries = (days: unknown[], totals: Record<string, number> = {}) =>
  vi.mocked(useDashboardSeries).mockReturnValue({
    data: {
      data: {
        data: {
          days,
          totals: { commission: 0, newUsers: 0, campaignsCreated: 0, withdrawalsRequested: 0, withdrawalsPaid: 0, fraudFlags: 0, ...totals },
          activeCampaigns: 6,
        },
      },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never)

describe('DashboardCharts', () => {
  beforeEach(() => vi.mocked(useDashboardSeries).mockReset())

  it('shows a chart per figure with its total for the range', () => {
    withSeries([day({ commission: 1500, newUsers: 12 })], { commission: 1500, newUsers: 12, withdrawalsPaid: 300 })
    render(<DashboardCharts />)

    expect(screen.getByRole('region', { name: 'Commission earned' })).toHaveTextContent('₹1,500')
    expect(screen.getByRole('region', { name: 'New users' })).toHaveTextContent('12')
    expect(screen.getByRole('region', { name: 'Withdrawals' })).toHaveTextContent('₹300 paid')
    expect(screen.getByText('6 campaigns are running now.')).toBeInTheDocument()
    expect(useDashboardSeries).toHaveBeenCalledWith(30)
  })

  it('changes the range', async () => {
    withSeries([day({ newUsers: 1 })])
    render(<DashboardCharts />)

    await userEvent.click(screen.getByRole('button', { name: '7 days' }))

    expect(useDashboardSeries).toHaveBeenLastCalledWith(7)
    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('says when there was no activity', () => {
    withSeries([day(), day({ day: '2026-10-03' })])
    render(<DashboardCharts />)

    expect(screen.getByText('No activity in the last 30 days.')).toBeInTheDocument()
  })

  it('offers to try again when the charts could not be loaded', async () => {
    const refetch = vi.fn()
    vi.mocked(useDashboardSeries).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch } as never)
    render(<DashboardCharts />)

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(refetch).toHaveBeenCalled()
  })
})
