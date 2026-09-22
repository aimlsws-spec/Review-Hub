import { EmptyState, ErrorState, Input, Modal, Pagination, Select, Skeleton, Spinner, TableSkeleton, Textarea } from '@reviewhub/shared-ui'
import { useState } from 'react'

import { ITEMS_PER_PAGE } from '@/constants'
import { useInvoiceNotesQuery, useInvoicesQuery, useIssueInvoiceNoteMutation } from '@/hooks/useFinance'
import type { AdminInvoice } from '@/types'
import { formatCurrency, formatDate } from '@/utils'

const TYPE_OPTIONS = [
  { value: 'CREDIT', label: 'Credit note (lowers what the invoice charged)' },
  { value: 'DEBIT', label: 'Debit note (adds to what the invoice charged)' },
]

/** One invoice's notes, and the form to issue another. */
function InvoiceNotesModal({ invoice, onClose }: { invoice: AdminInvoice; onClose: () => void }) {
  const [type, setType] = useState<'CREDIT' | 'DEBIT'>('CREDIT')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')

  const notes = useInvoiceNotesQuery(invoice.id)
  const { mutate: issue, isPending } = useIssueInvoiceNoteMutation(invoice.id, () => {
    setAmount('')
    setReason('')
  })

  const taxable = Number(amount)
  const amountOk = /^\d+(\.\d{1,2})?$/.test(amount.trim()) && taxable >= 0.01
  const gst = amountOk ? Math.round(taxable * Number(invoice.gstRate)) / 100 : 0
  const canIssue = amountOk && reason.trim().length >= 5 && !isPending

  return (
    <Modal open onClose={onClose} title={`Notes for ${invoice.invoiceNumber}`} size="xl">
      <div className="space-y-5">
        <p className="text-sm text-gray-600">
          {invoice.merchant?.businessName ?? 'Merchant'} was invoiced {formatCurrency(invoice.taxableAmount)} before GST ({formatCurrency(invoice.totalAmount)} with GST at{' '}
          {Number(invoice.gstRate)}%).
        </p>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Issued so far</p>
          {notes.isLoading ? (
            <Skeleton className="h-4 w-full" />
          ) : (notes.data?.data.data ?? []).length === 0 ? (
            <p className="text-sm text-gray-400">No credit or debit notes yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
              {notes.data?.data.data.map((note) => (
                <li key={note.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">
                      {note.noteNumber} <span className="text-xs text-gray-400">{note.type === 'CREDIT' ? 'credit' : 'debit'}</span>
                    </p>
                    <p className="text-xs text-gray-500">{note.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {note.type === 'CREDIT' ? '−' : '+'}
                      {formatCurrency(note.totalAmount)}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(note.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form
          className="space-y-3 border-t border-gray-100 pt-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (canIssue) issue({ type, taxableAmount: taxable, reason: reason.trim() })
          }}
        >
          <h3 className="text-sm font-semibold text-gray-900">Issue a note</h3>
          <Select label="Type" options={TYPE_OPTIONS} value={type} onChange={(e) => setType(e.target.value as 'CREDIT' | 'DEBIT')} />
          <Input
            label="Amount before GST (₹)"
            type="number"
            step="0.01"
            min={0.01}
            value={amount}
            hint={amountOk ? `GST at ${Number(invoice.gstRate)}%: ${formatCurrency(gst)}. Total: ${formatCurrency(taxable + gst)}.` : 'The note adds GST at the invoice rate.'}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Textarea label="Reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: the service fee was billed twice." />
          <p className="text-xs text-gray-500">A note is a tax document only: it does not move any money. It can not be edited or removed. A mistake is corrected with another note.</p>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={!canIssue}>
              {isPending && <Spinner size="sm" className="text-white" />}
              Issue note
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

/** Every merchant's GST invoices, each opening the credit and debit notes on it. */
export function InvoiceNotesPanel() {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<AdminInvoice | null>(null)

  const { data, isLoading, isError, refetch } = useInvoicesQuery({ page, limit: ITEMS_PER_PAGE })
  const invoices = data?.data.data.data ?? []
  const totalPages = Math.max(1, Math.ceil((data?.data.data.total ?? 0) / ITEMS_PER_PAGE))

  if (isLoading) return <TableSkeleton rows={5} cols={5} />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (invoices.length === 0) return <EmptyState title="No invoices yet" description="Invoices are made from the nightly settlements." />

  return (
    <>
      <div className="table-container">
        <table className="table">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-th">Invoice</th>
              <th className="table-th">Merchant</th>
              <th className="table-th">Date</th>
              <th className="table-th">Before GST</th>
              <th className="table-th">Total</th>
              <th className="table-th text-right">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="table-tr">
                <td className="table-td font-mono text-xs text-gray-900">{invoice.invoiceNumber}</td>
                <td className="table-td text-gray-700">{invoice.merchant?.businessName ?? invoice.merchantId}</td>
                <td className="table-td text-gray-500">{formatDate(invoice.generatedAt)}</td>
                <td className="table-td text-gray-700">{formatCurrency(invoice.taxableAmount)}</td>
                <td className="table-td text-gray-700">{formatCurrency(invoice.totalAmount)}</td>
                <td className="table-td text-right">
                  <button className="btn-ghost btn-sm" onClick={() => setSelected(invoice)}>
                    Credit / debit notes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {selected && <InvoiceNotesModal invoice={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
