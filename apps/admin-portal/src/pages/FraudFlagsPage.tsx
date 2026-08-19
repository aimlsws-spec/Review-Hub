import { useState } from 'react'
import { FRAUD_RISK_LABELS, ITEMS_PER_PAGE } from '@/constants'
import {
  PageHeader,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Pagination,
  StatusBadge,
  ConfirmDialog,
  Select,
} from '@reviewhub/shared-ui'
import { formatDateTime } from '@/utils'
import { useFraudFlagsQuery, useResolveFraudFlagMutation } from '@/hooks/useFraudFlags'
import type { FraudRiskLevel } from '@/types'

const RISK_OPTIONS = Object.entries(FRAUD_RISK_LABELS).map(([value, label]) => ({ value, label }))

export default function FraudFlagsPage() {
  const [page, setPage] = useState(1)
  const [resolved, setResolved] = useState<'unresolved' | 'resolved' | ''>('unresolved')
  const [riskLevel, setRiskLevel] = useState<FraudRiskLevel | ''>('')
  const [resolveTarget, setResolveTarget] = useState<{ id: string; reason: string } | null>(null)

  const { data, isLoading, isError, refetch } = useFraudFlagsQuery({
    page,
    limit: ITEMS_PER_PAGE,
    resolved: resolved === '' ? undefined : resolved === 'resolved',
    riskLevel,
  })

  const flags = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const { mutate: resolve, isPending } = useResolveFraudFlagMutation(() => setResolveTarget(null))

  return (
    <div>
      <PageHeader title="Fraud Flags" subtitle="Submissions flagged for suspicious activity." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="w-48">
          <Select
            label="Status"
            value={resolved}
            onChange={(e) => {
              setPage(1)
              setResolved(e.target.value as 'unresolved' | 'resolved' | '')
            }}
            options={[
              { value: 'unresolved', label: 'Unresolved' },
              { value: 'resolved', label: 'Resolved' },
            ]}
            placeholder="All"
          />
        </div>
        <div className="w-48">
          <Select
            label="Risk level"
            value={riskLevel}
            onChange={(e) => {
              setPage(1)
              setRiskLevel(e.target.value as FraudRiskLevel | '')
            }}
            options={RISK_OPTIONS}
            placeholder="All levels"
          />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : flags.length === 0 ? (
        <EmptyState
          title="No fraud flags"
          description="Nothing matches the current filters."
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">User</th>
                <th className="table-th">Risk</th>
                <th className="table-th">Reason</th>
                <th className="table-th">Flagged</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {flags.map((flag) => (
                <tr key={flag.id} className="table-tr">
                  <td className="table-td">
                    {flag.user ? `${flag.user.firstName} ${flag.user.lastName}` : flag.userId.slice(0, 8)}
                  </td>
                  <td className="table-td"><StatusBadge status={flag.riskLevel} /></td>
                  <td className="table-td max-w-xs truncate text-gray-500" title={flag.reason}>{flag.reason}</td>
                  <td className="table-td text-gray-500">{formatDateTime(flag.createdAt)}</td>
                  <td className="table-td text-right">
                    {flag.resolved ? (
                      <span className="text-xs text-gray-400">Resolved</span>
                    ) : (
                      <button className="btn-ghost btn-sm text-green-700 hover:bg-green-50" onClick={() => setResolveTarget({ id: flag.id, reason: flag.reason })}>
                        Mark resolved
                      </button>
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
        <ConfirmDialog
          open
          onClose={() => setResolveTarget(null)}
          onConfirm={() => resolve(resolveTarget.id)}
          title="Resolve fraud flag"
          message={`Mark this flag as resolved? Reason on file: "${resolveTarget.reason}"`}
          confirmLabel="Mark resolved"
          variant="primary"
          loading={isPending}
        />
      )}
    </div>
  )
}
