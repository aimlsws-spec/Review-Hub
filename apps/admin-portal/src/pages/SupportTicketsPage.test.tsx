import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useReplySupportTicketMutation,
  useSupportTicketDetailQuery,
  useSupportTicketsQuery,
  useUpdateSupportTicketStatusMutation,
} from '@/hooks/useSupportTickets'

import SupportTicketsPage from './SupportTicketsPage'

vi.mock('@/hooks/useSupportTickets', () => ({
  useSupportTicketsQuery: vi.fn(),
  useSupportTicketDetailQuery: vi.fn(),
  useReplySupportTicketMutation: vi.fn(),
  useUpdateSupportTicketStatusMutation: vi.fn(),
}))

const ticket = {
  id: 'ticket-1',
  userId: 'user-1',
  merchantId: null,
  subject: 'Reward missing',
  description: 'I completed a task but did not receive my reward.',
  category: 'REWARD',
  priority: 'MEDIUM',
  status: 'OPEN',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  messages: [],
}

const replyMock = vi.fn()
const changeStatusMock = vi.fn()

function renderPage() {
  return render(<SupportTicketsPage />)
}

describe('SupportTicketsPage', () => {
  beforeEach(() => {
    vi.mocked(useSupportTicketsQuery).mockReturnValue({
      data: { data: { data: { data: [ticket], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useSupportTicketDetailQuery).mockReturnValue({ data: undefined, isLoading: false } as never)
    vi.mocked(useReplySupportTicketMutation).mockReturnValue({ mutate: replyMock, isPending: false } as never)
    vi.mocked(useUpdateSupportTicketStatusMutation).mockReturnValue({ mutate: changeStatusMock } as never)
    replyMock.mockReset()
    changeStatusMock.mockReset()
  })

  it('shows an empty state when there are no tickets', () => {
    vi.mocked(useSupportTicketsQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()
    expect(screen.getByText(/no support tickets/i)).toBeInTheDocument()
  })

  it('renders a ticket row identifying the requester as a user', () => {
    renderPage()

    expect(screen.getByText('Reward missing')).toBeInTheDocument()
    expect(screen.getByText('User')).toBeInTheDocument()
  })

  it('opens a ticket thread, changes status, and sends a reply', async () => {
    vi.mocked(useSupportTicketDetailQuery).mockReturnValue({ data: { data: { data: ticket } }, isLoading: false } as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByText('Reward missing'))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText(/did not receive my reward/i)).toBeInTheDocument()

    await user.selectOptions(dialog.getByRole('combobox'), 'RESOLVED')
    expect(changeStatusMock).toHaveBeenCalledWith('RESOLVED')

    await user.type(dialog.getByPlaceholderText(/type a reply/i), 'Reward has been credited manually.')
    await user.click(dialog.getByRole('button', { name: /send/i }))

    expect(replyMock).toHaveBeenCalledWith({ message: 'Reward has been credited manually.', internalNote: false })
  })

  it('sends an internal note when the checkbox is checked', async () => {
    vi.mocked(useSupportTicketDetailQuery).mockReturnValue({ data: { data: { data: ticket } }, isLoading: false } as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByText('Reward missing'))
    const dialog = within(screen.getByRole('dialog'))

    await user.click(dialog.getByRole('checkbox'))
    await user.type(dialog.getByPlaceholderText(/type a reply/i), 'Escalating to finance team.')
    await user.click(dialog.getByRole('button', { name: /send/i }))

    expect(replyMock).toHaveBeenCalledWith({ message: 'Escalating to finance team.', internalNote: true })
  })
})
