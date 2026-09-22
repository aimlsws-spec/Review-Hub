import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCampaignMutations, useCampaignsQuery } from '@/hooks/useCampaigns'
import { useWordingCheck } from '@/hooks/useWordingCheck'
import { useAuthStore } from '@/stores/auth.store'

import CampaignsPage from './CampaignsPage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/hooks/useCampaigns', () => ({ useCampaignsQuery: vi.fn(), useCampaignMutations: vi.fn() }))
vi.mock('@/hooks/useWordingCheck', () => ({ useWordingCheck: vi.fn() }))
vi.mock('@/hooks/useCampaignBuilder', () => ({
  useCampaignRecommendation: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    data: {
      goal: 'MORE_REVIEWS',
      draft: {
        title: 'Share your honest review of Brew Bar',
        shortDescription: 'Tell others about your real experience.',
        description: 'Visit Brew Bar and write an honest review about your experience.',
        campaignType: 'REVIEW',
        rewardType: 'CASH',
        rewardAmount: 40,
        totalBudget: 4000,
        maxParticipants: 100,
        minimumFollowers: 0,
        startAt: '2026-10-01T00:00:00.000Z',
        endAt: '2026-10-08T00:00:00.000Z',
        autoApprove: false,
      },
      estimate: { participants: 100, rewardSpend: 4000, platformFeeRate: 0, estimatedPlatformFee: 0, totalEstimatedCost: 4000 },
      benchmark: { source: 'defaults', sampleSize: 0 },
      rationale: [],
      warnings: [],
    },
  }),
}))

const draftCampaign = {
  id: 'campaign-1',
  merchantId: 'merchant-1',
  title: 'Summer Sale Reviews',
  slug: 'summer-sale-reviews',
  shortDescription: null,
  description: 'Collect reviews for the summer sale.',
  campaignType: 'REVIEW',
  status: 'DRAFT',
  rewardType: 'CASH',
  rewardAmount: '50',
  totalBudget: '5000',
  spentBudget: '0',
  currentParticipants: 0,
  maxParticipants: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const saveMutateMock = vi.fn()
const actionMutateMock = vi.fn()
const deleteMutateMock = vi.fn()

function mockAuthState(merchantId: string | undefined) {
  vi.mocked(useAuthStore).mockImplementation(
    ((selector: (s: { merchant: { id: string } | null }) => unknown) => selector({ merchant: merchantId ? { id: merchantId } : null })) as unknown as typeof useAuthStore,
  )
}

function renderPage() {
  return render(<CampaignsPage />)
}

describe('CampaignsPage', () => {
  beforeEach(() => {
    vi.mocked(useWordingCheck).mockReset()
    mockAuthState('merchant-1')
    vi.mocked(useCampaignsQuery).mockReturnValue({
      data: { data: { data: { data: [draftCampaign], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useCampaignMutations).mockReturnValue({
      saveMutation: { mutate: saveMutateMock, isPending: false },
      actionMutation: { mutate: actionMutateMock, isPending: false },
      deleteMutation: { mutate: deleteMutateMock, isPending: false },
    } as never)
    saveMutateMock.mockReset()
    actionMutateMock.mockReset()
    deleteMutateMock.mockReset()
  })

  it('shows an empty state when there are no campaigns', () => {
    vi.mocked(useCampaignsQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()
    expect(screen.getByText(/no campaigns yet/i)).toBeInTheDocument()
  })

  it('renders a draft campaign with its available actions', () => {
    renderPage()

    expect(screen.getByText('Summer Sale Reviews')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^submit$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument()
  })

  it('creates a new campaign', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new campaign/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/^title/i), 'Winter Review Drive')
    await user.type(dialog.getByLabelText(/full description/i), 'Collect reviews during the winter promotion period.')
    await user.click(dialog.getByRole('button', { name: /create draft/i }))

    await waitFor(() =>
      expect(saveMutateMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Winter Review Drive', description: 'Collect reviews during the winter promotion period.' }),
      ),
    )
  })

  it('warns while writing when the wording asks for a rating, and says nothing otherwise', async () => {
    const user = userEvent.setup()
    vi.mocked(useWordingCheck).mockReturnValue({
      allowed: false,
      findings: [{ rule: 'REQUIRES_RATING', severity: 'BLOCK', field: 'description', excerpt: '5 star review', message: 'm' }],
    })
    renderPage()

    await user.click(screen.getByRole('button', { name: /new campaign/i }))

    const alert = within(screen.getByRole('dialog')).getByRole('alert')
    expect(alert).toHaveTextContent(/needs to change/i)
    expect(alert).toHaveTextContent(/5 star review/)
    expect(alert).toHaveTextContent(/never depend on the rating/i)
  })

  it('shows a softer notice, not an alert, when the words only need a second look', async () => {
    const user = userEvent.setup()
    vi.mocked(useWordingCheck).mockReturnValue({
      allowed: true,
      findings: [{ rule: 'POSITIVE_WORDING', severity: 'REVIEW', field: 'title', excerpt: 'great reviews', message: 'm' }],
    })
    renderPage()

    await user.click(screen.getByRole('button', { name: /new campaign/i }))

    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.queryByRole('alert')).not.toBeInTheDocument()
    expect(dialog.getByRole('status')).toHaveTextContent(/second look/i)
  })

  it('shows no notice for honest wording', async () => {
    const user = userEvent.setup()
    vi.mocked(useWordingCheck).mockReturnValue({ allowed: true, findings: [] })
    renderPage()

    await user.click(screen.getByRole('button', { name: /new campaign/i }))

    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.queryByRole('alert')).not.toBeInTheDocument()
    expect(dialog.queryByRole('status')).not.toBeInTheDocument()
  })

  it('opens the normal form pre-filled from the builder draft, and saves it only when the merchant confirms', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /help me plan a campaign/i }))
    await user.click(screen.getByRole('button', { name: /use this draft/i }))

    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByLabelText(/^title/i)).toHaveValue('Share your honest review of Brew Bar')
    expect(dialog.getByLabelText(/reward per participant/i)).toHaveValue(40)
    expect(saveMutateMock).not.toHaveBeenCalled()

    await user.click(dialog.getByRole('button', { name: /create draft/i }))

    await waitFor(() =>
      expect(saveMutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Share your honest review of Brew Bar',
          rewardAmount: 40,
          totalBudget: 4000,
          maxParticipants: 100,
          startAt: '2026-10-01T00:00:00.000Z',
          endAt: '2026-10-08T00:00:00.000Z',
        }),
      ),
    )
  })

  it('submits a draft campaign for review', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^submit$/i }))
    expect(actionMutateMock).toHaveBeenCalledWith({ id: 'campaign-1', action: 'submit' })
  })

  it('cancels a campaign after confirming', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /cancel campaign/i }))

    await waitFor(() => expect(actionMutateMock).toHaveBeenCalledWith({ id: 'campaign-1', action: 'cancel' }))
  })

  it('deletes a campaign after confirming', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => expect(deleteMutateMock).toHaveBeenCalledWith('campaign-1'))
  })

  it('activates an approved campaign', async () => {
    vi.mocked(useCampaignsQuery).mockReturnValue({
      data: { data: { data: { data: [{ ...draftCampaign, status: 'APPROVED' }], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /activate/i }))
    expect(actionMutateMock).toHaveBeenCalledWith({ id: 'campaign-1', action: 'activate' })
  })
})
