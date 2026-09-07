import { Input, Spinner, EmptyState, ErrorState, Modal, ConfirmDialog, TableSkeleton, Pagination } from '@reviewhub/shared-ui'
import { useState } from 'react'

import { ITEMS_PER_PAGE } from '@/constants'
import {
  useCreateWebhookMutation,
  useDeleteWebhookMutation,
  useUpdateWebhookMutation,
  useWebhookDeliveriesQuery,
  useWebhooksQuery,
} from '@/hooks/useWebhooks'
import { useAuthStore } from '@/stores/auth.store'
import type { Webhook } from '@/types'
import { formatDate } from '@/utils'

interface WebhookFormState {
  url: string
  events: string
  enabled: boolean
}

const EMPTY_FORM: WebhookFormState = { url: '', events: '', enabled: true }

function parseEvents(value: string): string[] {
  return value.split(',').map((e) => e.trim()).filter(Boolean)
}

function DeliveriesModal({ merchantId, webhook, onClose }: { merchantId: string | undefined; webhook: Webhook; onClose: () => void }) {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useWebhookDeliveriesQuery(merchantId, webhook.id, { page, limit: ITEMS_PER_PAGE })

  const deliveries = data?.data.data?.data ?? []
  const total = data?.data.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  return (
    <Modal open onClose={onClose} title={`Deliveries — ${webhook.url}`}>
      {isLoading ? (
        <TableSkeleton rows={5} cols={3} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : deliveries.length === 0 ? (
        <EmptyState title="No deliveries yet" description="Delivery attempts for this webhook will appear here." />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Response</th>
                <th className="table-th">Attempts</th>
                <th className="table-th">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {deliveries.map((d) => (
                <tr key={d.id} className="table-tr">
                  <td className="table-td">{d.success ? 'Success' : 'Failed'}{d.responseCode ? ` (${d.responseCode})` : ''}</td>
                  <td className="table-td text-gray-500">{d.attempts}</td>
                  <td className="table-td text-gray-500">{formatDate(d.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </Modal>
  )
}

export default function WebhooksPage() {
  const merchantId = useAuthStore((s) => s.merchant?.id)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Webhook | null>(null)
  const [form, setForm] = useState<WebhookFormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null)
  const [deliveriesTarget, setDeliveriesTarget] = useState<Webhook | null>(null)

  const { data, isLoading, isError, refetch } = useWebhooksQuery(merchantId)
  const webhooks = data?.data.data ?? []

  const { mutate: create, isPending: creating } = useCreateWebhookMutation(merchantId, () => closeEditor())
  const { mutate: update, isPending: updating } = useUpdateWebhookMutation(merchantId, () => closeEditor())
  const { mutate: remove, isPending: deleting } = useDeleteWebhookMutation(merchantId, () => setDeleteTarget(null))

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setEditorOpen(true)
  }

  const openEdit = (webhook: Webhook) => {
    setEditing(webhook)
    setForm({ url: webhook.url, events: webhook.events.join(', '), enabled: webhook.enabled })
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditing(null)
  }

  const parsedEvents = parseEvents(form.events)
  const canSave = form.url.trim().length > 0 && parsedEvents.length > 0

  const handleSave = () => {
    if (editing) {
      update({ webhookId: editing.id, data: { url: form.url, events: parsedEvents, enabled: form.enabled } })
    } else {
      create({ url: form.url, events: parsedEvents, enabled: form.enabled })
    }
  }

  const saving = creating || updating

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Webhooks</h1>
          <p className="page-subtitle">Get notified at your own endpoint when things happen on your campaigns.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>New webhook</button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : webhooks.length === 0 ? (
        <EmptyState
          title="No webhooks yet"
          description="Register an endpoint to receive event notifications."
          action={<button className="btn-primary" onClick={openCreate}>New webhook</button>}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">URL</th>
                <th className="table-th">Events</th>
                <th className="table-th">Enabled</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {webhooks.map((webhook) => (
                <tr key={webhook.id} className="table-tr">
                  <td className="table-td font-mono text-xs text-gray-900">{webhook.url}</td>
                  <td className="table-td text-gray-500">{webhook.events.join(', ')}</td>
                  <td className="table-td text-gray-500">{webhook.enabled ? 'Yes' : 'No'}</td>
                  <td className="table-td text-right">
                    <div className="flex justify-end gap-2">
                      <button className="btn-ghost btn-sm" onClick={() => setDeliveriesTarget(webhook)}>Deliveries</button>
                      <button className="btn-ghost btn-sm" onClick={() => openEdit(webhook)}>Edit</button>
                      <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(webhook)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={closeEditor}
        title={editing ? 'Edit webhook' : 'New webhook'}
        footer={
          <>
            <button className="btn-secondary" onClick={closeEditor} disabled={saving}>Cancel</button>
            <button className="btn-primary" disabled={!canSave || saving} onClick={handleSave}>
              {saving && <Spinner size="sm" className="text-white" />}
              {editing ? 'Save changes' : 'Create webhook'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Endpoint URL"
            required
            placeholder="https://your-server.com/webhooks/viral-kar"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          />
          <Input
            label="Events"
            required
            hint="Comma-separated, e.g. campaign.completed, submission.approved"
            value={form.events}
            onChange={(e) => setForm((f) => ({ ...f, events: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} />
            Enabled
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove(deleteTarget.id)}
        title="Delete webhook"
        message={`Delete the webhook to ${deleteTarget?.url}? It will stop receiving events immediately.`}
        confirmLabel="Delete"
        loading={deleting}
      />

      {deliveriesTarget && (
        <DeliveriesModal merchantId={merchantId} webhook={deliveriesTarget} onClose={() => setDeliveriesTarget(null)} />
      )}
    </div>
  )
}
