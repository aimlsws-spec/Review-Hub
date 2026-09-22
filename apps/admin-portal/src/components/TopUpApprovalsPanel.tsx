import { EmptyState, ErrorState, Pagination, TableSkeleton } from '@reviewhub/shared-ui'
import { useState } from 'react'

import { TopUpActions } from '@/components/TopUpActions'
import { ITEMS_PER_PAGE } from '@/constants'
import { useTopUpApprovalsQuery } from '@/hooks/useMerchants'
import { formatCurrency, formatDate } from '@/utils'

/**
 * Large bank-transfer top-ups waiting for a second admin. Nothing has been added to any wallet yet. A top-up recorded by
 * the person looking at this page is shown, but only another admin can approve or reject it.
 */
export function TopUpApprovalsPanel() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useTopUpApprovalsQuery({ page, limit: ITEMS_PER_PAGE })

  const topUps = data?.data.data.data ?? []
  const totalPages = Math.max(1, Math.ceil((data?.data.data.total ?? 0) / ITEMS_PER_PAGE))

  if (isLoading) return <TableSkeleton rows={4} cols={5} />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (topUps.length === 0) {
    return <EmptyState title="Nothing waiting" description="Large bank-transfer top-ups that need a second admin appear here." />
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead className="bg-gray-50">
          <tr>
            <th className="table-th">Merchant</th>
            <th className="table-th">Amount</th>
            <th className="table-th">Bank reference</th>
            <th className="table-th">Received on</th>
            <th className="table-th text-right">Decision</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {topUps.map((topUp) => (
            <tr key={topUp.id} className="table-tr">
              <td className="table-td font-medium text-gray-900">{topUp.merchantWallet?.merchant?.businessName ?? '—'}</td>
              <td className="table-td font-semibold text-gray-900">{formatCurrency(topUp.amount)}</td>
              <td className="table-td font-mono text-xs text-gray-600">{topUp.bankReference}</td>
              <td className="table-td text-gray-500">{formatDate(topUp.receivedOn)}</td>
              <td className="table-td text-right">
                <div className="flex justify-end">
                  <TopUpActions topUp={topUp} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
