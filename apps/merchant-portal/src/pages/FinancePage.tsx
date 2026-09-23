import { EmptyState, ErrorState, PageHeader, Pagination, TableSkeleton } from '@reviewhub/shared-ui'
import { useState } from 'react'

import { INVOICE_NOTE_TYPE_LABELS, ITEMS_PER_PAGE } from '@/constants'
import {
  useDownloadInvoiceMutation,
  useDownloadInvoiceNoteMutation,
  useInvoiceNotesQuery,
  useInvoicesQuery,
  useSettlementsQuery,
} from '@/hooks/useFinance'
import { useAuthStore } from '@/stores/auth.store'
import { cn, formatCurrency, formatDate } from '@/utils'

type Tab = 'settlements' | 'invoices' | 'notes'

const TABS: { value: Tab; label: string }[] = [
  { value: 'settlements', label: 'Settlements' },
  { value: 'invoices', label: 'GST invoices' },
  { value: 'notes', label: 'Credit & debit notes' },
]

function SettlementsPanel({ merchantId }: { merchantId: string | undefined }) {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useSettlementsQuery(merchantId, { page, limit: ITEMS_PER_PAGE })

  const settlements = data?.data.data?.data ?? []
  const total = data?.data.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  if (isLoading) return <TableSkeleton rows={5} cols={5} />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (settlements.length === 0) {
    return <EmptyState title="No settlements yet" description="Your commission settlement reports will appear here as your campaigns run." />
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead className="bg-gray-50">
          <tr>
            <th className="table-th">Period</th>
            <th className="table-th text-right">Topped up</th>
            <th className="table-th text-right">Spent</th>
            <th className="table-th text-right">Commission</th>
            <th className="table-th">Generated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {settlements.map((s) => (
            <tr key={s.id} className="table-tr">
              <td className="table-td text-gray-900">{formatDate(s.periodStart)} – {formatDate(s.periodEnd)}</td>
              <td className="table-td text-right text-gray-500">{formatCurrency(s.totalToppedUp)}</td>
              <td className="table-td text-right text-gray-500">{formatCurrency(s.totalSpent)}</td>
              <td className="table-td text-right text-gray-900">
                {formatCurrency(s.commissionAmount)} <span className="text-gray-400">({Number(s.commissionRate) * 100}%)</span>
              </td>
              <td className="table-td text-gray-500">{formatDate(s.generatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}

function InvoicesPanel({ merchantId }: { merchantId: string | undefined }) {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useInvoicesQuery(merchantId, { page, limit: ITEMS_PER_PAGE })
  const { mutate: download, isPending: downloading } = useDownloadInvoiceMutation(merchantId)

  const invoices = data?.data.data?.data ?? []
  const total = data?.data.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  if (isLoading) return <TableSkeleton rows={5} cols={5} />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (invoices.length === 0) {
    return <EmptyState title="No invoices yet" description="GST invoices for the platform's service fee are issued when a settlement is generated." />
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead className="bg-gray-50">
          <tr>
            <th className="table-th">Invoice #</th>
            <th className="table-th text-right">Taxable amount</th>
            <th className="table-th text-right">GST</th>
            <th className="table-th text-right">Total</th>
            <th className="table-th">Generated</th>
            <th className="table-th text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {invoices.map((inv) => (
            <tr key={inv.id} className="table-tr">
              <td className="table-td font-mono text-xs text-gray-900">{inv.invoiceNumber}</td>
              <td className="table-td text-right text-gray-500">{formatCurrency(inv.taxableAmount)}</td>
              <td className="table-td text-right text-gray-500">{formatCurrency(inv.gstAmount)} <span className="text-gray-400">({inv.gstRate}%)</span></td>
              <td className="table-td text-right text-gray-900">{formatCurrency(inv.totalAmount)}</td>
              <td className="table-td text-gray-500">{formatDate(inv.generatedAt)}</td>
              <td className="table-td text-right">
                <button
                  className="btn-ghost btn-sm"
                  disabled={!inv.pdfPath || downloading}
                  onClick={() => download({ id: inv.id, invoiceNumber: inv.invoiceNumber })}
                >
                  Download
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}

function NotesPanel({ merchantId }: { merchantId: string | undefined }) {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useInvoiceNotesQuery(merchantId, { page, limit: ITEMS_PER_PAGE })
  const { mutate: download, isPending: downloading } = useDownloadInvoiceNoteMutation(merchantId)

  const notes = data?.data.data?.data ?? []
  const total = data?.data.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  if (isLoading) return <TableSkeleton rows={5} cols={5} />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (notes.length === 0) {
    return <EmptyState title="No credit or debit notes" description="If an admin adjusts one of your invoices, the note explaining why will appear here." />
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead className="bg-gray-50">
          <tr>
            <th className="table-th">Note #</th>
            <th className="table-th">Type</th>
            <th className="table-th">Reason</th>
            <th className="table-th text-right">Total</th>
            <th className="table-th">Issued</th>
            <th className="table-th text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {notes.map((note) => (
            <tr key={note.id} className="table-tr">
              <td className="table-td font-mono text-xs text-gray-900">{note.noteNumber}</td>
              <td className="table-td">
                <span className={cn('badge', note.type === 'CREDIT' ? 'badge-green' : 'badge-red')}>
                  {INVOICE_NOTE_TYPE_LABELS[note.type] ?? note.type}
                </span>
              </td>
              <td className="table-td text-gray-500">{note.reason}</td>
              <td className="table-td text-right text-gray-900">{formatCurrency(note.totalAmount)}</td>
              <td className="table-td text-gray-500">{formatDate(note.createdAt)}</td>
              <td className="table-td text-right">
                <button
                  className="btn-ghost btn-sm"
                  disabled={!note.pdfPath || downloading}
                  onClick={() => download({ id: note.id, noteNumber: note.noteNumber })}
                >
                  Download
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}

export default function FinancePage() {
  const merchantId = useAuthStore((s) => s.merchant?.id)
  const [tab, setTab] = useState<Tab>('settlements')

  return (
    <div>
      <PageHeader
        title="Finance"
        subtitle="Settlement reports, GST invoices for the platform's service fee, and any credit or debit notes issued against them."
      />

      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium',
              tab === value ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'settlements' ? (
        <SettlementsPanel merchantId={merchantId} />
      ) : tab === 'invoices' ? (
        <InvoicesPanel merchantId={merchantId} />
      ) : (
        <NotesPanel merchantId={merchantId} />
      )}
    </div>
  )
}
