import { useState } from 'react'
import { ITEMS_PER_PAGE } from '@/constants'
import {
  PageHeader,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Pagination,
  Badge,
} from '@reviewhub/shared-ui'
import { formatDateTime } from '@/utils'
import { useAuditLogsQuery } from '@/hooks/useAuditLogs'

const ACTION_VARIANT: Record<string, 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple'> = {
  CREATE: 'blue',
  UPDATE: 'yellow',
  DELETE: 'red',
  APPROVE: 'green',
  REJECT: 'red',
  SUSPEND: 'red',
  BAN: 'red',
  RESTORE: 'green',
  STATUS_CHANGE: 'yellow',
  CONFIG_CHANGE: 'purple',
  LOGIN: 'gray',
  LOGOUT: 'gray',
  VERIFY: 'blue',
  EXPORT: 'gray',
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const [entity, setEntity] = useState('')
  const [entityFilter, setEntityFilter] = useState('')

  const { data, isLoading, isError, refetch } = useAuditLogsQuery({ page, limit: ITEMS_PER_PAGE, entity: entityFilter })

  const logs = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Every admin action, recorded." />

      <div className="mb-4 flex items-end gap-3">
        <div className="form-group max-w-xs">
          <label className="label" htmlFor="entity">Entity</label>
          <input
            id="entity"
            className="input"
            placeholder="e.g. Campaign, User, WithdrawalRequest"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1)
                setEntityFilter(entity)
              }
            }}
          />
        </div>
        <button
          className="btn-secondary"
          onClick={() => {
            setPage(1)
            setEntityFilter(entity)
          }}
        >
          Filter
        </button>
        {entityFilter && (
          <button
            className="btn-ghost"
            onClick={() => {
              setEntity('')
              setEntityFilter('')
              setPage(1)
            }}
          >
            Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : logs.length === 0 ? (
        <EmptyState
          title="No audit log entries"
          description="Nothing matches the current filter."
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Action</th>
                <th className="table-th">Entity</th>
                <th className="table-th">Actor</th>
                <th className="table-th">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="table-tr">
                  <td className="table-td">
                    <Badge variant={ACTION_VARIANT[log.action] ?? 'gray'}>{log.action.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="table-td">
                    <span className="font-medium text-gray-900">{log.entity}</span>
                    {log.entityId && <span className="ml-1.5 font-mono text-xs text-gray-400">{log.entityId.slice(0, 8)}…</span>}
                  </td>
                  <td className="table-td text-gray-500">
                    <span className="font-mono text-xs">{log.actorId.slice(0, 8)}…</span>
                    <span className="ml-1.5 text-xs text-gray-400">({log.actorType})</span>
                  </td>
                  <td className="table-td text-gray-500">{formatDateTime(log.createdAt)}</td>
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
