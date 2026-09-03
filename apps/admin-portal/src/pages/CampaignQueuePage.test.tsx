import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCampaignQueueQuery, useCampaignReviewMutation } from '@/hooks/useCampaignQueue'

import CampaignQueuePage from './CampaignQueuePage'

vi.mock('@/hooks/useCampaignQueue', () => ({
  useCampaignQueueQuery: vi.fn(),
  useCampaignReviewMutation: vi.fn(),
}))

const campaign = {
  id: 'campaign-1',
  merchantId: 'merchant-1',
  title: 'Diwali Review Drive',
  slug: 'diwali-review-drive',
  shortDescription: null,
  description: 'Collect reviews during Diwali',
  campaignType: 'REVIEW',
  status: 'PENDING_REVIEW',
  rewardType: 'FIXED',
  rewardAmount: '50',
  totalBudget: '10000',
  spentBudget: '0',
  remainingBudget: '10000',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
}

const submitReviewMock = vi.fn()

function renderPage() {
  return render(<CampaignQueuePage />)
}

describe('CampaignQueuePage', () => {
  beforeEach(() => {
    vi.mocked(useCampaignQueueQuery).mockReturnValue({
      data: { data: { data: { data: [campaign], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useCampaignReviewMutation).mockReturnValue({ mutate: submitReviewMock, isPending: false } as never)
    submitReviewMock.mockReset()
  })

  it('shows an empty state when nothing is pending', () => {
    vi.mocked(useCampaignQueueQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()
    expect(screen.getByText(/nothing to review/i)).toBeInTheDocument()
  })

  it('shows an error state with a retry action', async () => {
    const refetch = vi.fn()
    vi.mocked(useCampaignQueueQuery).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch } as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it('renders a pending campaign with reward and budget', () => {
    renderPage()

    expect(screen.getByText('Diwali Review Drive')).toBeInTheDocument()
    expect(screen.getByText(/50\.00/)).toBeInTheDocument()
    expect(screen.getByText(/10,000/)).toBeInTheDocument()
  })

  it('approves a campaign with an optional comment', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /approve/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /confirm/i }))

    await waitFor(() =>
      expect(submitReviewMock).toHaveBeenCalledWith({ campaign, kind: 'approve', note: '' }),
    )
  })

  it('requires a reason before requesting changes', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /request changes/i }))
    const dialog = within(screen.getByRole('dialog'))
    const confirmButton = dialog.getByRole('button', { name: /confirm/i })
    expect(confirmButton).toBeDisabled()

    await user.type(dialog.getByLabelText(/what needs to change/i), 'Please add clearer terms')
    expect(confirmButton).toBeEnabled()

    await user.click(confirmButton)
    await waitFor(() =>
      expect(submitReviewMock).toHaveBeenCalledWith({ campaign, kind: 'request-changes', note: 'Please add clearer terms' }),
    )
  })

  it('rejects a campaign with a reason', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^reject$/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/reason for rejection/i), 'Violates content policy')
    await user.click(dialog.getByRole('button', { name: /confirm/i }))

    await waitFor(() =>
      expect(submitReviewMock).toHaveBeenCalledWith({ campaign, kind: 'reject', note: 'Violates content policy' }),
    )
  })
})
