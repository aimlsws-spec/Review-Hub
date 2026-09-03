import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useAllMerchantsQuery,
  useMerchantDetailQuery,
  useMerchantReviewMutation,
  usePendingMerchantsQuery,
  useViewMerchantDocumentMutation,
} from '@/hooks/useMerchants'

import MerchantsPage from './MerchantsPage'

vi.mock('@/hooks/useMerchants', () => ({
  usePendingMerchantsQuery: vi.fn(),
  useAllMerchantsQuery: vi.fn(),
  useMerchantDetailQuery: vi.fn(),
  useMerchantReviewMutation: vi.fn(),
  useViewMerchantDocumentMutation: vi.fn(),
}))

const pendingMerchant = {
  id: 'merchant-1',
  businessName: 'Acme Corp',
  email: 'contact@acme.example.com',
  phone: '+919876543210',
  verificationStatus: 'PENDING',
  status: 'PENDING_VERIFICATION',
  createdAt: '2026-01-01T00:00:00Z',
}

const merchantDetail = {
  ...pendingMerchant,
  legalBusinessName: null,
  businessType: 'Retail',
  businessCategory: 'Fashion',
  gstNumber: null,
  panNumber: null,
  description: null,
  documents: [],
}

const submitReviewMock = vi.fn()
const viewDocumentMock = vi.fn()

function renderPage() {
  return render(<MerchantsPage />)
}

describe('MerchantsPage', () => {
  beforeEach(() => {
    vi.mocked(usePendingMerchantsQuery).mockReturnValue({
      data: { data: { data: [pendingMerchant] } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useAllMerchantsQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useMerchantDetailQuery).mockReturnValue({ data: undefined, isLoading: false } as never)
    vi.mocked(useMerchantReviewMutation).mockReturnValue({ mutate: submitReviewMock, isPending: false } as never)
    vi.mocked(useViewMerchantDocumentMutation).mockReturnValue({ mutate: viewDocumentMock, isPending: false } as never)
    submitReviewMock.mockReset()
    viewDocumentMock.mockReset()
  })

  it('shows a pending-verification empty state', () => {
    vi.mocked(usePendingMerchantsQuery).mockReturnValue({ data: { data: { data: [] } }, isLoading: false, isError: false, refetch: vi.fn() } as never)
    renderPage()
    expect(screen.getByText(/nothing to review/i)).toBeInTheDocument()
  })

  it('renders a pending merchant with review actions', () => {
    renderPage()

    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /request docs/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
  })

  it('approves a merchant', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /approve/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /confirm/i }))

    await waitFor(() =>
      expect(submitReviewMock).toHaveBeenCalledWith({ merchant: pendingMerchant, kind: 'approve', note: '' }),
    )
  })

  it('requires a reason before rejecting', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^reject$/i }))
    const dialog = within(screen.getByRole('dialog'))
    const confirmButton = dialog.getByRole('button', { name: /confirm/i })
    expect(confirmButton).toBeDisabled()

    await user.type(dialog.getByLabelText(/reason for rejection/i), 'Documents unclear')
    expect(confirmButton).toBeEnabled()

    await user.click(confirmButton)
    await waitFor(() =>
      expect(submitReviewMock).toHaveBeenCalledWith({ merchant: pendingMerchant, kind: 'reject', note: 'Documents unclear' }),
    )
  })

  it('switches to the All Merchants tab and searches', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /all merchants/i }))
    expect(screen.getByText(/no merchants found/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/search/i), 'Acme')
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    await waitFor(() =>
      expect(useAllMerchantsQuery).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Acme' }), true),
    )
  })

  it('opens the merchant detail modal and views a document', async () => {
    vi.mocked(useMerchantDetailQuery).mockReturnValue({
      data: { data: { data: { ...merchantDetail, documents: [{ id: 'doc-1', documentType: 'PAN', documentNumber: 'ABCDE1234F', verificationStatus: 'PENDING', rejectionReason: null }] } } },
      isLoading: false,
    } as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByText('Acme Corp'))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('ABCDE1234F')).toBeInTheDocument()

    await user.click(dialog.getByRole('button', { name: /view/i }))
    expect(viewDocumentMock).toHaveBeenCalledWith({ merchantId: 'merchant-1', documentId: 'doc-1' })
  })
})
