import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCustomersQuery, useCustomerStatsQuery } from '@/hooks/useCustomers'
import { useAuthStore } from '@/stores/auth.store'

import CustomersPage from './CustomersPage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/hooks/useCustomers', () => ({ useCustomersQuery: vi.fn(), useCustomerStatsQuery: vi.fn() }))

const customer = {
  id: 'customer-1',
  name: 'Priya Sharma',
  email: 'priya@example.com',
  phone: '+919876543210',
  avatar: '',
  avatarTone: '',
  type: 'New' as const,
  status: 'Active' as const,
  joinedAt: '2026-01-01T00:00:00Z',
  lastVisit: '2026-01-05T00:00:00Z',
  totalVisits: 3,
  lifetimeSpend: 450,
  rewardBalance: 450,
  averageOrderValue: 150,
  reviewCount: 2,
  rating: 4.5,
}

const stats = {
  total: 10,
  newThisPeriod: 4,
  returning: 5,
  vip: 1,
  retentionRate: 0.5,
  averageLifetimeValue: 300,
  totalLifetimeValue: 3000,
}

function mockAuthState(merchantId: string | undefined) {
  vi.mocked(useAuthStore).mockImplementation(
    ((selector: (s: { merchant: { id: string } | null }) => unknown) => selector({ merchant: merchantId ? { id: merchantId } : null })) as unknown as typeof useAuthStore,
  )
}

function renderPage() {
  return render(<CustomersPage />)
}

describe('CustomersPage', () => {
  beforeEach(() => {
    mockAuthState('merchant-1')
    vi.mocked(useCustomersQuery).mockReturnValue({
      data: { data: { data: { data: [customer], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
    } as never)
    vi.mocked(useCustomerStatsQuery).mockReturnValue({ data: { data: { data: stats } }, isLoading: false } as never)
  })

  it('shows an empty state when there are no customers', () => {
    vi.mocked(useCustomersQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 20 } } },
      isLoading: false,
    } as never)
    renderPage()
    expect(screen.getByText(/no customers found/i)).toBeInTheDocument()
  })

  it('renders the summary metric cards', () => {
    renderPage()

    expect(screen.getByText('Total Customers')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('50.0%')).toBeInTheDocument()
  })

  it('renders a customer with contact and value details', () => {
    renderPage()

    expect(screen.getAllByText('Priya Sharma').length).toBeGreaterThan(0)
    expect(screen.getAllByText('priya@example.com').length).toBeGreaterThan(0)
  })

  it('applies a search filter', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/search customers/i), 'Priya')

    await waitFor(() =>
      expect(useCustomersQuery).toHaveBeenLastCalledWith('merchant-1', expect.objectContaining({ search: 'Priya' })),
    )
  })

  it('resets filters when Clear Filters is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/search customers/i), 'Priya')
    await user.click(screen.getAllByRole('button', { name: /clear filters/i })[0])

    await waitFor(() =>
      expect(useCustomersQuery).toHaveBeenLastCalledWith('merchant-1', expect.objectContaining({ search: undefined })),
    )
  })

  it('opens the customer details drawer on row click', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getAllByText('Priya Sharma')[0])

    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getAllByText('Priya Sharma').length).toBeGreaterThan(0)
  })
})
