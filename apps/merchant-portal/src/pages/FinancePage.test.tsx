import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useDownloadInvoiceMutation,
  useDownloadInvoiceNoteMutation,
  useInvoiceNotesQuery,
  useInvoicesQuery,
  useSettlementsQuery,
} from '@/hooks/useFinance'
import { useAuthStore } from '@/stores/auth.store'

import FinancePage from './FinancePage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/hooks/useFinance', () => ({
  useSettlementsQuery: vi.fn(),
  useInvoicesQuery: vi.fn(),
  useInvoiceNotesQuery: vi.fn(),
  useDownloadInvoiceMutation: vi.fn(),
  useDownloadInvoiceNoteMutation: vi.fn(),
}))

const settlement = {
  id: 'settlement-1',
  merchantId: 'merchant-1',
  periodStart: '2026-08-01T00:00:00Z',
  periodEnd: '2026-08-31T00:00:00Z',
  totalToppedUp: '50000.00',
  totalSpent: '42000.00',
  commissionRate: '0.1000',
  commissionAmount: '4200.00',
  generatedAt: '2026-09-01T00:00:00Z',
}

const invoice = {
  id: 'invoice-1',
  settlementId: 'settlement-1',
  merchantId: 'merchant-1',
  invoiceNumber: 'INV-2026-000001',
  platformGstNumber: '29ABCDE1234F1Z5',
  merchantGstNumber: '27ABCDE5678G1Z3',
  taxableAmount: '4200.00',
  gstRate: '18.00',
  gstAmount: '756.00',
  totalAmount: '4956.00',
  pdfPath: 'merchant/merchant-1/invoices/INV-2026-000001.pdf',
  generatedAt: '2026-09-01T00:00:00Z',
}

const note = {
  id: 'note-1',
  noteNumber: 'CN-2026-000001',
  type: 'CREDIT',
  invoiceId: 'invoice-1',
  merchantId: 'merchant-1',
  reason: 'Service fee billed twice for the same period',
  taxableAmount: '500.00',
  gstRate: '18.00',
  gstAmount: '90.00',
  totalAmount: '590.00',
  pdfPath: 'merchant/merchant-1/invoices/CN-2026-000001.pdf',
  createdAt: '2026-09-05T00:00:00Z',
}

const downloadInvoiceMock = vi.fn()
const downloadNoteMock = vi.fn()

function mockAuthState(merchantId: string | undefined) {
  vi.mocked(useAuthStore).mockImplementation(
    ((selector: (s: { merchant: { id: string } | null }) => unknown) => selector({ merchant: merchantId ? { id: merchantId } : null })) as unknown as typeof useAuthStore,
  )
}

function renderPage() {
  return render(<FinancePage />)
}

describe('FinancePage', () => {
  beforeEach(() => {
    mockAuthState('merchant-1')
    vi.mocked(useSettlementsQuery).mockReturnValue({
      data: { data: { data: { data: [settlement], total: 1, page: 1, limit: 10 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useInvoicesQuery).mockReturnValue({
      data: { data: { data: { data: [invoice], total: 1, page: 1, limit: 10 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useInvoiceNotesQuery).mockReturnValue({
      data: { data: { data: { data: [note], total: 1, page: 1, limit: 10 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useDownloadInvoiceMutation).mockReturnValue({ mutate: downloadInvoiceMock, isPending: false } as never)
    vi.mocked(useDownloadInvoiceNoteMutation).mockReturnValue({ mutate: downloadNoteMock, isPending: false } as never)
    downloadInvoiceMock.mockReset()
    downloadNoteMock.mockReset()
  })

  it('shows settlements by default', () => {
    renderPage()
    expect(screen.getByText(/4,200/)).toBeInTheDocument()
  })

  it('shows an empty state when there are no settlements', () => {
    vi.mocked(useSettlementsQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 10 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()
    expect(screen.getByText(/no settlements yet/i)).toBeInTheDocument()
  })

  it('switches to the invoices tab and downloads an invoice', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /gst invoices/i }))
    expect(screen.getByText('INV-2026-000001')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /download/i }))
    expect(downloadInvoiceMock).toHaveBeenCalledWith({ id: 'invoice-1', invoiceNumber: 'INV-2026-000001' })
  })

  it('switches to the credit & debit notes tab and downloads a note', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /credit & debit notes/i }))
    expect(screen.getByText('CN-2026-000001')).toBeInTheDocument()
    expect(screen.getByText(/service fee billed twice/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /download/i }))
    expect(downloadNoteMock).toHaveBeenCalledWith({ id: 'note-1', noteNumber: 'CN-2026-000001' })
  })
})
