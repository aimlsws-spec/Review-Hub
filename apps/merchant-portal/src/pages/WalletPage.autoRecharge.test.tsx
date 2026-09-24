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

const wallet = { availableBalance: '5000', reservedBalance: '1000', totalTopUp: '10000', totalSpent: '4000' }
const autoRechargeMutateMock = vi.fn()

function mockAutoRecharge(settings: { enabled: boolean; threshold: string | null; amount: string | null }) {
  vi.mocked(useAutoRechargeQuery).mockReturnValue({
    data: { data: { data: { ...settings, lastTriggeredAt: null } } },
  } as never)
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

describe('WalletPage auto-recharge', () => {
  beforeEach(() => {
    vi.mocked(useAuthStore).mockImplementation(
      ((selector: (s: { merchant: { id: string } }) => unknown) => selector({ merchant: { id: 'merchant-1' } })) as unknown as typeof useAuthStore,
    )
    vi.mocked(useWalletQuery).mockReturnValue({ data: { data: { data: wallet } }, isLoading: false } as never)
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
    vi.mocked(useAutoRechargeMutation).mockReturnValue({ mutate: autoRechargeMutateMock, isPending: false } as never)
    autoRechargeMutateMock.mockReset()
  })

  it('shows it as off, and explains manual top-up is still available', () => {
    mockAutoRecharge({ enabled: false, threshold: null, amount: null })
    renderPage()

    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText(/off — top up manually/i)).toBeInTheDocument()
  })

  it('shows the configured threshold and amount when on', () => {
    mockAutoRecharge({ enabled: true, threshold: '500', amount: '5000' })
    renderPage()

    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText((_, node) => node?.textContent === 'Tops up ₹5,000.00 whenever your balance drops to ₹500.00 or below.')).toBeInTheDocument()
  })

  it('opens the settings dialog from the switch when currently off', async () => {
    mockAutoRecharge({ enabled: false, threshold: null, amount: null })
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('switch'))

    expect(screen.getByRole('dialog', { name: /auto-recharge settings/i })).toBeInTheDocument()
  })

  it('turns off directly from the switch when currently on, without opening the dialog', async () => {
    mockAutoRecharge({ enabled: true, threshold: '500', amount: '5000' })
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('switch'))

    expect(autoRechargeMutateMock).toHaveBeenCalledWith({ enabled: false }, expect.anything())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('rejects a recharge amount that is not greater than the minimum balance', async () => {
    mockAutoRecharge({ enabled: false, threshold: null, amount: null })
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('switch'))
    const dialog = within(screen.getByRole('dialog'))

    await user.clear(dialog.getByLabelText(/minimum balance/i))
    await user.type(dialog.getByLabelText(/minimum balance/i), '5000')
    await user.clear(dialog.getByLabelText(/recharge amount/i))
    await user.type(dialog.getByLabelText(/recharge amount/i), '5000')
    await user.click(dialog.getByRole('button', { name: /save/i }))

    expect(await dialog.findByText(/must be greater than the minimum balance/i)).toBeInTheDocument()
    expect(autoRechargeMutateMock).not.toHaveBeenCalled()
  })

  it('saves valid settings with enabled: true', async () => {
    mockAutoRecharge({ enabled: false, threshold: null, amount: null })
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('switch'))
    const dialog = within(screen.getByRole('dialog'))

    await user.clear(dialog.getByLabelText(/minimum balance/i))
    await user.type(dialog.getByLabelText(/minimum balance/i), '500')
    await user.clear(dialog.getByLabelText(/recharge amount/i))
    await user.type(dialog.getByLabelText(/recharge amount/i), '5000')
    await user.click(dialog.getByRole('button', { name: /save/i }))

    expect(autoRechargeMutateMock).toHaveBeenCalledWith({ enabled: true, threshold: 500, amount: 5000 }, expect.anything())
  })

  it('offers "Turn off" from within the edit dialog when already enabled', async () => {
    mockAutoRecharge({ enabled: true, threshold: '500', amount: '5000' })
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /turn off/i }))

    expect(autoRechargeMutateMock).toHaveBeenCalledWith({ enabled: false }, expect.anything())
  })
})
