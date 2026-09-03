import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useReviewMutations, useReviewsQuery, useReviewStatsQuery } from '@/hooks/useReviews'
import { useAuthStore } from '@/stores/auth.store'

import ReviewsPage from './ReviewsPage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/hooks/useReviews', () => ({
  useReviewsQuery: vi.fn(),
  useReviewStatsQuery: vi.fn(),
  useReviewMutations: vi.fn(),
}))

const review = {
  id: 'review-1',
  merchantId: 'merchant-1',
  customerName: 'Alex Kim',
  customerEmail: null,
  source: 'GOOGLE',
  rating: 5,
  title: 'Great experience',
  body: 'Loved the service, will come back again.',
  status: 'PENDING',
  reply: null,
  repliedAt: null,
  repliedBy: null,
  reviewedAt: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const stats = { total: 12, averageRating: 4.5, repliedCount: 8, pendingCount: 4, responseRate: 0.67 }

const createMutateMock = vi.fn()
const invalidateReviewsMock = vi.fn()

function mockAuthState(merchantId: string | undefined) {
  vi.mocked(useAuthStore).mockImplementation(
    ((selector: (s: { merchant: { id: string } | null }) => unknown) => selector({ merchant: merchantId ? { id: merchantId } : null })) as unknown as typeof useAuthStore,
  )
}

function renderPage() {
  return render(<ReviewsPage />)
}

describe('ReviewsPage', () => {
  beforeEach(() => {
    mockAuthState('merchant-1')
    vi.mocked(useReviewsQuery).mockReturnValue({
      data: { data: { data: { data: [review], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isFetching: false,
    } as never)
    vi.mocked(useReviewStatsQuery).mockReturnValue({ data: { data: { data: stats } } } as never)
    vi.mocked(useReviewMutations).mockReturnValue({
      replyMutation: { mutateAsync: vi.fn(), isPending: false },
      resolveMutation: { mutateAsync: vi.fn(), isPending: false },
      createMutation: { mutate: createMutateMock, isPending: false },
      invalidateReviews: invalidateReviewsMock,
    } as never)
    createMutateMock.mockReset()
    invalidateReviewsMock.mockReset()
  })

  it('shows an empty state when there are no reviews', () => {
    vi.mocked(useReviewsQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 20 } } },
      isLoading: false,
      isFetching: false,
    } as never)
    renderPage()
    expect(screen.getByText(/no reviews found/i)).toBeInTheDocument()
  })

  it('renders the stat cards and a review', () => {
    renderPage()

    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('4.5')).toBeInTheDocument()
    expect(screen.getByText('Alex Kim')).toBeInTheDocument()
    expect(screen.getByText('Loved the service, will come back again.')).toBeInTheDocument()
  })

  it('disables export when there are no reviews', () => {
    vi.mocked(useReviewsQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 20 } } },
      isLoading: false,
      isFetching: false,
    } as never)
    renderPage()
    expect(screen.getByRole('button', { name: /export this page as csv/i })).toBeDisabled()
  })

  it('refreshes reviews', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /refresh reviews/i }))
    expect(invalidateReviewsMock).toHaveBeenCalled()
  })

  it('filters reviews by search text', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/search reviews/i), 'Alex')

    await waitFor(() =>
      expect(useReviewsQuery).toHaveBeenLastCalledWith('merchant-1', expect.objectContaining({ search: 'Alex' })),
    )
  })

  it('logs a new review', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /log a new review/i }))
    const dialog = within(screen.getByRole('dialog', { name: /log a review/i }))
    await user.type(dialog.getByLabelText(/customer name/i), 'Priya Sharma')
    await user.type(dialog.getByLabelText(/review text/i), 'Excellent support team.')
    await user.click(dialog.getByRole('button', { name: /save review/i }))

    await waitFor(() =>
      expect(createMutateMock).toHaveBeenCalledWith(
        expect.objectContaining({ customerName: 'Priya Sharma', body: 'Excellent support team.', source: 'GOOGLE', rating: 5 }),
      ),
    )
  })
})
