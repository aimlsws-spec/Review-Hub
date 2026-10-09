import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAllCampaignsQuery } from '@/hooks/useCampaignQueue'

import { MerchantCampaignsPanel } from './MerchantCampaignsPanel'

vi.mock('@/hooks/useCampaignQueue', () => ({ useAllCampaignsQuery: vi.fn() }))

const campaign = {
  id: 'campaign-1',
  title: 'Try our new cake range',
  status: 'ACTIVE',
  rewardAmount: '40',
  totalBudget: '5000',
  spentBudget: '1200',
  merchant: { id: 'merchant-1', businessName: 'Sunrise Bakery' },
  performance: { completions: 30 },
}

function renderPanel() {
  return render(
    <MemoryRouter>
      <MerchantCampaignsPanel merchantId="merchant-1" />
    </MemoryRouter>,
  )
}

describe('MerchantCampaignsPanel', () => {
  beforeEach(() => {
    vi.mocked(useAllCampaignsQuery).mockReturnValue({
      data: { data: { data: { data: [campaign], total: 12, page: 1, limit: 5, statusCounts: {} } } },
      isLoading: false,
      isError: false,
    } as never)
  })

  it("shows the merchant's latest campaigns, each linking to its details", () => {
    renderPanel()

    expect(useAllCampaignsQuery).toHaveBeenCalledWith({ page: 1, limit: 5, merchantId: 'merchant-1' })
    expect(screen.getByText('Campaigns (12)')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /try our new cake range/i })).toHaveAttribute(
      'href',
      '/all-campaigns?merchant=merchant-1&campaign=campaign-1',
    )
    expect(screen.getByRole('link', { name: /view all/i })).toHaveAttribute('href', '/all-campaigns?merchant=merchant-1')
  })

  it('says when the merchant has no campaigns', () => {
    vi.mocked(useAllCampaignsQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 5, statusCounts: {} } } },
      isLoading: false,
      isError: false,
    } as never)
    renderPanel()

    expect(screen.getByText(/no campaigns created yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /view all/i })).not.toBeInTheDocument()
  })
})
