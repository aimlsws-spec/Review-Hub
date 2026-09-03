import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useAddBankAccountMutation,
  useBankAccountsQuery,
  useDocumentsQuery,
  useRemoveBankAccountMutation,
  useSetPrimaryBankAccountMutation,
  useUploadDocumentMutation,
} from '@/hooks/useDocuments'
import { useAuthStore } from '@/stores/auth.store'

import DocumentsPage from './DocumentsPage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/hooks/useDocuments', () => ({
  useDocumentsQuery: vi.fn(),
  useBankAccountsQuery: vi.fn(),
  useUploadDocumentMutation: vi.fn(),
  useAddBankAccountMutation: vi.fn(),
  useRemoveBankAccountMutation: vi.fn(),
  useSetPrimaryBankAccountMutation: vi.fn(),
}))

const document = {
  id: 'doc-1',
  documentType: 'PAN',
  documentNumber: 'ABCDE1234F',
  verificationStatus: 'REJECTED',
  rejectionReason: 'Image is blurry',
  createdAt: '2026-01-01T00:00:00Z',
}

const primaryBank = {
  id: 'bank-1',
  bankName: 'HDFC Bank',
  accountHolderName: 'Acme Corp',
  accountNumber: '1234567890',
  ifscCode: 'HDFC0001234',
  isPrimary: true,
  verificationStatus: 'VERIFIED',
}

const secondaryBank = { ...primaryBank, id: 'bank-2', bankName: 'ICICI Bank', isPrimary: false, accountNumber: '9876543210' }

const uploadMutateMock = vi.fn()
const addBankMutateMock = vi.fn()
const removeBankMutateMock = vi.fn()
const setPrimaryMutateMock = vi.fn()

function mockAuthState(merchantId: string | undefined) {
  vi.mocked(useAuthStore).mockImplementation(
    ((selector: (s: { merchant: { id: string } | null }) => unknown) => selector({ merchant: merchantId ? { id: merchantId } : null })) as unknown as typeof useAuthStore,
  )
}

function renderPage() {
  return render(<DocumentsPage />)
}

describe('DocumentsPage', () => {
  beforeEach(() => {
    mockAuthState('merchant-1')
    vi.mocked(useDocumentsQuery).mockReturnValue({ data: { data: { data: [document] } }, isLoading: false, isError: false, refetch: vi.fn() } as never)
    vi.mocked(useBankAccountsQuery).mockReturnValue({ data: { data: { data: [primaryBank, secondaryBank] } }, isLoading: false } as never)
    vi.mocked(useUploadDocumentMutation).mockReturnValue({ mutate: uploadMutateMock, isPending: false } as never)
    vi.mocked(useAddBankAccountMutation).mockReturnValue({ mutate: addBankMutateMock, isPending: false } as never)
    vi.mocked(useRemoveBankAccountMutation).mockReturnValue({ mutate: removeBankMutateMock, isPending: false } as never)
    vi.mocked(useSetPrimaryBankAccountMutation).mockReturnValue({ mutate: setPrimaryMutateMock, isPending: false } as never)
    uploadMutateMock.mockReset()
    addBankMutateMock.mockReset()
    removeBankMutateMock.mockReset()
    setPrimaryMutateMock.mockReset()
  })

  it('shows empty states for documents and bank accounts', () => {
    vi.mocked(useDocumentsQuery).mockReturnValue({ data: { data: { data: [] } }, isLoading: false, isError: false, refetch: vi.fn() } as never)
    vi.mocked(useBankAccountsQuery).mockReturnValue({ data: { data: { data: [] } }, isLoading: false } as never)
    renderPage()

    expect(screen.getByText(/no documents uploaded/i)).toBeInTheDocument()
    expect(screen.getByText(/no bank accounts/i)).toBeInTheDocument()
  })

  it('renders a document with its rejection reason', () => {
    renderPage()

    expect(screen.getByText('ABCDE1234F')).toBeInTheDocument()
    expect(screen.getByText('Image is blurry')).toBeInTheDocument()
  })

  it('renders bank accounts, marking the primary one', () => {
    renderPage()

    expect(screen.getByText('HDFC Bank')).toBeInTheDocument()
    expect(screen.getByText('Primary')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /set primary/i })).toBeInTheDocument()
  })

  it('uploads a document', async () => {
    const user = userEvent.setup()
    const { container } = renderPage()

    await user.click(screen.getByRole('button', { name: /upload document/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.selectOptions(dialog.getByLabelText(/document type/i), 'GST')

    const file = new File(['dummy'], 'gst-certificate.pdf', { type: 'application/pdf' })
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)

    await user.click(dialog.getByRole('button', { name: /^upload$/i }))

    await waitFor(() => expect(uploadMutateMock).toHaveBeenCalledWith(expect.objectContaining({ documentType: 'GST' })))
  })

  it('adds a bank account', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /add bank account/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/bank name/i), 'Axis Bank')
    await user.type(dialog.getByLabelText(/account holder name/i), 'Acme Corp')
    await user.type(dialog.getByLabelText(/account number/i), '5555666677')
    await user.type(dialog.getByLabelText(/ifsc code/i), 'UTIB0001234')
    await user.click(dialog.getByRole('button', { name: /add account/i }))

    await waitFor(() =>
      expect(addBankMutateMock).toHaveBeenCalledWith(
        expect.objectContaining({ bankName: 'Axis Bank', accountNumber: '5555666677', ifscCode: 'UTIB0001234' }),
      ),
    )
  })

  it('sets a non-primary bank account as primary', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /set primary/i }))
    expect(setPrimaryMutateMock).toHaveBeenCalledWith('bank-2')
  })

  it('removes a bank account after confirming', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getAllByRole('button', { name: /remove/i })[0])
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /^remove$/i }))

    await waitFor(() => expect(removeBankMutateMock).toHaveBeenCalledWith('bank-1'))
  })
})
