import { EmptyState, ErrorState, Input, Modal, Pagination, Spinner, TableSkeleton, Textarea } from '@reviewhub/shared-ui'
import { useState } from 'react'

import { ITEMS_PER_PAGE } from '@/constants'
import { useAwaitingPayoutQuery, useMarkWithdrawalFailedMutation, useMarkWithdrawalPaidMutation } from '@/hooks/useWithdrawalQueue'
import type { WithdrawalRequest } from '@/types'
import { formatCurrency, formatDate } from '@/utils'

/** Mirrors the server: the bank's reference is 6 to 40 letters, digits, dashes or slashes, with no spaces. */
const REFERENCE_PATTERN = /^[A-Za-z0-9/-]{6,40}$/

/**
 * Approved withdrawals that are waiting for a person: the platform is set to pay by hand, or the payment gateway could
 * not start the payout. The admin sends the money from the bank, then records the bank's reference here, or records
 * that it could not be sent so the money goes back to the user.
 */
export function AwaitingPayoutPanel() {
  const [page, setPage] = useState(1)
  const [paidTarget, setPaidTarget] = useState<WithdrawalRequest | null>(null)
  const [failedTarget, setFailedTarget] = useState<WithdrawalRequest | null>(null)
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')

  const { data, isLoading, isError, refetch } = useAwaitingPayoutQuery({ page, limit: ITEMS_PER_PAGE })
  const withdrawals = data?.data.data.data ?? []
  const totalPages = Math.max(1, Math.ceil((data?.data.data.total ?? 0) / ITEMS_PER_PAGE))

  const { mutate: markPaid, isPending: markingPaid } = useMarkWithdrawalPaidMutation(() => {
    setPaidTarget(null)
    setReference('')
    setNote('')
  })
  const { mutate: markFailed, isPending: markingFailed } = useMarkWithdrawalFailedMutation(() => {
    setFailedTarget(null)
    setReason('')
  })

  const referenceOk = REFERENCE_PATTERN.test(reference.trim())
  const referenceError = reference.trim() && !referenceOk ? '6 to 40 letters, numbers, dashes or slashes, no spaces' : undefined

  if (isLoading) return <TableSkeleton rows={4} cols={5} />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (withdrawals.length === 0) {
    return <EmptyState title="Nothing waiting to be paid" description="Approved withdrawals that need the money sent by hand appear here." />
  }

  return (
    <>
      <div className="table-container">
        <table className="table">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-th">Amount</th>
              <th className="table-th">Send to</th>
              <th className="table-th">Why it is here</th>
              <th className="table-th">Approved</th>
              <th className="table-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {withdrawals.map((wd) => (
              <tr key={wd.id} className="table-tr">
                <td className="table-td font-semibold text-gray-900">{formatCurrency(wd.finalAmount)}</td>
                <td className="table-td text-gray-700">
                  {wd.bankAccount ? (
                    <>
                      <p className="font-medium">{wd.bankAccount.accountHolderName}</p>
                      <p className="font-mono text-xs text-gray-500">
                        {wd.bankAccount.accountNumber} · {wd.bankAccount.ifscCode ?? ''}
                      </p>
                      <p className="text-xs text-gray-400">{wd.bankAccount.bankName}</p>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="table-td text-xs text-gray-500">
                  {wd.payoutMode === 'MANUAL' ? 'Payouts are set to manual' : 'The gateway could not start this payout'}
                </td>
                <td className="table-td text-gray-500">{wd.processedAt ? formatDate(wd.processedAt) : '—'}</td>
                <td className="table-td text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      className="btn-ghost btn-sm text-green-700 hover:bg-green-50"
                      onClick={() => {
                        setReference('')
                        setNote('')
                        setPaidTarget(wd)
                      }}
                    >
                      Mark paid
                    </button>
                    <button
                      className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setReason('')
                        setFailedTarget(wd)
                      }}
                    >
                      Could not send
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {paidTarget && (
        <Modal
          open
          onClose={() => setPaidTarget(null)}
          title="Record the payout"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setPaidTarget(null)} disabled={markingPaid}>
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={!referenceOk || markingPaid}
                onClick={() => markPaid({ id: paidTarget.id, reference: reference.trim(), note: note.trim() || undefined })}
              >
                {markingPaid && <Spinner size="sm" className="text-white" />}
                Confirm it was sent
              </button>
            </>
          }
        >
          <p className="mb-3 text-sm text-gray-600">
            You are recording that <span className="font-medium text-gray-900">{formatCurrency(paidTarget.finalAmount)}</span> was sent to{' '}
            <span className="font-medium text-gray-900">{paidTarget.bankAccount?.accountHolderName}</span>. Send it from the bank first. This can not be
            undone, and each bank reference can be used once.
          </p>
          <div className="space-y-3">
            <Input
              label="Bank reference (UTR)"
              hint="From the bank statement"
              value={reference}
              error={referenceError}
              onChange={(e) => setReference(e.target.value)}
            />
            <Textarea label="Note (optional)" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </Modal>
      )}

      {failedTarget && (
        <Modal
          open
          onClose={() => setFailedTarget(null)}
          title="The money could not be sent"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setFailedTarget(null)} disabled={markingFailed}>
                Cancel
              </button>
              <button
                className="btn-danger"
                disabled={reason.trim().length < 5 || markingFailed}
                onClick={() => markFailed({ id: failedTarget.id, reason: reason.trim() })}
              >
                {markingFailed && <Spinner size="sm" className="text-white" />}
                Return the money
              </button>
            </>
          }
        >
          <p className="mb-3 text-sm text-gray-600">
            <span className="font-medium text-gray-900">{formatCurrency(failedTarget.finalAmount)}</span> goes back to the user's available balance and
            they are told why.
          </p>
          <Textarea
            label="Reason (shown to the user)"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="For example: the bank rejected the account number."
          />
        </Modal>
      )}
    </>
  )
}
