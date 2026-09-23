import { PageHeader, EmptyState, ErrorState, TableSkeleton, Pagination, StatusBadge, Modal, Textarea, Spinner, Select } from '@reviewhub/shared-ui'
import { useState } from 'react'

import { ITEMS_PER_PAGE } from '@/constants'
import { useDisputesQuery, useResolveDisputeMutation } from '@/hooks/useDisputes'
import type { Dispute, DisputeStatus } from '@/types'
import { formatDateTime } from '@/utils'

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'UPHELD', label: 'Upheld' },
  { value: 'REVERSED', label: 'Reversed' },
]

export default function DisputesPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<DisputeStatus | ''>('')
  const [resolveTarget, setResolveTarget] = useState<Dispute | null>(null)
  const [notes, setNotes] = useState('')

  const { data, isLoading, isError, refetch } = useDisputesQuery({ page, limit: ITEMS_PER_PAGE, status })

  const disputes = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const { mutate: resolve, isPending } = useResolveDisputeMutation(() => {
    setResolveTarget(null)
    setNotes('')
  })

  const openResolve = (dispute: Dispute) => {
    setResolveTarget(dispute)
    setNotes('')
  }

  return (
    <div>
      <PageHeader title="Disputes" subtitle="Users disputing a rejected task submission or reward." />

      <div className="mb-4 w-56">
        <Select
          label="Status"
          value={status}
          onChange={(e) => { setStatus(e.target.value as DisputeStatus | ''); setPage(1) }}
          options={STATUS_OPTIONS}
          placeholder="All statuses"
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : disputes.length === 0 ? (
        <EmptyState title="No disputes" description="Nothing matches the current filter." />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">User</th>
                <th className="table-th">Task</th>
                <th className="table-th">Reason</th>
                <th className="table-th">Status</th>
                <th className="table-th">Opened</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {disputes.map((dispute) => (
                <tr key={dispute.id} className="table-tr">
                  <td className="table-td">{dispute.user.firstName} {dispute.user.lastName}</td>
                  <td className="table-td text-gray-500">{dispute.submission.task.title}</td>
                  <td className="table-td max-w-xs truncate text-gray-500" title={dispute.reason}>{dispute.reason}</td>
                  <td className="table-td"><StatusBadge status={dispute.status} /></td>
                  <td className="table-td text-gray-500">{formatDateTime(dispute.createdAt)}</td>
                  <td className="table-td text-right">
                    {dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW' ? (
                      <button className="btn-ghost btn-sm" onClick={() => openResolve(dispute)}>Resolve</button>
                    ) : (
                      <span className="text-xs text-gray-400">{dispute.status === 'UPHELD' ? 'Upheld' : 'Reversed'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {resolveTarget && (
        <Modal
          open
          onClose={() => setResolveTarget(null)}
          title="Resolve dispute"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setResolveTarget(null)} disabled={isPending}>Cancel</button>
              <button
                className="btn-secondary"
                disabled={isPending}
                onClick={() => resolve({ disputeId: resolveTarget.id, decision: 'UPHELD', notes })}
              >
                {isPending && <Spinner size="sm" />}
                Uphold rejection
              </button>
              <button
                className="btn-primary"
                disabled={isPending}
                onClick={() => resolve({ disputeId: resolveTarget.id, decision: 'REVERSED', notes })}
              >
                {isPending && <Spinner size="sm" className="text-white" />}
                Reverse — approve it
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Task</p>
              <p className="text-sm text-gray-900">{resolveTarget.submission.task.title}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Original rejection reason</p>
              <p className="text-sm text-gray-700">{resolveTarget.submission.rejectionReason ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">User's dispute reason</p>
              <p className="text-sm text-gray-700">{resolveTarget.reason}</p>
            </div>
            <p className="text-xs text-gray-500">
              Reversing runs the submission through the normal approval path — the reward is credited and the
              campaign budget charged, same as any other approval.
            </p>
            <Textarea
              label="Admin notes (optional)"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why you upheld or reversed the decision..."
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
