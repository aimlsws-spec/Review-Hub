import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useDisputesQuery, useResolveDisputeMutation } from '@/hooks/useDisputes'

import DisputesPage from './DisputesPage'

vi.mock('@/hooks/useDisputes', () => ({
  useDisputesQuery: vi.fn(),
  useResolveDisputeMutation: vi.fn(),
}))

const dispute = {
  id: 'dispute-1',
  submissionId: 'submission-1',
  userId: 'user-1',
  reason: 'I completed the task correctly, the screenshot just cropped the timestamp.',
  status: 'OPEN',
  adminNotes: null,
  resolvedBy: null,
  resolvedAt: null,
  createdAt: '2026-09-20T00:00:00Z',
  user: { id: 'user-1', firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com', phone: null, avatarUrl: null },
  submission: { id: 'submission-1', status: 'REJECTED', rejectionReason: 'Screenshot missing timestamp', task: { id: 'task-1', title: 'Follow us on Instagram' } },
}

const resolveMock = vi.fn()

function renderPage() {
  return render(<DisputesPage />)
}

describe('DisputesPage', () => {
  beforeEach(() => {
    vi.mocked(useDisputesQuery).mockReturnValue({
      data: { data: { data: { data: [dispute], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useResolveDisputeMutation).mockReturnValue({ mutate: resolveMock, isPending: false } as never)
    resolveMock.mockReset()
  })

  it('shows an empty state when there are no disputes', () => {
    vi.mocked(useDisputesQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()
    expect(screen.getByText(/no disputes/i)).toBeInTheDocument()
  })

  it('renders a dispute row with the user, task and reason', () => {
    renderPage()

    expect(screen.getByText('Asha Rao')).toBeInTheDocument()
    expect(screen.getByText('Follow us on Instagram')).toBeInTheDocument()
  })

  it('does not offer to resolve an already-resolved dispute', () => {
    vi.mocked(useDisputesQuery).mockReturnValue({
      data: { data: { data: { data: [{ ...dispute, status: 'UPHELD' }], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()

    expect(screen.queryByRole('button', { name: /resolve/i })).not.toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('Upheld')).toBeInTheDocument()
  })

  it('upholds the rejection', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /resolve/i }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /uphold rejection/i }))

    await waitFor(() => expect(resolveMock).toHaveBeenCalledWith({ disputeId: 'dispute-1', decision: 'UPHELD', notes: '' }))
  })

  it('reverses the decision with admin notes', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /resolve/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/admin notes/i), 'Timestamp visible on the original')
    await user.click(within(dialog).getByRole('button', { name: /reverse/i }))

    await waitFor(() =>
      expect(resolveMock).toHaveBeenCalledWith({
        disputeId: 'dispute-1',
        decision: 'REVERSED',
        notes: 'Timestamp visible on the original',
      }),
    )
  })
})
