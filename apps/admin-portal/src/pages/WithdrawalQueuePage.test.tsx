import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useApproveWithdrawalMutation, useRejectWithdrawalMutation, useWithdrawalQueueQuery } from '@/hooks/useWithdrawalQueue'

import WithdrawalQueuePage from './WithdrawalQueuePage'

vi.mock('@/hooks/useWithdrawalQueue', () => ({
  useWithdrawalQueueQuery: vi.fn(),
  useApproveWithdrawalMutation: vi.fn(),
  useRejectWithdrawalMutation: vi.fn(),
}))

const withdrawal = {
  id: 'wd-1',
  walletId: 'wallet-1',
  bankAccountId: 'bank-1',
  amount: '2500',
  finalAmount: '2500',
  status: 'PENDING',
  rejectionReason: null,
  processedBy: null,
  processedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  bankAccount: { bankName: 'ICICI Bank', accountNumber: '9876543210', accountHolderName: 'Demo User' },
}

const approveMock = vi.fn()
const rejectMock = vi.fn()

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <WithdrawalQueuePage />
    </QueryClientProvider>,
  )
}

describe('WithdrawalQueuePage', () => {
  beforeEach(() => {
    vi.mocked(useWithdrawalQueueQuery).mockReturnValue({
      data: { data: { data: { data: [withdrawal], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useApproveWithdrawalMutation).mockReturnValue({ mutate: approveMock, isPending: false } as never)
    vi.mocked(useRejectWithdrawalMutation).mockReturnValue({ mutate: rejectMock, isPending: false } as never)
    approveMock.mockReset()
    rejectMock.mockReset()
  })

  it('shows an empty state when there are no pending withdrawals', () => {
    vi.mocked(useWithdrawalQueueQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.getByText(/no pending withdrawals/i)).toBeInTheDocument()
  })

  it('shows an error state with a retry action', async () => {
    const refetch = vi.fn()
    vi.mocked(useWithdrawalQueueQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it('renders a pending withdrawal with amount and bank account', () => {
    renderPage()

    expect(screen.getByText(/2,500/)).toBeInTheDocument()
    expect(screen.getByText(/ICICI Bank/)).toBeInTheDocument()
    expect(screen.getByText(/3210/)).toBeInTheDocument()
  })

  it('approves a withdrawal after confirming', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /approve/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /^approve$/i }))

    await waitFor(() => expect(approveMock).toHaveBeenCalledWith('wd-1'))
  })

  it('requires a reason of at least 5 characters before rejecting', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /reject/i }))
    const dialog = within(screen.getByRole('dialog'))
    const rejectButton = dialog.getByRole('button', { name: /^reject$/i })
    expect(rejectButton).toBeDisabled()

    await user.type(dialog.getByLabelText(/reason for rejection/i), 'Suspicious activity')
    expect(rejectButton).toBeEnabled()

    await user.click(rejectButton)
    await waitFor(() => expect(rejectMock).toHaveBeenCalledWith({ id: 'wd-1', reason: 'Suspicious activity' }))
  })
})
