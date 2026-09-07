import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useGenerateSettlementsMutation, useSettlementsQuery } from '@/hooks/useSettlements'

import SettlementsPage from './SettlementsPage'

vi.mock('@/hooks/useSettlements', () => ({
  useSettlementsQuery: vi.fn(),
  useGenerateSettlementsMutation: vi.fn(),
}))

const settlement = {
  id: 'settlement-1',
  merchantId: 'merchant-1',
  periodStart: '2026-08-01T00:00:00Z',
  periodEnd: '2026-08-31T00:00:00Z',
  totalToppedUp: 5000,
  totalSpent: 3000,
  commissionRate: 0.1,
  commissionAmount: 300,
  generatedAt: '2026-09-01T00:00:00Z',
  invoice: { id: 'inv-1', settlementId: 'settlement-1', invoiceNumber: 'INV-0001', taxableAmount: 300, gstRate: 18, gstAmount: 54 },
  merchant: { businessName: 'Acme Corp' },
}

const generateMock = vi.fn()

function renderPage() {
  return render(<SettlementsPage />)
}

describe('SettlementsPage', () => {
  beforeEach(() => {
    vi.mocked(useSettlementsQuery).mockReturnValue({
      data: { data: { data: { data: [settlement], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useGenerateSettlementsMutation).mockReturnValue({ mutate: generateMock, isPending: false } as never)
    generateMock.mockReset()
  })

  it('shows an empty state when there are no settlements', () => {
    vi.mocked(useSettlementsQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()
    expect(screen.getByText(/no settlements yet/i)).toBeInTheDocument()
  })

  it('renders a settlement row with merchant, commission, and invoice number', () => {
    renderPage()

    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('INV-0001')).toBeInTheDocument()
  })

  it('triggers generation for the prior day when no dates are set', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^generate$/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /^generate$/i }))

    await waitFor(() => expect(generateMock).toHaveBeenCalledWith(undefined))
  })

  it('triggers generation for an explicit period', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^generate$/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/period start/i), '2026-08-01')
    await user.type(dialog.getByLabelText(/period end/i), '2026-08-31')
    await user.click(dialog.getByRole('button', { name: /^generate$/i }))

    await waitFor(() =>
      expect(generateMock).toHaveBeenCalledWith(
        expect.objectContaining({ periodStart: expect.any(String), periodEnd: expect.any(String) }),
      ),
    )
  })
})
