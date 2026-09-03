import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useApproveRefundMutation, useRefundQueueQuery, useRejectRefundMutation } from '@/hooks/useRefundQueue'

import RefundApprovalsPage from './RefundApprovalsPage'

vi.mock('@/hooks/useRefundQueue', () => ({
  useRefundQueueQuery: vi.fn(),
  useApproveRefundMutation: vi.fn(),
  useRejectRefundMutation: vi.fn(),
}))

const refund = {
  id: 'refund-1',
  amount: '1500',
  reason: 'Unused campaign budget',
  status: 'PENDING',
  createdAt: '2026-01-01T00:00:00Z',
  bankAccount: { bankName: 'HDFC Bank', accountNumber: '1234567890', accountHolderName: 'Demo Merchant' },
}

const approveMock = vi.fn()
const rejectMock = vi.fn()

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <RefundApprovalsPage />
    </QueryClientProvider>,
  )
}

describe('RefundApprovalsPage', () => {
  beforeEach(() => {
    vi.mocked(useRefundQueueQuery).mockReturnValue({
      data: { data: { data: { data: [refund], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useApproveRefundMutation).mockReturnValue({ mutate: approveMock, isPending: false } as never)
    vi.mocked(useRejectRefundMutation).mockReturnValue({ mutate: rejectMock, isPending: false } as never)
    approveMock.mockReset()
    rejectMock.mockReset()
  })

  it('shows an empty state when there are no pending refunds', () => {
    vi.mocked(useRefundQueueQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.getByText(/no pending refunds/i)).toBeInTheDocument()
  })

  it('renders a pending refund with amount, bank account, and reason', () => {
    renderPage()

    expect(screen.getByText(/1,500/)).toBeInTheDocument()
    expect(screen.getByText(/HDFC Bank/)).toBeInTheDocument()
    expect(screen.getByText('Unused campaign budget')).toBeInTheDocument()
  })

  it('approves a refund after confirming', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /approve/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /^approve$/i }))

    await waitFor(() => expect(approveMock).toHaveBeenCalledWith('refund-1'))
  })

  it('requires a reason of at least 5 characters before rejecting', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /reject/i }))
    const dialog = within(screen.getByRole('dialog'))
    const rejectButton = dialog.getByRole('button', { name: /^reject$/i })
    expect(rejectButton).toBeDisabled()

    await user.type(dialog.getByLabelText(/reason for rejection/i), 'Bank mismatch')
    expect(rejectButton).toBeEnabled()

    await user.click(rejectButton)
    await waitFor(() => expect(rejectMock).toHaveBeenCalledWith({ id: 'refund-1', reason: 'Bank mismatch' }))
  })
})
