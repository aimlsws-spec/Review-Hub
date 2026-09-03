import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useMerchantProfileQuery,
  useRegisterMerchantMutation,
  useUpdateMerchantProfileMutation,
} from '@/hooks/useMerchantProfile'
import { useAuthStore } from '@/stores/auth.store'
import type { Merchant } from '@/types'

import ProfilePage from './ProfilePage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/hooks/useMerchantProfile', () => ({
  useMerchantProfileQuery: vi.fn(),
  useRegisterMerchantMutation: vi.fn(),
  useUpdateMerchantProfileMutation: vi.fn(),
}))

const merchant: Merchant = {
  id: 'merchant-1',
  userId: 'user-1',
  businessName: 'Acme Corp',
  legalBusinessName: 'Acme Corp Pvt Ltd',
  businessType: 'Retail',
  businessCategory: 'Fashion',
  gstNumber: null,
  panNumber: null,
  registrationNumber: null,
  website: 'https://acme.example.com',
  email: 'contact@acme.example.com',
  phone: '+919876543210',
  addressLine1: '221B Baker Street',
  addressLine2: null,
  postalCode: '110001',
  logoUrl: null,
  description: 'We sell things.',
  verificationStatus: 'APPROVED',
  status: 'ACTIVE',
  creditBalance: '0',
  commissionRate: '5',
  kycCompletedAt: null,
  verifiedAt: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const updateMutateMock = vi.fn()
const registerMutateMock = vi.fn()

/** Mimics the real selector-based store: applies the given selector to a fixed mock state. */
function mockAuthState(state: { merchant: { id: string } | null; user?: { email: string; phone: string } | null }) {
  vi.mocked(useAuthStore).mockImplementation(
    ((selector: (s: typeof state) => unknown) => selector(state)) as unknown as typeof useAuthStore,
  )
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfilePage />
    </QueryClientProvider>,
  )
}

describe('ProfilePage', () => {
  beforeEach(() => {
    mockAuthState({ merchant: { id: 'merchant-1' }, user: { email: 'owner@shop.com', phone: '+919876543210' } })
    vi.mocked(useMerchantProfileQuery).mockReturnValue({ data: { data: { data: merchant } }, isLoading: false } as never)
    vi.mocked(useUpdateMerchantProfileMutation).mockReturnValue({ mutate: updateMutateMock, isPending: false } as never)
    vi.mocked(useRegisterMerchantMutation).mockReturnValue({ mutate: registerMutateMock, isPending: false } as never)
    updateMutateMock.mockReset()
    registerMutateMock.mockReset()
  })

  it('shows the business registration form when there is no merchant yet', () => {
    mockAuthState({ merchant: null, user: { email: 'owner@shop.com', phone: '+919876543210' } })
    renderPage()

    expect(screen.getByText(/set up your business profile/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/business name/i)).toBeInTheDocument()
  })

  it('submits the registration form with the entered business details', async () => {
    mockAuthState({ merchant: null, user: { email: 'owner@shop.com', phone: '+919876543210' } })
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/business name/i), 'Acme Corp')
    await user.click(screen.getByRole('button', { name: /create business profile/i }))

    await waitFor(() =>
      expect(registerMutateMock).toHaveBeenCalledWith({
        businessName: 'Acme Corp',
        email: 'owner@shop.com',
        phone: '+919876543210',
        website: undefined,
        description: undefined,
      }),
    )
  })

  it('renders the merchant profile with business details', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Acme Corp' })).toBeInTheDocument()
    expect(screen.getAllByText('Acme Corp Pvt Ltd').length).toBeGreaterThan(0)
    expect(screen.getByText('We sell things.')).toBeInTheDocument()
  })

  it('enters edit mode and saves changes', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /edit profile/i }))
    const businessNameInputs = screen.getAllByDisplayValue('Acme Corp')
    await user.clear(businessNameInputs[0])
    await user.type(businessNameInputs[0], 'Acme Industries')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(updateMutateMock).toHaveBeenCalledWith(expect.objectContaining({ businessName: 'Acme Industries' })),
    )
  })

  it('discards changes on cancel', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /edit profile/i }))
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument()
    expect(updateMutateMock).not.toHaveBeenCalled()
  })
})
