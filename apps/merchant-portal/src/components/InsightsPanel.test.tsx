import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMerchantInsightsQuery } from '@/hooks/useInsights'
import type { MerchantInsights } from '@/types'

import { InsightsPanel } from './InsightsPanel'

vi.mock('@/hooks/useInsights', () => ({ useMerchantInsightsQuery: vi.fn() }))

const insights: MerchantInsights = {
  windowDays: 90,
  summary: {
    campaignsAnalysed: 3,
    joins: 100,
    completions: 40,
    rewardsPaid: 2000,
    costPerCompletion: 50,
    platformFeeRate: 0.1,
    estimatedPlatformFee: 200,
    completionRate: 0.4,
    approvalRate: 0.8,
  },
  byType: [
    { campaignType: 'REVIEW', campaigns: 2, joins: 80, completions: 30, rewardsPaid: 1800, costPerCompletion: 60, completionRate: 0.375 },
    { campaignType: 'SURVEY', campaigns: 1, joins: 20, completions: 10, rewardsPaid: 200, costPerCompletion: 20, completionRate: 0.5 },
  ],
  suggestions: [
    { code: 'LOW_COMPLETION', severity: 'WARNING', title: 'Few people finish "Summer reviews"', detail: '40 people joined but only 10% finished.', campaignId: 'c-1' },
    { code: 'CHEAPEST_TYPE', severity: 'INFO', title: 'Some campaign types cost you less per result', detail: 'Survey campaigns cost you Rs 20 per completed task.' },
  ],
  note: 'These figures show what you paid for each completed task. They do not include what those tasks earned you.',
}

const refetch = vi.fn()

function mockQuery(state: Record<string, unknown>) {
  vi.mocked(useMerchantInsightsQuery).mockReturnValue({ data: undefined, isLoading: false, isError: false, refetch, ...state } as never)
}

const renderPanel = () =>
  render(
    <MemoryRouter>
      <InsightsPanel merchantId="merchant-1" />
    </MemoryRouter>,
  )

describe('InsightsPanel', () => {
  beforeEach(() => {
    refetch.mockReset()
    mockQuery({ data: insights })
  })

  it('shows what was paid, completed and what each completed task cost', () => {
    renderPanel()

    expect(screen.getByText('Paid to participants').nextSibling).toHaveTextContent('₹2,000.00')
    expect(screen.getByText('Completed tasks').nextSibling).toHaveTextContent('40')
    expect(screen.getByText('Cost per completed task').nextSibling).toHaveTextContent('₹50.00')
    expect(screen.getByText('People who finish').nextSibling).toHaveTextContent('40%')
  })

  it('shows the platform fee as a separate estimate', () => {
    renderPanel()
    expect(screen.getByText(/estimated platform fee \(10%\)/i)).toHaveTextContent(/₹200\.00, billed separately/)
  })

  it('breaks the results down by campaign type', () => {
    renderPanel()

    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(rows).toHaveLength(3)
    expect(within(rows[1]).getByText('Review')).toBeInTheDocument()
    expect(within(rows[2]).getByText('₹20.00')).toBeInTheDocument()
  })

  it('lists the suggestions with how urgent each is', () => {
    renderPanel()

    const list = within(screen.getByRole('list', { name: /suggestions/i }))
    expect(list.getByText('Few people finish "Summer reviews"')).toBeInTheDocument()
    expect(list.getByText('Needs attention')).toBeInTheDocument()
    expect(list.getByText('Good to know')).toBeInTheDocument()
  })

  it('says plainly that the figures do not include what the tasks earned', () => {
    renderPanel()
    expect(screen.getByText(/do not include what those tasks earned you/i)).toBeInTheDocument()
  })

  it('shows a dash instead of a cost when nothing was completed yet', () => {
    mockQuery({
      data: { ...insights, summary: { ...insights.summary, completions: 0, costPerCompletion: null, joins: 0 }, byType: [], suggestions: [] },
    })
    renderPanel()

    expect(screen.getByText('Cost per completed task').nextSibling).toHaveTextContent('—')
    expect(screen.getByText('People who finish').nextSibling).toHaveTextContent('—')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows only the message when no campaign has run', () => {
    mockQuery({
      data: {
        ...insights,
        summary: { ...insights.summary, campaignsAnalysed: 0, completions: 0, joins: 0, costPerCompletion: null },
        byType: [],
        suggestions: [{ code: 'NOT_ENOUGH_DATA', severity: 'INFO', title: 'No campaigns to look at yet', detail: 'Once you have run a campaign, this page shows more.' }],
      },
    })
    renderPanel()

    expect(screen.getByText('No campaigns to look at yet')).toBeInTheDocument()
    expect(screen.queryByText('Paid to participants')).not.toBeInTheDocument()
  })

  it('shows a loading state', () => {
    mockQuery({ data: undefined, isLoading: true })
    renderPanel()

    expect(screen.queryByText('Paid to participants')).not.toBeInTheDocument()
    expect(screen.getByText('Campaign insights')).toBeInTheDocument()
  })

  it('offers to try again when loading fails, without breaking the dashboard', async () => {
    mockQuery({ data: undefined, isError: true })
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(refetch).toHaveBeenCalled()
  })

  it('links to planning a campaign', () => {
    renderPanel()
    expect(screen.getByRole('link', { name: /plan a campaign/i })).toHaveAttribute('href', '/campaigns')
  })
})
