import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useTransactionsQuery, useWalletMutations, useWalletQuery } from '@/hooks/useWallet'
import { useAuthStore } from '@/stores/auth.store'

import WalletPage from './WalletPage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/hooks/useWallet', () => ({ useWalletQuery: vi.fn(), useTransactionsQuery: vi.fn(), useWalletMutations: vi.fn() }))

const wallet = { availableBalance: '5000', reservedBalance: '1000', totalTopUp: '10000', totalSpent: '4000' }
const rechargeMutateMock = vi.fn()

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
        <WalletPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('WalletPage', () => {
  beforeEach(() => {
    mockAuthState({ merchant: { id: 'merchant-1' } })
    vi.mocked(useWalletQuery).mockReturnValue({ data: { data: { data: wallet } }, isLoading: false } as never)
    vi.mocked(useTransactionsQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 10 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useWalletMutations).mockReturnValue({
      rechargeMutation: { mutate: rechargeMutateMock, isPending: false },
      verifyMutation: { mutate: vi.fn(), isPending: false },
      refreshWallet: vi.fn(),
    } as never)
    rechargeMutateMock.mockReset()
  })

  it('prompts profile setup when there is no merchant', () => {
    mockAuthState({ merchant: null })
    renderPage()
    expect(screen.getByText(/set up your business profile first/i)).toBeInTheDocument()
  })

  it('renders balance cards from wallet data', () => {
    renderPage()

    expect(screen.getByText(/available balance/i)).toBeInTheDocument()
    expect(screen.getByText(/5,000/)).toBeInTheDocument()
    expect(screen.getByText(/1,000/)).toBeInTheDocument()
    expect(screen.getByText(/10,000/)).toBeInTheDocument()
    expect(screen.getByText(/4,000/)).toBeInTheDocument()
  })

  it('shows an empty state when there are no transactions', () => {
    renderPage()
    expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument()
  })

  it('renders a transaction row with type and amount', () => {
    vi.mocked(useTransactionsQuery).mockReturnValue({
      data: {
        data: {
          data: {
            data: [{ id: 'tx-12345678', type: 'CREDIT', amount: '500', balanceAfter: '5500', status: 'SUCCESS', createdAt: '2026-01-01T00:00:00Z' }],
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

    expect(screen.getByText('+₹500.00')).toBeInTheDocument()
  })

  it('shows an error state with a retry action for transactions', async () => {
    const refetch = vi.fn()
    vi.mocked(useTransactionsQuery).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch } as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it('requires a minimum recharge amount', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /add funds/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.clear(dialog.getByLabelText(/amount/i))
    await user.type(dialog.getByLabelText(/amount/i), '50')
    await user.click(dialog.getByRole('button', { name: /proceed to pay/i }))

    expect(await screen.findByText(/minimum recharge amount is/i)).toBeInTheDocument()
    expect(rechargeMutateMock).not.toHaveBeenCalled()
  })

  it('submits a recharge with the entered amount', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /add funds/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.clear(dialog.getByLabelText(/amount/i))
    await user.type(dialog.getByLabelText(/amount/i), '2500')
    await user.click(dialog.getByRole('button', { name: /proceed to pay/i }))

    await waitFor(() => expect(rechargeMutateMock).toHaveBeenCalledWith(2500))
  })
})
