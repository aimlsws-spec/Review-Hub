import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useBadgesQuery, useDeleteBadgeMutation, useSaveBadgeMutation } from '@/hooks/useBadges'

import BadgesPage from './BadgesPage'

vi.mock('@/hooks/useBadges', () => ({
  useBadgesQuery: vi.fn(),
  useSaveBadgeMutation: vi.fn(),
  useDeleteBadgeMutation: vi.fn(),
}))

const badge = {
  id: 'badge-1',
  code: 'FIRST_REWARD',
  name: 'First Reward',
  description: 'Earned your first task reward.',
  iconUrl: null,
  criteriaType: 'REWARD_COUNT',
  criteriaValue: 1,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const saveMock = vi.fn()
const removeMock = vi.fn()

function renderPage() {
  return render(<BadgesPage />)
}

describe('BadgesPage', () => {
  beforeEach(() => {
    vi.mocked(useBadgesQuery).mockReturnValue({
      data: { data: { data: { data: [badge], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useSaveBadgeMutation).mockReturnValue({ mutate: saveMock, isPending: false } as never)
    vi.mocked(useDeleteBadgeMutation).mockReturnValue({ mutate: removeMock, isPending: false } as never)
    saveMock.mockReset()
    removeMock.mockReset()
  })

  it('shows an empty state when there are no badges', () => {
    vi.mocked(useBadgesQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()
    expect(screen.getByText(/no badges yet/i)).toBeInTheDocument()
  })

  it('renders a badge row with code, name, and criteria', () => {
    renderPage()

    expect(screen.getByText('FIRST_REWARD')).toBeInTheDocument()
    expect(screen.getByText('First Reward')).toBeInTheDocument()
    expect(screen.getByText(/reward count ≥ 1/i)).toBeInTheDocument()
  })

  it('creates a new badge', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new badge/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/^code/i), 'STREAK_7')
    await user.type(dialog.getByLabelText(/^name/i), 'Week Streak')
    await user.type(dialog.getByLabelText(/description/i), 'Maintained a 7-day streak.')
    await user.clear(dialog.getByLabelText(/criteria value/i))
    await user.type(dialog.getByLabelText(/criteria value/i), '7')

    await user.click(dialog.getByRole('button', { name: /create badge/i }))

    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith({
        editingId: null,
        form: expect.objectContaining({ code: 'STREAK_7', name: 'Week Streak', criteriaValue: 7 }),
      }),
    )
  })

  it('edits an existing badge without changing its code', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /edit/i }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByLabelText(/^code/i)).toBeDisabled()

    await user.click(dialog.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith({ editingId: 'badge-1', form: expect.objectContaining({ name: 'First Reward' }) }),
    )
  })

  it('deletes a badge after confirming', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /delete/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => expect(removeMock).toHaveBeenCalledWith('badge-1'))
  })
})
