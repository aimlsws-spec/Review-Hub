import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useTopUpApprovalsQuery, useTopUpDecisionMutation } from '@/hooks/useMerchants'
import { useAuthStore } from '@/stores/auth.store'

import { TopUpApprovalsPanel } from './TopUpApprovalsPanel'

vi.mock('@/hooks/useMerchants', () => ({ useTopUpApprovalsQuery: vi.fn(), useTopUpDecisionMutation: vi.fn() }))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))

const waiting = (overrides: Record<string, unknown> = {}) => ({
  id: 'top-1',
  status: 'PENDING_APPROVAL',
  amount: '250000.00',
  bankReference: 'UTR123456789',
  receivedOn: '2026-09-20',
  note: null,
  recordedBy: 'admin-1',
  createdAt: '2026-09-20T10:00:00Z',
  merchantWallet: { merchantId: 'm-1', merchant: { businessName: 'Brew Bar' } },
  ...overrides,
})

function queue(rows: unknown[], state: { isError?: boolean } = {}) {
  vi.mocked(useTopUpApprovalsQuery).mockReturnValue({
    data: { data: { data: { data: rows, total: rows.length, page: 1, limit: 20 } } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...state,
  } as never)
}

describe('TopUpApprovalsPanel', () => {
  beforeEach(() => {
    vi.mocked(useAuthStore).mockImplementation(((selector: (s: unknown) => unknown) => selector({ user: { id: 'admin-2' } })) as never)
    vi.mocked(useTopUpDecisionMutation).mockReturnValue({ mutate: vi.fn(), isPending: false } as never)
    queue([waiting()])
  })

  it('lists each large top-up with the merchant, the amount and the bank reference', () => {
    render(<TopUpApprovalsPanel />)

    expect(screen.getByText('Brew Bar')).toBeInTheDocument()
    expect(screen.getByText(/2,50,000\.00|250,000\.00/)).toBeInTheDocument()
    expect(screen.getByText('UTR123456789')).toBeInTheDocument()
  })

  it('offers a different admin approve and reject', () => {
    render(<TopUpApprovalsPanel />)

    expect(screen.getByRole('button', { name: /^approve$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^reject$/i })).toBeInTheDocument()
  })

  it('shows the top-up to the admin who recorded it, without offering to decide it', () => {
    vi.mocked(useAuthStore).mockImplementation(((selector: (s: unknown) => unknown) => selector({ user: { id: 'admin-1' } })) as never)
    render(<TopUpApprovalsPanel />)

    expect(screen.getByText('Brew Bar')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
    expect(screen.getByText(/recorded by you/i)).toBeInTheDocument()
  })

  it('says when nothing is waiting', () => {
    queue([])
    render(<TopUpApprovalsPanel />)

    expect(screen.getByText(/nothing waiting/i)).toBeInTheDocument()
  })

  it('offers to try again when the list could not be loaded', () => {
    queue([], { isError: true })
    render(<TopUpApprovalsPanel />)

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })
})
