import { PageHeader, EmptyState, ErrorState, TableSkeleton, Pagination, StatusBadge, Select, ConfirmDialog } from '@reviewhub/shared-ui'
import { useState } from 'react'

import { BroadcastComposeModal } from '@/components/BroadcastComposeModal'
import { BroadcastDetailModal } from '@/components/BroadcastDetailModal'
import { TemplateFormModal } from '@/components/TemplateFormModal'
import { BROADCAST_CHANNEL_LABELS, BROADCAST_STATUS_LABELS, BROADCAST_TYPE_LABELS, ITEMS_PER_PAGE } from '@/constants'
import {
  useAudienceLocationsQuery,
  useBroadcastsQuery,
  useDeleteTemplateMutation,
  useNotificationTemplatesQuery,
} from '@/hooks/useNotificationCenter'
import type { BroadcastStatus, NotificationTemplate } from '@/types'
import { cn, formatDate, formatDateTime } from '@/utils'
import { describeAudience } from '@/utils/notifications'

type Tab = 'broadcasts' | 'templates'

const STATUS_OPTIONS = Object.entries(BROADCAST_STATUS_LABELS).map(([value, label]) => ({ value, label }))

export default function NotificationCenterPage() {
  const [tab, setTab] = useState<Tab>('broadcasts')
  // A template's id when composing from it, true for a blank broadcast, null when closed.
  const [composeFrom, setComposeFrom] = useState<NotificationTemplate | true | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)

  return (
    <div>
      <PageHeader
        title="Notification Center"
        subtitle="Send announcements to your users and manage reusable messages."
        primaryAction={
          <button className="btn-primary" onClick={() => setComposeFrom(true)}>
            New broadcast
          </button>
        }
      />

      <div className="mb-4 flex gap-1 border-b border-gray-200" role="tablist">
        {(['broadcasts', 'templates'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              'border-b-2 px-4 py-2 text-sm font-medium capitalize',
              tab === t ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'broadcasts' ? (
        <BroadcastsTab onOpen={setDetailId} />
      ) : (
        <TemplatesTab onUse={(template) => setComposeFrom(template)} />
      )}

      {composeFrom && <BroadcastComposeModal template={composeFrom === true ? null : composeFrom} onClose={() => setComposeFrom(null)} />}
      {detailId && <BroadcastDetailModal broadcastId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}

function BroadcastsTab({ onOpen }: { onOpen: (broadcastId: string) => void }) {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<BroadcastStatus | ''>('')

  const { data, isLoading, isError, refetch } = useBroadcastsQuery({ page, limit: ITEMS_PER_PAGE, status })
  const locations = useAudienceLocationsQuery().data?.data.data ?? []

  const broadcasts = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  return (
    <div>
      <div className="mb-4 w-48">
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          placeholder="All statuses"
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value as BroadcastStatus | '')
          }}
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : broadcasts.length === 0 ? (
        <EmptyState
          title="No broadcasts yet"
          description={status ? 'No broadcasts have this status.' : 'Send your first announcement with the New broadcast button.'}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Message</th>
                <th className="table-th">Audience</th>
                <th className="table-th">Channels</th>
                <th className="table-th">Status</th>
                <th className="table-th">When</th>
                <th className="table-th text-right">Recipients</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {broadcasts.map((b) => (
                <tr key={b.id} className="table-tr">
                  <td className="table-td">
                    <p className="font-medium text-gray-900">{b.title}</p>
                    <p className="text-xs text-gray-500">{BROADCAST_TYPE_LABELS[b.type] ?? b.type}</p>
                  </td>
                  <td className="table-td text-gray-500">{describeAudience(b.audience, locations)}</td>
                  <td className="table-td text-gray-500">{b.channels.map((c) => BROADCAST_CHANNEL_LABELS[c]).join(', ')}</td>
                  <td className="table-td">
                    <StatusBadge status={b.status} label={BROADCAST_STATUS_LABELS[b.status]} />
                  </td>
                  <td className="table-td text-gray-500">{formatDateTime(b.scheduledAt)}</td>
                  <td className="table-td text-right text-gray-900">{b.status === 'SCHEDULED' ? '—' : b.recipientCount.toLocaleString('en-IN')}</td>
                  <td className="table-td text-right">
                    <button className="btn-ghost btn-sm text-primary-600 hover:bg-primary-50" onClick={() => onOpen(b.id)}>
                      {b.status === 'SCHEDULED' ? 'View or cancel' : 'View'}
                    </button>
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

function TemplatesTab({ onUse }: { onUse: (template: NotificationTemplate) => void }) {
  const [editing, setEditing] = useState<NotificationTemplate | 'new' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NotificationTemplate | null>(null)

  const { data, isLoading, isError, refetch } = useNotificationTemplatesQuery()
  const templates = data?.data.data ?? []
  const { mutate: remove, isPending: removing } = useDeleteTemplateMutation(() => setDeleteTarget(null))

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn-secondary" onClick={() => setEditing('new')}>
          New template
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : templates.length === 0 ? (
        <EmptyState title="No templates yet" description="Save a message you send often so you can reuse it." />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Message</th>
                <th className="table-th">Usually sent by</th>
                <th className="table-th">Available</th>
                <th className="table-th">Updated</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {templates.map((t) => (
                <tr key={t.id} className="table-tr">
                  <td className="table-td font-medium text-gray-900">{t.name}</td>
                  <td className="table-td">
                    <p className="text-gray-900">{t.title}</p>
                    <p className="max-w-md truncate text-xs text-gray-500">{t.body}</p>
                  </td>
                  <td className="table-td text-gray-500">{BROADCAST_CHANNEL_LABELS[t.channel] ?? t.channel}</td>
                  <td className="table-td text-gray-500">{t.isActive ? 'Yes' : 'No'}</td>
                  <td className="table-td text-gray-500">{formatDate(t.updatedAt)}</td>
                  <td className="table-td text-right">
                    <div className="flex justify-end gap-2">
                      <button className="btn-ghost btn-sm text-primary-600 hover:bg-primary-50" onClick={() => onUse(t)} disabled={!t.isActive}>
                        Use
                      </button>
                      <button className="btn-ghost btn-sm" onClick={() => setEditing(t)}>
                        Edit
                      </button>
                      <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(t)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <TemplateFormModal template={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}

      {deleteTarget && (
        <ConfirmDialog
          open
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => remove(deleteTarget.id)}
          title="Delete template"
          message={`Delete "${deleteTarget.name}"? Broadcasts already sent from it are not affected.`}
          confirmLabel="Delete"
          variant="danger"
          loading={removing}
        />
      )}
    </div>
  )
}
