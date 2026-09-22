import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCampaignRecommendation } from '@/hooks/useCampaignBuilder'
import type { CampaignRecommendation } from '@/types'

import { CampaignBuilderModal } from './CampaignBuilderModal'

vi.mock('@/hooks/useCampaignBuilder', () => ({ useCampaignRecommendation: vi.fn() }))

const recommendation: CampaignRecommendation = {
  goal: 'MORE_REVIEWS',
  draft: {
    title: 'Share your honest review of Brew Bar',
    shortDescription: 'Tell others about your real experience and get rewarded.',
    description: 'Visit Brew Bar and write an honest review about your experience.',
    campaignType: 'REVIEW',
    rewardType: 'CASH',
    rewardAmount: 50,
    totalBudget: 5000,
    maxParticipants: 100,
    minimumFollowers: 0,
    startAt: '2026-10-01T00:00:00.000Z',
    endAt: '2026-10-08T00:00:00.000Z',
    autoApprove: false,
  },
  estimate: { participants: 100, rewardSpend: 5000, platformFeeRate: 0.1, estimatedPlatformFee: 500, totalEstimatedCost: 5500 },
  benchmark: { source: 'defaults', sampleSize: 0 },
  rationale: ['Rs 50 per person is a starting point for this kind of campaign.'],
  warnings: ['Very short campaigns give people little time to find and finish the task.'],
}

const mutateMock = vi.fn()
const resetMock = vi.fn()

function mockHook(data?: CampaignRecommendation, isPending = false) {
  vi.mocked(useCampaignRecommendation).mockReturnValue({ mutate: mutateMock, reset: resetMock, data, isPending } as never)
}

describe('CampaignBuilderModal', () => {
  beforeEach(() => {
    mutateMock.mockReset()
    resetMock.mockReset()
    mockHook()
  })

  it('asks for a goal and a budget and requests a recommendation', async () => {
    const user = userEvent.setup()
    render(<CampaignBuilderModal merchantId="merchant-1" onClose={vi.fn()} onUseDraft={vi.fn()} />)

    await user.selectOptions(screen.getByLabelText(/what do you want to achieve/i), 'APP_INSTALLS')
    await user.clear(screen.getByLabelText(/reward budget/i))
    await user.type(screen.getByLabelText(/reward budget/i), '2500')
    await user.type(screen.getByLabelText(/special offer/i), '  Free coffee  ')
    await user.click(screen.getByRole('button', { name: /get recommendation/i }))

    await waitFor(() =>
      expect(mutateMock).toHaveBeenCalledWith({ goal: 'APP_INSTALLS', budget: 2500, durationDays: 7, highlight: 'Free coffee' }),
    )
  })

  it('does not ask when the budget is below the minimum', async () => {
    const user = userEvent.setup()
    render(<CampaignBuilderModal merchantId="merchant-1" onClose={vi.fn()} onUseDraft={vi.fn()} />)

    await user.clear(screen.getByLabelText(/reward budget/i))
    await user.type(screen.getByLabelText(/reward budget/i), '50')
    await user.click(screen.getByRole('button', { name: /get recommendation/i }))

    expect(await screen.findByText(/at least ₹100/i)).toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('cannot ask before the merchant profile has loaded', () => {
    render(<CampaignBuilderModal merchantId={undefined} onClose={vi.fn()} onUseDraft={vi.fn()} />)
    expect(screen.getByRole('button', { name: /get recommendation/i })).toBeDisabled()
  })

  it('shows the recommendation with the fee kept separate from the budget, plus warnings and reasons', () => {
    mockHook(recommendation)
    render(<CampaignBuilderModal merchantId="merchant-1" onClose={vi.fn()} onUseDraft={vi.fn()} />)

    expect(screen.getByText('Share your honest review of Brew Bar')).toBeInTheDocument()
    expect(screen.getByText(/platform fee \(10%, estimate\)/i)).toBeInTheDocument()
    expect(screen.getByText(/billed separately/i)).toBeInTheDocument()
    expect(screen.getByText(/very short campaigns/i)).toBeInTheDocument()
    expect(screen.getByText(/starting point for this kind of campaign/i)).toBeInTheDocument()
  })

  it('hands the draft over when the merchant uses it', async () => {
    mockHook(recommendation)
    const onUseDraft = vi.fn()
    const user = userEvent.setup()
    render(<CampaignBuilderModal merchantId="merchant-1" onClose={vi.fn()} onUseDraft={onUseDraft} />)

    await user.click(screen.getByRole('button', { name: /use this draft/i }))

    expect(onUseDraft).toHaveBeenCalledWith(recommendation.draft)
  })

  it('lets the merchant go back and change the answers', async () => {
    mockHook(recommendation)
    const user = userEvent.setup()
    render(<CampaignBuilderModal merchantId="merchant-1" onClose={vi.fn()} onUseDraft={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /change my answers/i }))

    expect(resetMock).toHaveBeenCalled()
  })
})
