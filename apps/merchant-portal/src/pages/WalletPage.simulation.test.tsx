import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAutoRechargeMutation, useAutoRechargeQuery, useTransactionsQuery, useWalletMutations, useWalletQuery } from '@/hooks/useWallet'
import { useAuthStore } from '@/stores/auth.store'

import WalletPage from './WalletPage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/hooks/useWallet', () => ({
  useWalletQuery: vi.fn(),
  useTransactionsQuery: vi.fn(),
  useWalletMutations: vi.fn(),
  useAutoRechargeQuery: vi.fn(),
  useAutoRechargeMutation: vi.fn(),
}))
// Simulates a production build, where the dev-only simulation button must not exist.
vi.mock('@/constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/constants')>()),
  PAYMENT_SIMULATION_ENABLED: false,
}))

describe('WalletPage when payment simulation is disabled', () => {
  beforeEach(() => {
    vi.mocked(useAuthStore).mockImplementation(
      ((selector: (s: { merchant: { id: string } }) => unknown) => selector({ merchant: { id: 'merchant-1' } })) as unknown as typeof useAuthStore,
    )
    vi.mocked(useWalletQuery).mockReturnValue({
      data: { data: { data: { availableBalance: '5000', reservedBalance: '1000', totalTopUp: '10000', totalSpent: '4000' } } },
      isLoading: false,
    } as never)
    vi.mocked(useTransactionsQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 10 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useWalletMutations).mockReturnValue({
      rechargeMutation: { mutate: vi.fn(), isPending: false },
      verifyMutation: { mutate: vi.fn(), isPending: false },
      simulateMutation: { mutate: vi.fn(), isPending: false },
      refreshWallet: vi.fn(),
    } as never)
    vi.mocked(useAutoRechargeQuery).mockReturnValue({
      data: { data: { data: { enabled: false, threshold: null, amount: null, lastTriggeredAt: null } } },
    } as never)
    vi.mocked(useAutoRechargeMutation).mockReturnValue({ mutate: vi.fn(), isPending: false } as never)
  })

  it('does not offer "Simulate Payment" in the add-funds dialog', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <WalletPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('button', { name: /add funds/i }))
    const dialog = within(screen.getByRole('dialog'))

    expect(dialog.getByRole('button', { name: /proceed to pay/i })).toBeInTheDocument()
    expect(dialog.queryByRole('button', { name: /simulate payment/i })).not.toBeInTheDocument()
  })
})
