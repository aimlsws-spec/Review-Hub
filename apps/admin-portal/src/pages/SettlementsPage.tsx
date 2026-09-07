import {
  PageHeader,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Pagination,
  Modal,
  Input,
  Spinner,
} from '@reviewhub/shared-ui'
import { useState } from 'react'

import { ITEMS_PER_PAGE } from '@/constants'
import { useGenerateSettlementsMutation, useSettlementsQuery } from '@/hooks/useSettlements'
import { formatCurrency, formatDate } from '@/utils'

export default function SettlementsPage() {
  const [page, setPage] = useState(1)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')

  const { data, isLoading, isError, refetch } = useSettlementsQuery({ page, limit: ITEMS_PER_PAGE })

  const settlements = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const { mutate: generate, isPending: generating } = useGenerateSettlementsMutation(() => {
    setGenerateOpen(false)
    setPeriodStart('')
    setPeriodEnd('')
  })

  return (
    <div>
      <PageHeader
        title="Settlements"
        subtitle="Commission settlements generated per merchant billing period."
        primaryAction={<button className="btn-primary" onClick={() => setGenerateOpen(true)}>Generate</button>}
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : settlements.length === 0 ? (
        <EmptyState title="No settlements yet" description="Trigger generation for a period, or wait for the nightly job." />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Merchant</th>
                <th className="table-th">Period</th>
                <th className="table-th">Spent</th>
                <th className="table-th">Commission</th>
                <th className="table-th">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {settlements.map((settlement) => (
                <tr key={settlement.id} className="table-tr">
                  <td className="table-td font-medium text-gray-900">{settlement.merchant?.businessName ?? settlement.merchantId}</td>
                  <td className="table-td text-gray-500">
                    {formatDate(settlement.periodStart)} – {formatDate(settlement.periodEnd)}
                  </td>
                  <td className="table-td text-gray-500">{formatCurrency(settlement.totalSpent)}</td>
                  <td className="table-td text-gray-500">{formatCurrency(settlement.commissionAmount)}</td>
                  <td className="table-td text-gray-500 font-mono text-xs">{settlement.invoice?.invoiceNumber ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {generateOpen && (
        <Modal
          open
          onClose={() => setGenerateOpen(false)}
          title="Generate settlements"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setGenerateOpen(false)} disabled={generating}>Cancel</button>
              <button
                className="btn-primary"
                disabled={generating}
                onClick={() =>
                  generate(
                    periodStart && periodEnd
                      ? { periodStart: new Date(periodStart).toISOString(), periodEnd: new Date(periodEnd).toISOString() }
                      : undefined,
                  )
                }
              >
                {generating && <Spinner size="sm" className="text-white" />}
                Generate
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Leave both dates blank to generate settlements for the prior UTC day (the same window the nightly job uses).
            </p>
            <Input label="Period start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            <Input label="Period end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
        </Modal>
      )}
    </div>
  )
}
