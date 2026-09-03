import {
  PageHeader,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Pagination,
  ConfirmDialog,
  Modal,
  Textarea,
  Spinner,
} from '@reviewhub/shared-ui'
import { useState } from 'react'

import { ITEMS_PER_PAGE } from '@/constants'
import { useApproveRefundMutation, useRefundQueueQuery, useRejectRefundMutation } from '@/hooks/useRefundQueue'
import type { MerchantRefund } from '@/types'
import { formatCurrency, formatDate } from '@/utils'

export default function RefundApprovalsPage() {
  const [page, setPage] = useState(1)
  const [approveTarget, setApproveTarget] = useState<MerchantRefund | null>(null)
  const [rejectTarget, setRejectTarget] = useState<MerchantRefund | null>(null)
  const [reason, setReason] = useState('')

  const { data, isLoading, isError, refetch } = useRefundQueueQuery({ page, limit: ITEMS_PER_PAGE })

  const refunds = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const { mutate: approve, isPending: approving } = useApproveRefundMutation(() => setApproveTarget(null))

  const { mutate: reject, isPending: rejecting } = useRejectRefundMutation(() => {
    setRejectTarget(null)
    setReason('')
  })

  return (
    <div>
      <PageHeader title="Refund Approvals" subtitle="Merchant wallet cash-out requests awaiting reviewer approval." />

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : refunds.length === 0 ? (
        <EmptyState
          title="No pending refunds"
          description="All merchant refund requests have been processed."
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Amount</th>
                <th className="table-th">Bank account</th>
                <th className="table-th">Reason</th>
                <th className="table-th">Status</th>
                <th className="table-th">Requested</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {refunds.map((refund) => (
                <tr key={refund.id} className="table-tr">
                  <td className="table-td font-semibold text-gray-900">{formatCurrency(refund.amount)}</td>
                  <td className="table-td text-gray-500">
                    {refund.bankAccount ? (
                      <>
                        {refund.bankAccount.bankName}
                        <span className="ml-1 text-xs text-gray-400">•••• {refund.bankAccount.accountNumber.slice(-4)}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="table-td text-gray-500">{refund.reason ?? '—'}</td>
                  <td className="table-td text-gray-500">{refund.status.replace(/_/g, ' ')}</td>
                  <td className="table-td text-gray-500">{formatDate(refund.createdAt)}</td>
                  <td className="table-td text-right">
                    <div className="flex justify-end gap-2">
                      <button className="btn-ghost btn-sm text-green-700 hover:bg-green-50" onClick={() => setApproveTarget(refund)}>
                        Approve
                      </button>
                      <button
                        className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setReason('')
                          setRejectTarget(refund)
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {approveTarget && (
        <ConfirmDialog
          open
          onClose={() => setApproveTarget(null)}
          onConfirm={() => approve(approveTarget.id)}
          title="Approve refund"
          message={`Approve a payout of ${formatCurrency(approveTarget.amount)}? This finalizes the transfer and cannot be undone.`}
          confirmLabel="Approve"
          variant="primary"
          loading={approving}
        />
      )}

      {rejectTarget && (
        <Modal
          open
          onClose={() => setRejectTarget(null)}
          title="Reject refund"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setRejectTarget(null)} disabled={rejecting}>
                Cancel
              </button>
              <button
                className="btn-danger"
                disabled={reason.trim().length < 5 || rejecting}
                onClick={() => reject({ id: rejectTarget.id, reason })}
              >
                {rejecting && <Spinner size="sm" className="text-white" />}
                Reject
              </button>
            </>
          }
        >
          <p className="mb-3 text-sm text-gray-600">
            Rejecting will release the hold of <span className="font-medium text-gray-900">{formatCurrency(rejectTarget.amount)}</span> back to the merchant's available balance.
          </p>
          <Textarea
            label="Reason for rejection"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this refund is being rejected..."
          />
        </Modal>
      )}
    </div>
  )
}
