import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCampaignMutations, useCampaignsQuery } from '@/hooks/useCampaigns'
import { useSubscriptionMutations, useSubscriptionQuery } from '@/hooks/useSubscription'
import { useWalletQuery } from '@/hooks/useWallet'
import { useWordingCheck } from '@/hooks/useWordingCheck'
import { useAuthStore } from '@/stores/auth.store'
import { dateInputToIso, isoToDateInput } from '@/utils/campaign-dates'

import CampaignsPage from './CampaignsPage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
const coverMocks = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn() }))
// jsdom has no object URLs, which the cover preview uses for a picture chosen on the device.
URL.createObjectURL = vi.fn(() => 'blob:cover-preview')
URL.revokeObjectURL = vi.fn()
vi.mock('@/hooks/useCampaigns', () => ({
  useCampaignsQuery: vi.fn(),
  useCampaignMutations: vi.fn(),
  useCampaignCoverMutations: () => ({
    uploadCover: { mutate: coverMocks.upload },
    removeCover: { mutate: coverMocks.remove, isPending: false },
  }),
}))
vi.mock('@/hooks/useWordingCheck', () => ({ useWordingCheck: vi.fn() }))
vi.mock('@/hooks/useWallet', () => ({ useWalletQuery: vi.fn() }))
vi.mock('@/hooks/useCampaignTasks', () => ({
  useCampaignTasksQuery: () => ({
    data: { data: { data: { title: 'Summer Sale Reviews', description: 'Collect reviews for the summer sale.', status: 'DRAFT', campaignType: 'REVIEW', rewardType: 'CASH', rewardAmount: '50', totalBudget: '5000', spentBudget: '0', remainingBudget: '5000', maxParticipants: null, currentParticipants: 0, startAt: null, endAt: null, createdAt: '2026-01-01T00:00:00Z', tasks: [{ id: 'task-1', title: 'Upload your bill', taskType: 'SCREENSHOT', proofType: 'SCREENSHOT', verificationType: 'MANUAL', completionLimit: 'ONCE', required: true, taskOrder: 0, instructions: null, description: null, configuration: null, campaignId: 'campaign-1' }] } } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCampaignTaskMutations: () => ({ saveMutation: { mutate: vi.fn(), isPending: false }, deleteMutation: { mutate: vi.fn(), isPending: false } }),
}))
vi.mock('@/hooks/useSubscription', () => ({ useSubscriptionQuery: vi.fn(), useSubscriptionMutations: vi.fn() }))
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
        startAt: '2030-10-01T06:00:00.000Z',
        endAt: '2030-10-08T06:00:00.000Z',
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
const duplicateMutateMock = vi.fn()
const featureMutateMock = vi.fn()

function mockAuthState(merchantId: string | undefined) {
  vi.mocked(useAuthStore).mockImplementation(
    ((selector: (s: { merchant: { id: string } | null }) => unknown) => selector({ merchant: merchantId ? { id: merchantId } : null })) as unknown as typeof useAuthStore,
  )
}

function withWallet(availableBalance: number) {
  vi.mocked(useWalletQuery).mockReturnValue({ data: { data: { data: { availableBalance: String(availableBalance) } } }, isLoading: false, isError: false } as never)
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CampaignsPage />
    </MemoryRouter>,
  )
}

describe('CampaignsPage', () => {
  beforeEach(() => {
    vi.mocked(useWordingCheck).mockReset()
    coverMocks.upload.mockClear()
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
      duplicateMutation: { mutate: duplicateMutateMock, isPending: false },
    } as never)
    saveMutateMock.mockReset()
    actionMutateMock.mockReset()
    deleteMutateMock.mockReset()
    duplicateMutateMock.mockReset()
    featureMutateMock.mockReset()
    vi.mocked(useSubscriptionQuery).mockReturnValue({ data: { data: { data: { featured: { price: 199, days: 7, priceWithGst: 234.82 } } } } } as never)
    vi.mocked(useSubscriptionMutations).mockReturnValue({ feature: { mutate: featureMutateMock, isPending: false } } as never)
    withWallet(10000)
  })

  it('features a running campaign after saying what it costs', async () => {
    vi.mocked(useCampaignsQuery).mockReturnValue({
      data: { data: { data: { data: [{ ...draftCampaign, status: 'ACTIVE' }], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Feature' }))
    expect(screen.getByText(/for 7 days/)).toBeInTheDocument()
    expect(screen.getByText(/234\.82/)).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Feature' }))

    expect(featureMutateMock).toHaveBeenCalledWith(draftCampaign.id, expect.anything())
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
        expect.anything(),
      ),
    )
  })

  it('uploads the chosen cover image once the new campaign is saved, using its new id', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new campaign/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/^title/i), 'Winter Review Drive')
    await user.type(dialog.getByLabelText(/full description/i), 'Collect reviews during the winter promotion period.')
    const cover = new File(['jpeg bytes'], 'cafe.jpg', { type: 'image/jpeg' })
    await user.upload(dialog.getByLabelText(/cover image/i), cover)
    expect(dialog.getByAltText('Cover preview')).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: /create draft/i }))

    await waitFor(() => expect(saveMutateMock).toHaveBeenCalled())
    expect(coverMocks.upload).not.toHaveBeenCalled()
    // The save comes back with the new campaign's id; only then can the picture be attached to it.
    saveMutateMock.mock.calls[0][1].onSuccess({ data: { data: { id: 'campaign-9' } } })
    expect(coverMocks.upload).toHaveBeenCalledWith({ campaignId: 'campaign-9', file: cover })
  })

  it('refuses a cover that is not a JPEG, PNG or WebP picture', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderPage()

    await user.click(screen.getByRole('button', { name: /new campaign/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.upload(dialog.getByLabelText(/cover image/i), new File(['%PDF'], 'menu.pdf', { type: 'application/pdf' }))

    expect(dialog.getByRole('alert')).toHaveTextContent('Choose a JPEG, PNG or WebP picture')
    expect(dialog.queryByAltText('Cover preview')).not.toBeInTheDocument()
  })

  it('sends the dates as whole days: from the start of the first to the end of the last', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new campaign/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/^title/i), 'Winter Review Drive')
    await user.type(dialog.getByLabelText(/full description/i), 'Collect reviews during the winter promotion period.')
    await user.type(dialog.getByLabelText(/start date/i), '2030-01-10')
    await user.type(dialog.getByLabelText(/end date/i), '2030-01-20')
    await user.click(dialog.getByRole('button', { name: /create draft/i }))

    await waitFor(() =>
      expect(saveMutateMock).toHaveBeenCalledWith(
        expect.objectContaining({ startAt: dateInputToIso('2030-01-10', 'start'), endAt: dateInputToIso('2030-01-20', 'end') }),
        expect.anything(),
      ),
    )
  })

  it('leaves out the number boxes left empty, so the server keeps its defaults', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new campaign/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/^title/i), 'Mango Cafe Feedback')
    await user.type(dialog.getByLabelText(/full description/i), 'Visit the cafe and share your honest experience.')
    await user.click(dialog.getByRole('button', { name: /create draft/i }))

    await waitFor(() => expect(saveMutateMock).toHaveBeenCalled())
    const sent = saveMutateMock.mock.calls[0][0]
    for (const field of ['minimumAge', 'maximumAge', 'minimumFollowers', 'maxParticipants']) {
      expect(sent[field]).toBeUndefined()
    }
    // What reaches the server: nothing for them at all, never null.
    expect(JSON.parse(JSON.stringify(sent))).not.toHaveProperty('minimumFollowers')
  })

  it('leaves the dates out of a new campaign when none are given', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new campaign/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/^title/i), 'Winter Review Drive')
    await user.type(dialog.getByLabelText(/full description/i), 'Collect reviews during the winter promotion period.')
    await user.click(dialog.getByRole('button', { name: /create draft/i }))

    await waitFor(() => expect(saveMutateMock).toHaveBeenCalled())
    expect(saveMutateMock.mock.calls[0][0].startAt).toBeUndefined()
    expect(saveMutateMock.mock.calls[0][0].endAt).toBeUndefined()
  })

  it('refuses an end date before the start date, and does not save', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new campaign/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/^title/i), 'Winter Review Drive')
    await user.type(dialog.getByLabelText(/full description/i), 'Collect reviews during the winter promotion period.')
    await user.type(dialog.getByLabelText(/start date/i), '2030-01-20')
    await user.type(dialog.getByLabelText(/end date/i), '2030-01-10')
    await user.click(dialog.getByRole('button', { name: /create draft/i }))

    expect(await dialog.findByText(/on or after the start date/i)).toBeInTheDocument()
    expect(saveMutateMock).not.toHaveBeenCalled()
  })

  it('asks for no reward type: every reward is money paid into the wallet', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new campaign/i }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.queryByLabelText(/reward type/i)).not.toBeInTheDocument()
    await user.type(dialog.getByLabelText(/^title/i), 'Winter Review Drive')
    await user.type(dialog.getByLabelText(/full description/i), 'Collect reviews during the winter promotion period.')
    await user.click(dialog.getByRole('button', { name: /create draft/i }))

    await waitFor(() => expect(saveMutateMock).toHaveBeenCalled())
    expect(saveMutateMock.mock.calls[0][0]).not.toHaveProperty('rewardType')
  })

  it('saves an edit without the campaign type, which can not change after creation', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByLabelText(/campaign type/i)).toBeDisabled()
    await user.clear(dialog.getByLabelText(/^title/i))
    await user.type(dialog.getByLabelText(/^title/i), 'Mango Cafe Feedback')
    await user.click(dialog.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(saveMutateMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Mango Cafe Feedback' }), expect.anything()))
    const sent = saveMutateMock.mock.calls[0][0]
    expect(sent).not.toHaveProperty('campaignType')
    expect(sent).not.toHaveProperty('rewardType')
  })

  it('clears a saved end date when the field is emptied on an edit', async () => {
    vi.mocked(useCampaignsQuery).mockReturnValue({
      data: { data: { data: { data: [{ ...draftCampaign, startAt: null, endAt: '2030-01-20T18:29:59.999Z' }], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByText(/Ends/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.clear(dialog.getByLabelText(/end date/i))
    await user.click(dialog.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(saveMutateMock).toHaveBeenCalledWith(expect.objectContaining({ startAt: null, endAt: null }), expect.anything()))
  })

  it('offers only the campaign types that work today: review, share and follow', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new campaign/i }))
    const select = within(screen.getByRole('dialog')).getByLabelText(/campaign type/i)
    const offered = within(select).getAllByRole('option').map((option) => option.getAttribute('value'))

    expect(offered).toEqual(['REVIEW', 'SOCIAL_SHARE', 'SOCIAL_FOLLOW'])
  })

  it("links a submitted campaign to its submissions, but not a draft, which can not have any", () => {
    vi.mocked(useCampaignsQuery).mockReturnValue({
      data: { data: { data: { data: [draftCampaign, { ...draftCampaign, id: 'campaign-2', title: 'Live one', status: 'ACTIVE' }], total: 2, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()

    const links = screen.getAllByRole('link', { name: 'Submissions' })
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/submissions?campaignId=campaign-2')
  })

  it('opens a campaign to view everything the merchant set up', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^view$/i }))

    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('Tasks (1)')).toBeInTheDocument()
    expect(dialog.getByText(/Upload your bill/)).toBeInTheDocument()
  })

  it("opens a campaign's tasks", async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^tasks$/i }))

    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText(/Upload your bill/)).toBeInTheDocument()
    expect(dialog.getByRole('button', { name: /add task/i })).toBeInTheDocument()
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
          // Whole days in the merchant's time zone: from the start of the first to the end of the last.
          startAt: dateInputToIso(isoToDateInput('2030-10-01T06:00:00.000Z'), 'start'),
          endAt: dateInputToIso(isoToDateInput('2030-10-08T06:00:00.000Z'), 'end'),
        }),
        expect.anything(),
      ),
    )
  })

  it('duplicates a campaign into a new draft', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^duplicate$/i }))
    expect(duplicateMutateMock).toHaveBeenCalledWith('campaign-1')
  })

  it('submits a draft campaign for review after showing its budget against the wallet', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^submit$/i }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('₹5,000.00')).toBeInTheDocument()
    expect(dialog.getByText('₹10,000.00')).toBeInTheDocument()
    expect(dialog.getByText(/your money is safe with us/i)).toBeInTheDocument()
    expect(actionMutateMock).not.toHaveBeenCalled()

    await user.click(dialog.getByRole('button', { name: /submit for review/i }))
    expect(actionMutateMock).toHaveBeenCalledWith({ id: 'campaign-1', action: 'submit' })
  })

  it('does not submit when the wallet can not pay the budget, and says how much to add', async () => {
    withWallet(1200)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^submit$/i }))
    const dialog = within(screen.getByRole('dialog'))

    expect(dialog.getByRole('alert')).toHaveTextContent('Add ₹3,800.00 to your wallet')
    expect(dialog.queryByRole('button', { name: /submit for review/i })).not.toBeInTheDocument()
    expect(dialog.getByRole('link', { name: 'Add funds' })).toHaveAttribute('href', '/wallet')
  })

  it('shows the wallet balance under the budget while writing a campaign', async () => {
    withWallet(250)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new campaign/i }))

    expect(within(screen.getByRole('dialog')).getByText('Your wallet: ₹250.00 available')).toBeInTheDocument()
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
