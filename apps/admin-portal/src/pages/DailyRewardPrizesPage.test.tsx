import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useDailyRewardPrizesQuery,
  useDeleteDailyRewardPrizeMutation,
  useSaveDailyRewardPrizeMutation,
} from '@/hooks/useDailyRewardPrizes'

import DailyRewardPrizesPage from './DailyRewardPrizesPage'

vi.mock('@/hooks/useDailyRewardPrizes', () => ({
  useDailyRewardPrizesQuery: vi.fn(),
  useSaveDailyRewardPrizeMutation: vi.fn(),
  useDeleteDailyRewardPrizeMutation: vi.fn(),
}))

const prize = {
  id: 'prize-1',
  label: '₹10 Bonus',
  amount: 10,
  weight: 10,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const saveMock = vi.fn()
const removeMock = vi.fn()

function renderPage() {
  return render(<DailyRewardPrizesPage />)
}

describe('DailyRewardPrizesPage', () => {
  beforeEach(() => {
    vi.mocked(useDailyRewardPrizesQuery).mockReturnValue({
      data: { data: { data: { data: [prize], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useSaveDailyRewardPrizeMutation).mockReturnValue({ mutate: saveMock, isPending: false } as never)
    vi.mocked(useDeleteDailyRewardPrizeMutation).mockReturnValue({ mutate: removeMock, isPending: false } as never)
    saveMock.mockReset()
    removeMock.mockReset()
  })

  it('shows an empty state when there are no prizes', () => {
    vi.mocked(useDailyRewardPrizesQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()
    expect(screen.getByText(/no prizes yet/i)).toBeInTheDocument()
  })

  it('renders a prize row with label, amount, and weight', () => {
    renderPage()

    expect(screen.getByText('₹10 Bonus')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('creates a new prize', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new prize/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/label/i), '₹50 Bonus')
    await user.type(dialog.getByLabelText(/amount/i), '50')
    await user.type(dialog.getByLabelText(/weight/i), '5')

    await user.click(dialog.getByRole('button', { name: /create prize/i }))

    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith({
        editingId: null,
        form: { label: '₹50 Bonus', amount: 50, weight: 5, isActive: true },
      }),
    )
  })

  it('edits an existing prize', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /edit/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith({ editingId: 'prize-1', form: expect.objectContaining({ label: '₹10 Bonus' }) }),
    )
  })

  it('deletes a prize after confirming', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /delete/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => expect(removeMock).toHaveBeenCalledWith('prize-1'))
  })
})
