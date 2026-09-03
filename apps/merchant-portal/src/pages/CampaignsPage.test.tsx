import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCampaignMutations, useCampaignsQuery } from '@/hooks/useCampaigns'
import { useAuthStore } from '@/stores/auth.store'

import CampaignsPage from './CampaignsPage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/hooks/useCampaigns', () => ({ useCampaignsQuery: vi.fn(), useCampaignMutations: vi.fn() }))

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
