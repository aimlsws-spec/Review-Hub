import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useInvoiceNotesQuery, useInvoicesQuery, useIssueInvoiceNoteMutation } from '@/hooks/useFinance'

import { InvoiceNotesPanel } from './InvoiceNotesPanel'

vi.mock('@/hooks/useFinance', () => ({
  useInvoicesQuery: vi.fn(),
  useInvoiceNotesQuery: vi.fn(),
  useIssueInvoiceNoteMutation: vi.fn(),
}))

const invoice = {
  id: 'inv-1',
  merchantId: 'm1',
  invoiceNumber: 'INV-2026-000001',
  taxableAmount: '1000.00',
  gstRate: '18.00',
  gstAmount: '180.00',
  totalAmount: '1180.00',
  generatedAt: '2026-09-01T00:00:00Z',
  merchant: { businessName: 'Brew Bar' },
}
const note = { id: 'n1', noteNumber: 'CN-2026-000001', type: 'CREDIT', invoiceId: 'inv-1', reason: 'Billed twice', taxableAmount: '400.00', gstRate: '18.00', gstAmount: '72.00', totalAmount: '472.00', createdAt: '2026-09-10T00:00:00Z' }

const issueMock = vi.fn()

function invoices(rows: unknown[]) {
  vi.mocked(useInvoicesQuery).mockReturnValue({
    data: { data: { data: { data: rows, total: rows.length, page: 1, limit: 20 } } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never)
}
function notes(rows: unknown[]) {
  vi.mocked(useInvoiceNotesQuery).mockReturnValue({ data: { data: { data: rows } }, isLoading: false } as never)
}

describe('InvoiceNotesPanel', () => {
  beforeEach(() => {
    issueMock.mockReset()
    invoices([invoice])
    notes([])
    vi.mocked(useIssueInvoiceNoteMutation).mockReturnValue({ mutate: issueMock, isPending: false } as never)
  })

  it('lists the invoices with their merchant and amounts', () => {
    render(<InvoiceNotesPanel />)

    expect(screen.getByText('INV-2026-000001')).toBeInTheDocument()
    expect(screen.getByText('Brew Bar')).toBeInTheDocument()
    expect(screen.getByText(/1,180\.00/)).toBeInTheDocument()
  })

  it('says when there are no invoices', () => {
    invoices([])
    render(<InvoiceNotesPanel />)

    expect(screen.getByText(/no invoices yet/i)).toBeInTheDocument()
  })

  describe('an invoice’s notes', () => {
    const open = async () => {
      const user = userEvent.setup()
      render(<InvoiceNotesPanel />)
      await user.click(screen.getByRole('button', { name: /credit \/ debit notes/i }))
      return { user, dialog: within(screen.getByRole('dialog')) }
    }

    it('shows the notes already issued, with their reason and sign', async () => {
      notes([note])
      const { dialog } = await open()

      expect(dialog.getByText(/CN-2026-000001/)).toBeInTheDocument()
      expect(dialog.getByText('Billed twice')).toBeInTheDocument()
      expect(dialog.getByText(/−.*472\.00/)).toBeInTheDocument()
    })

    it('says when there are none', async () => {
      const { dialog } = await open()
      expect(dialog.getByText(/no credit or debit notes yet/i)).toBeInTheDocument()
    })

    it('says that a note is a tax document only and can not be edited', async () => {
      const { dialog } = await open()
      expect(dialog.getByText(/does not move any money/i)).toBeInTheDocument()
      expect(dialog.getByText(/can not be edited or removed/i)).toBeInTheDocument()
    })

    it('shows the GST that will be added, at the invoice rate', async () => {
      const { user, dialog } = await open()

      await user.type(dialog.getByLabelText(/amount before gst/i), '400')

      expect(dialog.getByText(/GST at 18%: .*72\.00\. Total: .*472\.00/)).toBeInTheDocument()
    })

    it('does not let a note be issued without an amount and a reason', async () => {
      const { user, dialog } = await open()
      const issue = dialog.getByRole('button', { name: /issue note/i })
      expect(issue).toBeDisabled()

      await user.type(dialog.getByLabelText(/amount before gst/i), '400')
      expect(issue).toBeDisabled()
      await user.type(dialog.getByLabelText(/reason/i), 'no')
      expect(issue).toBeDisabled()
      await user.type(dialog.getByLabelText(/reason/i), ' good reason')
      expect(issue).toBeEnabled()
    })

    it.each(['0', '-5', '10.123', 'abc'])('does not accept an amount of %s', async (amount) => {
      const { user, dialog } = await open()

      await user.type(dialog.getByLabelText(/amount before gst/i), amount)
      await user.type(dialog.getByLabelText(/reason/i), 'A good reason')

      expect(dialog.getByRole('button', { name: /issue note/i })).toBeDisabled()
    })

    it('issues a credit note by default, and a debit note when chosen', async () => {
      const { user, dialog } = await open()
      await user.type(dialog.getByLabelText(/amount before gst/i), '250.5')
      await user.type(dialog.getByLabelText(/reason/i), '  Extra service month  ')

      await user.click(dialog.getByRole('button', { name: /issue note/i }))
      await user.selectOptions(dialog.getByLabelText(/^type$/i), 'DEBIT')
      await user.click(dialog.getByRole('button', { name: /issue note/i }))

      expect(issueMock).toHaveBeenNthCalledWith(1, { type: 'CREDIT', taxableAmount: 250.5, reason: 'Extra service month' })
      expect(issueMock).toHaveBeenNthCalledWith(2, { type: 'DEBIT', taxableAmount: 250.5, reason: 'Extra service month' })
    })
  })
})
