import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useCreateTicketMutation,
  useReplyToTicketMutation,
  useSupportTicketQuery,
  useSupportTicketsQuery,
} from '@/hooks/useSupport'
import { useAuthStore } from '@/stores/auth.store'

import SupportPage from './SupportPage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/hooks/useSupport', () => ({
  useSupportTicketsQuery: vi.fn(),
  useSupportTicketQuery: vi.fn(),
  useCreateTicketMutation: vi.fn(),
  useReplyToTicketMutation: vi.fn(),
}))

const ticket = {
  id: 'ticket-1',
  subject: 'Payout delayed',
  description: 'My withdrawal has been pending for 5 days.',
  category: 'WITHDRAWAL',
  priority: 'HIGH',
  status: 'OPEN',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  messages: [],
}

const createMutateMock = vi.fn()
const replyMutateMock = vi.fn()

function mockAuthState(merchantId: string | undefined) {
  vi.mocked(useAuthStore).mockImplementation(
    ((selector: (s: { merchant: { id: string } | null }) => unknown) => selector({ merchant: merchantId ? { id: merchantId } : null })) as unknown as typeof useAuthStore,
  )
}

function renderPage() {
  return render(<SupportPage />)
}

describe('SupportPage', () => {
  beforeEach(() => {
    mockAuthState('merchant-1')
    vi.mocked(useSupportTicketsQuery).mockReturnValue({
      data: { data: { data: { data: [ticket], total: 1, page: 1, limit: 10 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useSupportTicketQuery).mockReturnValue({ data: undefined, isLoading: false } as never)
    vi.mocked(useCreateTicketMutation).mockReturnValue({ mutate: createMutateMock, isPending: false } as never)
    vi.mocked(useReplyToTicketMutation).mockReturnValue({ mutate: replyMutateMock, isPending: false } as never)
    createMutateMock.mockReset()
    replyMutateMock.mockReset()
  })

  it('shows an empty state when there are no tickets', () => {
    vi.mocked(useSupportTicketsQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 10 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()
    expect(screen.getByText(/no support tickets yet/i)).toBeInTheDocument()
  })

  it('renders a ticket row with subject, category, and priority', () => {
    renderPage()

    expect(screen.getByText('Payout delayed')).toBeInTheDocument()
    expect(screen.getByText('Withdrawal')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('submits a new ticket', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new ticket/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/subject/i), 'Cannot verify my PAN')
    await user.type(dialog.getByLabelText(/description/i), 'The PAN upload keeps failing verification.')
    await user.click(dialog.getByRole('button', { name: /submit ticket/i }))

    await waitFor(() =>
      expect(createMutateMock).toHaveBeenCalledWith({
        subject: 'Cannot verify my PAN',
        description: 'The PAN upload keeps failing verification.',
        category: 'GENERAL',
        priority: 'MEDIUM',
      }),
    )
  })

  it('opens a ticket thread and sends a reply', async () => {
    vi.mocked(useSupportTicketQuery).mockReturnValue({ data: { data: { data: ticket } }, isLoading: false } as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByText('Payout delayed'))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText(/pending for 5 days/i)).toBeInTheDocument()

    await user.type(dialog.getByPlaceholderText(/type a reply/i), 'Any update on this?')
    await user.click(dialog.getByRole('button', { name: /send/i }))

    expect(replyMutateMock).toHaveBeenCalledWith('Any update on this?')
  })
})
