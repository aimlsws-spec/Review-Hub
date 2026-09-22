import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useKycDocumentQuery, useKycDocumentsQuery } from '@/hooks/useKyc'

import UserKycPage from './UserKycPage'

vi.mock('@/hooks/useKyc', () => ({
  useKycDocumentsQuery: vi.fn(),
  useKycDocumentQuery: vi.fn(),
  useKycFileUrl: vi.fn(() => ({ url: null, mimeType: '', isLoading: false, isError: false })),
  useApproveKycMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useRejectKycMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

const pendingDoc = {
  id: 'doc-1',
  documentType: 'PAN',
  documentNumber: '****234F',
  status: 'PENDING',
  rejectionReason: null,
  hasFile: true,
  submittedAt: '2026-09-01T00:00:00Z',
  reviewedAt: null,
  reviewedBy: null,
  user: { id: 'user-1', name: 'Priya Sharma', email: 'priya@example.com', phone: '9876543210' },
}

const listResult = (docs: unknown[]) =>
  ({ data: { data: { data: { data: docs, total: docs.length, page: 1, limit: 20 } } }, isLoading: false, isError: false, refetch: vi.fn() }) as never

describe('UserKycPage', () => {
  beforeEach(() => {
    vi.mocked(useKycDocumentsQuery).mockReturnValue(listResult([pendingDoc]))
    vi.mocked(useKycDocumentQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false } as never)
  })

  it('opens on the pending queue', () => {
    render(<UserKycPage />)

    expect(useKycDocumentsQuery).toHaveBeenCalledWith(expect.objectContaining({ page: 1, status: 'PENDING' }))
    expect(screen.getByLabelText('Status')).toHaveValue('PENDING')
  })

  it('lists the user, the masked document number and the status', () => {
    render(<UserKycPage />)

    // Scoped to the table: "PAN" and "Pending" are also options in the filters above it.
    const table = within(screen.getByRole('table'))
    expect(table.getByText('Priya Sharma')).toBeInTheDocument()
    expect(table.getByText('priya@example.com')).toBeInTheDocument()
    expect(table.getByText('PAN')).toBeInTheDocument()
    expect(table.getByText('****234F')).toBeInTheDocument()
    expect(table.getByText('Pending')).toBeInTheDocument()
    expect(table.getByRole('button', { name: 'Review' })).toBeInTheDocument()
  })

  it('offers View, not Review, for a document that was already decided', () => {
    vi.mocked(useKycDocumentsQuery).mockReturnValue(listResult([{ ...pendingDoc, status: 'APPROVED' }]))
    render(<UserKycPage />)

    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Review' })).not.toBeInTheDocument()
  })

  it('tells the reviewer when nothing is waiting', () => {
    vi.mocked(useKycDocumentsQuery).mockReturnValue(listResult([]))
    render(<UserKycPage />)

    expect(screen.getByText('No documents waiting')).toBeInTheDocument()
    expect(screen.getByText(/every uploaded document has been reviewed/i)).toBeInTheDocument()
  })

  it('shows a generic empty state when a search matches nothing', async () => {
    const user = userEvent.setup()
    vi.mocked(useKycDocumentsQuery).mockReturnValue(listResult([]))
    render(<UserKycPage />)

    await user.selectOptions(screen.getByLabelText('Status'), '')

    expect(screen.getByText('No documents found')).toBeInTheDocument()
  })

  it('shows an error state with a retry action', async () => {
    const user = userEvent.setup()
    const refetch = vi.fn()
    vi.mocked(useKycDocumentsQuery).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch } as never)
    render(<UserKycPage />)

    await user.click(screen.getByRole('button', { name: /try again|retry/i }))

    expect(refetch).toHaveBeenCalled()
  })

  it('shows a skeleton while loading', () => {
    vi.mocked(useKycDocumentsQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() } as never)
    render(<UserKycPage />)

    expect(screen.queryByText('Priya Sharma')).not.toBeInTheDocument()
  })

  it('filters by status and document type and goes back to page 1', async () => {
    const user = userEvent.setup()
    render(<UserKycPage />)

    await user.selectOptions(screen.getByLabelText('Status'), 'REJECTED')
    await user.selectOptions(screen.getByLabelText('Document'), 'AADHAAR')

    expect(useKycDocumentsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, status: 'REJECTED', documentType: 'AADHAAR' }),
    )
  })

  it('searches on Enter with the text trimmed', async () => {
    const user = userEvent.setup()
    render(<UserKycPage />)

    await user.type(screen.getByLabelText('Search'), '  priya  {Enter}')

    expect(useKycDocumentsQuery).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'priya' }))
  })

  it('opens the review modal for the clicked document', async () => {
    const user = userEvent.setup()
    render(<UserKycPage />)

    await user.click(screen.getByRole('button', { name: 'Review' }))

    expect(within(screen.getByRole('dialog')).getByRole('heading', { name: /review/i })).toBeInTheDocument()
    expect(useKycDocumentQuery).toHaveBeenCalledWith('doc-1')
  })
})
