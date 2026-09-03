import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useBankAccountsQuery } from '@/hooks/useDocuments'
import { useCreateRefundMutation, useRefundsQuery } from '@/hooks/useRefunds'
import { useWalletQuery } from '@/hooks/useWallet'
import { useAuthStore } from '@/stores/auth.store'

import RefundsPage from './RefundsPage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/hooks/useWallet', () => ({ useWalletQuery: vi.fn() }))
vi.mock('@/hooks/useDocuments', () => ({ useBankAccountsQuery: vi.fn() }))
vi.mock('@/hooks/useRefunds', () => ({ useRefundsQuery: vi.fn(), useCreateRefundMutation: vi.fn() }))

const wallet = { availableBalance: '5000', reservedBalance: '0', totalTopUp: '5000', totalSpent: '0' }
const bank = { id: 'bank-1', bankName: 'HDFC Bank', accountNumber: '1234567890', verificationStatus: 'VERIFIED' }
const mutateMock = vi.fn()

/** Mimics the real selector-based store: applies the given selector to a fixed mock state. */
function mockAuthState(state: { merchant: { id: string } | null }) {
  vi.mocked(useAuthStore).mockImplementation(
    ((selector: (s: typeof state) => unknown) => selector(state)) as unknown as typeof useAuthStore,
  )
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RefundsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RefundsPage', () => {
  beforeEach(() => {
    mockAuthState({ merchant: { id: 'merchant-1' } })
    vi.mocked(useWalletQuery).mockReturnValue({ data: { data: { data: wallet } } } as never)
    vi.mocked(useBankAccountsQuery).mockReturnValue({ data: { data: { data: [bank] } } } as never)
    vi.mocked(useRefundsQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 10 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useCreateRefundMutation).mockReturnValue({ mutate: mutateMock, isPending: false } as never)
    mutateMock.mockReset()
  })

  it('prompts profile setup when there is no merchant', () => {
    mockAuthState({ merchant: null })
    renderPage()
    expect(screen.getByText(/set up your business profile first/i)).toBeInTheDocument()
  })

  it('shows an empty state when there are no refund requests', () => {
    renderPage()
    expect(screen.getByText(/no refund requests yet/i)).toBeInTheDocument()
  })

  it('renders refund history rows with amount and status', () => {
    vi.mocked(useRefundsQuery).mockReturnValue({
      data: {
        data: {
          data: {
            data: [{ id: 'refund-1', amount: '1500', reason: 'Test refund', status: 'PENDING', createdAt: '2026-01-01T00:00:00Z' }],
            total: 1,
            page: 1,
            limit: 10,
          },
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.getByText('Test refund')).toBeInTheDocument()
    expect(screen.getByText(/1,500/)).toBeInTheDocument()
  })

  it('shows a rejection reason under a rejected refund', () => {
    vi.mocked(useRefundsQuery).mockReturnValue({
      data: {
        data: {
          data: {
            data: [{ id: 'refund-1', amount: '1500', reason: null, status: 'REJECTED', rejectionReason: 'Bank mismatch', createdAt: '2026-01-01T00:00:00Z' }],
            total: 1,
            page: 1,
            limit: 10,
          },
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.getByText('Bank mismatch')).toBeInTheDocument()
  })

  it('prompts to add a bank account when none are verified', async () => {
    vi.mocked(useBankAccountsQuery).mockReturnValue({ data: { data: { data: [] } } } as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /request refund/i }))

    expect(screen.getByText(/add a bank account/i)).toBeInTheDocument()
  })

  it('submits the refund request with the entered amount and selected bank', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /request refund/i }))
    await user.type(screen.getByLabelText(/amount/i), '1500')
    await user.selectOptions(screen.getByLabelText(/bank account/i), 'bank-1')
    await user.click(screen.getByRole('button', { name: /submit request/i }))

    await waitFor(() => expect(mutateMock).toHaveBeenCalledWith({ amount: 1500, bankAccountId: 'bank-1', reason: undefined }))
  })
})
