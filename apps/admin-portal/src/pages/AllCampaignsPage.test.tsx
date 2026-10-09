import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAllCampaignsQuery, useCampaignDetailQuery } from '@/hooks/useCampaignQueue'

import AllCampaignsPage from './AllCampaignsPage'

vi.mock('@/hooks/useCampaignQueue', () => ({
  useAllCampaignsQuery: vi.fn(),
  useCampaignDetailQuery: vi.fn(),
}))

const campaign = {
  id: 'campaign-1',
  merchantId: 'merchant-1',
  title: 'Try our new cake range',
  slug: 'try-our-new-cake-range',
  shortDescription: null,
  description: 'Visit the bakery and share your honest experience.',
  campaignType: 'REVIEW',
  status: 'ACTIVE',
  rewardType: 'CASH',
  rewardAmount: '40',
  totalBudget: '5000',
  spentBudget: '1200',
  remainingBudget: '3800',
  currentParticipants: 35,
  startAt: '2026-10-01T00:00:00Z',
  endAt: '2026-10-15T00:00:00Z',
  featured: true,
  merchant: { id: 'merchant-1', businessName: 'Sunrise Bakery' },
  performance: { campaignId: 'campaign-1', joins: 35, finished: 30, completionRate: 0.86, completions: 30, rewardsPaid: 1200 },
  createdAt: '2026-09-28T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
}

function listResult(data: unknown[], statusCounts: Record<string, number> = { ACTIVE: 1, PENDING_REVIEW: 2, COMPLETED: 4 }) {
  // Axios response → API envelope → the page of campaigns.
  return { data: { data: { data: { data, total: data.length, page: 1, limit: 20, statusCounts } } }, isLoading: false, isError: false, refetch: vi.fn() }
}

function renderPage(path = '/all-campaigns') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AllCampaignsPage />
    </MemoryRouter>,
  )
}

/** The filters the page asked for on its latest render. */
const lastParams = () => vi.mocked(useAllCampaignsQuery).mock.calls.at(-1)?.[0]

describe('AllCampaignsPage', () => {
  beforeEach(() => {
    vi.mocked(useAllCampaignsQuery).mockReset()
    vi.mocked(useAllCampaignsQuery).mockReturnValue(listResult([campaign]) as never)
    vi.mocked(useCampaignDetailQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() } as never)
  })

  it('lists campaigns of every merchant with their merchant, status, spend and results', () => {
    renderPage()

    const row = within(screen.getByRole('row', { name: /try our new cake range/i }))
    expect(row.getByText('Sunrise Bakery')).toBeInTheDocument()
    expect(row.getByText(/featured/i)).toBeInTheDocument()
    expect(row.getByText(/35 joined/)).toBeInTheDocument()
    expect(lastParams()).toMatchObject({ page: 1, status: undefined, merchantId: undefined })
  })

  it('shows a count on each status tab and filters when one is chosen', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('tab', { name: /^all\s*7$/i })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: /pending review\s*2/i }))

    expect(lastParams()).toMatchObject({ status: 'PENDING_REVIEW', page: 1 })
  })

  it('searches by title or business name and filters by type', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/^search/i), '  cake  ')
    await user.click(screen.getByRole('button', { name: /^search$/i }))
    expect(lastParams()).toMatchObject({ search: 'cake' })

    await user.selectOptions(screen.getByLabelText(/campaign type/i), 'SOCIAL_SHARE')
    expect(lastParams()).toMatchObject({ campaignType: 'SOCIAL_SHARE', search: 'cake' })
  })

  it("narrows the list to one merchant from the link, and can show every merchant again", async () => {
    const user = userEvent.setup()
    renderPage('/all-campaigns?merchant=merchant-1')

    expect(lastParams()).toMatchObject({ merchantId: 'merchant-1' })
    expect(screen.getByText(/merchant: sunrise bakery/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /show all merchants/i }))
    expect(lastParams()).toMatchObject({ merchantId: undefined })
  })

  it('opens the full campaign details', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^view$/i }))

    expect(useCampaignDetailQuery).toHaveBeenCalledWith('campaign-1')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows an error, not zero counts, when the list can not be loaded', () => {
    vi.mocked(useAllCampaignsQuery).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() } as never)
    renderPage()

    expect(screen.getByRole('tab', { name: /^all$/i })).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again|retry/i })).toBeInTheDocument()
  })

  it('says so when nothing matches', () => {
    vi.mocked(useAllCampaignsQuery).mockReturnValue(listResult([], {}) as never)
    renderPage()
    expect(screen.getByText(/no campaigns found/i)).toBeInTheDocument()
  })
})
