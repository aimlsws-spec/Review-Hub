import { useState } from 'react'
import { ITEMS_PER_PAGE } from '@/constants'
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
import { formatCurrency, formatDate } from '@/utils'
import { useApproveWithdrawalMutation, useRejectWithdrawalMutation, useWithdrawalQueueQuery } from '@/hooks/useWithdrawalQueue'
import type { WithdrawalRequest } from '@/types'

export default function WithdrawalQueuePage() {
  const [page, setPage] = useState(1)
  const [approveTarget, setApproveTarget] = useState<WithdrawalRequest | null>(null)
  const [rejectTarget, setRejectTarget] = useState<WithdrawalRequest | null>(null)
  const [reason, setReason] = useState('')

  const { data, isLoading, isError, refetch } = useWithdrawalQueueQuery({ page, limit: ITEMS_PER_PAGE })

  const withdrawals = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const { mutate: approve, isPending: approving } = useApproveWithdrawalMutation(() => setApproveTarget(null))

  const { mutate: reject, isPending: rejecting } = useRejectWithdrawalMutation(() => {
    setRejectTarget(null)
    setReason('')
  })

  return (
    <div>
      <PageHeader title="Withdrawal Queue" subtitle="Payout requests awaiting reviewer approval." />

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : withdrawals.length === 0 ? (
        <EmptyState
          title="No pending withdrawals"
          description="All withdrawal requests have been processed."
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
                <th className="table-th">Status</th>
                <th className="table-th">Requested</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {withdrawals.map((wd) => (
                <tr key={wd.id} className="table-tr">
                  <td className="table-td font-semibold text-gray-900">{formatCurrency(wd.finalAmount)}</td>
                  <td className="table-td text-gray-500">
                    {wd.bankAccount ? (
                      <>
                        {wd.bankAccount.bankName}
                        <span className="ml-1 text-xs text-gray-400">•••• {wd.bankAccount.accountNumber.slice(-4)}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="table-td text-gray-500">{wd.status.replace(/_/g, ' ')}</td>
                  <td className="table-td text-gray-500">{formatDate(wd.createdAt)}</td>
                  <td className="table-td text-right">
                    <div className="flex justify-end gap-2">
                      <button className="btn-ghost btn-sm text-green-700 hover:bg-green-50" onClick={() => setApproveTarget(wd)}>
                        Approve
                      </button>
                      <button
                        className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setReason('')
                          setRejectTarget(wd)
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
          title="Approve withdrawal"
          message={`Approve a payout of ${formatCurrency(approveTarget.finalAmount)}? This finalizes the transfer and cannot be undone.`}
          confirmLabel="Approve"
          variant="primary"
          loading={approving}
        />
      )}

      {rejectTarget && (
        <Modal
          open
          onClose={() => setRejectTarget(null)}
          title="Reject withdrawal"
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
            Rejecting will release the hold of <span className="font-medium text-gray-900">{formatCurrency(rejectTarget.finalAmount)}</span> back to the user's available balance.
          </p>
          <Textarea
            label="Reason for rejection"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this withdrawal is being rejected..."
          />
        </Modal>
      )}
    </div>
  )
}
