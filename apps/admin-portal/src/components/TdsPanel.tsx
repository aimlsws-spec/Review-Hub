import { EmptyState, ErrorState, Select, Skeleton, TableSkeleton, Pagination, StatusBadge } from '@reviewhub/shared-ui'
import { useState } from 'react'

import { ITEMS_PER_PAGE } from '@/constants'
import { useExportTdsMutation, useTdsQuery } from '@/hooks/useFinance'
import { formatCurrency, formatDate } from '@/utils'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'DEDUCTED', label: 'Kept back' },
  { value: 'REVERSED', label: 'Reversed' },
]

/** The financial years to pick from: this one and the four before it, newest first, like 2026-27. */
function recentYears(): string[] {
  const now = new Date()
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return Array.from({ length: 5 }, (_, i) => `${start - i}-${String((start - i + 1) % 100).padStart(2, '0')}`)
}

/**
 * Tax kept back from user payouts, for the tax return: totals for the year, each deduction with the person's PAN, and a
 * CSV to hand to whoever files. A deduction that was reversed (the payout failed and the money went back) is shown but
 * is left out of the totals.
 */
export function TdsPanel() {
  const years = recentYears()
  const [financialYear, setFinancialYear] = useState(years[0])
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, refetch } = useTdsQuery({ financialYear, status, page, limit: ITEMS_PER_PAGE })
  const { mutate: exportCsv, isPending: exporting } = useExportTdsMutation()

  const report = data?.data.data
  const rows = report?.data ?? []
  const totalPages = Math.max(1, Math.ceil((report?.total ?? 0) / ITEMS_PER_PAGE))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Select
            label="Financial year"
            options={years.map((year) => ({ value: year, label: year }))}
            value={financialYear}
            onChange={(e) => {
              setFinancialYear(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="w-40">
          <Select
            label="Show"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <button className="btn-secondary mb-1" onClick={() => exportCsv(financialYear)} disabled={exporting}>
          Download CSV
        </button>
      </div>

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : report ? (
        <dl className="grid grid-cols-3 gap-4" aria-label="Totals">
          <div className="card p-4">
            <dt className="text-xs uppercase tracking-wide text-gray-400">Deductions</dt>
            <dd className="text-xl font-semibold text-gray-900">{report.summary.deductions}</dd>
          </div>
          <div className="card p-4">
            <dt className="text-xs uppercase tracking-wide text-gray-400">Paid out (before tax)</dt>
            <dd className="text-xl font-semibold text-gray-900">{formatCurrency(report.summary.grossPaid)}</dd>
          </div>
          <div className="card p-4">
            <dt className="text-xs uppercase tracking-wide text-gray-400">Tax kept back</dt>
            <dd className="text-xl font-semibold text-gray-900">{formatCurrency(report.summary.tdsKeptBack)}</dd>
          </div>
        </dl>
      ) : null}

      {isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No deductions" description="Nothing has been kept back from payouts in this financial year." />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Person</th>
                <th className="table-th">PAN</th>
                <th className="table-th">Paid out</th>
                <th className="table-th">Tax kept back</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row) => (
                <tr key={row.id} className="table-tr">
                  <td className="table-td text-gray-500">{formatDate(row.createdAt)}</td>
                  <td className="table-td font-medium text-gray-900">{row.userName ?? '—'}</td>
                  <td className="table-td font-mono text-xs text-gray-600">{row.panNumber ?? 'Not on file'}</td>
                  <td className="table-td text-gray-700">{formatCurrency(row.grossAmount)}</td>
                  <td className="table-td text-gray-700">
                    {formatCurrency(row.tdsAmount)}
                    <span className="ml-1 text-xs text-gray-400">
                      ({(Number(row.rate) * 100).toFixed(2)}%, {row.section})
                    </span>
                  </td>
                  <td className="table-td">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}
