import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useApproveKycMutation, useKycDocumentQuery, useKycFileUrl, useRejectKycMutation } from '@/hooks/useKyc'

import { KycReviewModal } from './KycReviewModal'

vi.mock('@/hooks/useKyc', () => ({
  useKycDocumentQuery: vi.fn(),
  useKycFileUrl: vi.fn(),
  useApproveKycMutation: vi.fn(),
  useRejectKycMutation: vi.fn(),
}))

const doc = {
  id: 'doc-1',
  documentType: 'PAN',
  documentNumber: 'ABCDE1234F',
  status: 'PENDING',
  rejectionReason: null,
  hasFile: true,
  submittedAt: '2026-09-01T10:30:00Z',
  reviewedAt: null,
  reviewedBy: null,
  user: { id: 'user-1', name: 'Priya Sharma', email: 'priya@example.com', phone: '9876543210' },
}

const approveMock = vi.fn()
const rejectMock = vi.fn()
const onClose = vi.fn()

const withDoc = (overrides: Record<string, unknown> = {}) =>
  vi.mocked(useKycDocumentQuery).mockReturnValue({ data: { data: { data: { ...doc, ...overrides } } }, isLoading: false, isError: false } as never)

const withFile = (file: { url: string | null; mimeType?: string; isLoading?: boolean; isError?: boolean }) =>
  vi.mocked(useKycFileUrl).mockReturnValue({ mimeType: 'image/jpeg', isLoading: false, isError: false, ...file } as never)

describe('KycReviewModal', () => {
  beforeEach(() => {
    withDoc()
    withFile({ url: 'blob:pan-image' })
    vi.mocked(useApproveKycMutation).mockReturnValue({ mutate: approveMock, isPending: false } as never)
    vi.mocked(useRejectKycMutation).mockReturnValue({ mutate: rejectMock, isPending: false } as never)
    approveMock.mockReset()
    rejectMock.mockReset()
    onClose.mockReset()
  })

  const renderModal = () => render(<KycReviewModal documentId="doc-1" onClose={onClose} />)

  it('shows the uploaded image beside the full document number and the user details', () => {
    renderModal()

    expect(screen.getByRole('img', { name: 'Uploaded PAN' })).toHaveAttribute('src', 'blob:pan-image')
    expect(screen.getByText('ABCDE1234F')).toBeInTheDocument()
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument()
    expect(screen.getByText('priya@example.com')).toBeInTheDocument()
    expect(screen.getByText('9876543210')).toBeInTheDocument()
  })

  it('only loads the file when the document actually has one', () => {
    withDoc({ hasFile: false })
    renderModal()

    expect(useKycFileUrl).toHaveBeenCalledWith('doc-1', false)
    expect(screen.getByText(/no file was uploaded/i)).toBeInTheDocument()
  })

  it('shows a PDF in a frame rather than as an image', () => {
    withFile({ url: 'blob:pan-pdf', mimeType: 'application/pdf' })
    renderModal()

    expect(screen.getByTitle('Uploaded PAN')).toHaveAttribute('src', 'blob:pan-pdf')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('says so when the file cannot be loaded, without blocking a decision', () => {
    withFile({ url: null, isError: true })
    renderModal()

    expect(screen.getByText(/uploaded file could not be loaded/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled()
  })

  it('says so when the document itself cannot be loaded', () => {
    vi.mocked(useKycDocumentQuery).mockReturnValue({ data: undefined, isLoading: false, isError: true } as never)
    renderModal()

    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument()
  })

  describe('approving', () => {
    it('asks for confirmation before approving, then approves', async () => {
      const user = userEvent.setup()
      renderModal()

      await user.click(screen.getByRole('button', { name: 'Approve' }))
      expect(approveMock).not.toHaveBeenCalled()
      expect(screen.getByText(/allows this user to withdraw earnings/i)).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Confirm approval' }))
      expect(approveMock).toHaveBeenCalledWith('doc-1')
    })

    it('does not mention withdrawals for documents other than a PAN', async () => {
      const user = userEvent.setup()
      withDoc({ documentType: 'PASSPORT' })
      renderModal()

      await user.click(screen.getByRole('button', { name: 'Approve' }))

      expect(screen.queryByText(/withdraw earnings/i)).not.toBeInTheDocument()
    })

    it('goes back from the confirmation without approving', async () => {
      const user = userEvent.setup()
      renderModal()

      await user.click(screen.getByRole('button', { name: 'Approve' }))
      await user.click(screen.getByRole('button', { name: 'Back' }))

      expect(approveMock).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
    })
  })

  describe('rejecting', () => {
    it('will not reject without a real reason, because the user sees it', async () => {
      const user = userEvent.setup()
      renderModal()

      await user.click(screen.getByRole('button', { name: 'Reject' }))
      const confirm = screen.getByRole('button', { name: 'Confirm rejection' })
      expect(confirm).toBeDisabled()

      await user.type(screen.getByLabelText('Reason for rejection'), '  no ')
      expect(confirm).toBeDisabled()
    })

    it('rejects with the trimmed reason', async () => {
      const user = userEvent.setup()
      renderModal()

      await user.click(screen.getByRole('button', { name: 'Reject' }))
      await user.type(screen.getByLabelText('Reason for rejection'), '  Image is too blurry  ')
      await user.click(screen.getByRole('button', { name: 'Confirm rejection' }))

      expect(rejectMock).toHaveBeenCalledWith({ documentId: 'doc-1', reason: 'Image is too blurry' })
    })
  })

  describe('a document that was already decided', () => {
    it('shows the outcome and offers no way to change it', () => {
      withDoc({ status: 'REJECTED', rejectionReason: 'Number does not match', reviewedAt: '2026-09-02T09:00:00Z' })
      renderModal()

      expect(screen.getByText('Number does not match')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    })
  })

  it('closes from the footer', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalled()
  })
})
