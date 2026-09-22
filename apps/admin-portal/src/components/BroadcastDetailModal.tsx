import { Modal, Spinner, StatusBadge } from '@reviewhub/shared-ui'
import { useState } from 'react'

import { BROADCAST_CHANNEL_LABELS, BROADCAST_STATUS_LABELS, BROADCAST_TYPE_LABELS } from '@/constants'
import { useAudienceLocationsQuery, useBroadcastQuery, useCancelBroadcastMutation } from '@/hooks/useNotificationCenter'
import type { BroadcastChannel, BroadcastDelivery } from '@/types'
import { formatDateTime } from '@/utils'
import { describeAudience } from '@/utils/notifications'

interface BroadcastDetailModalProps {
  broadcastId: string
  onClose: () => void
}

/** What was sent, to whom, and how it is going. Refreshes by itself while the broadcast is still sending. */
export function BroadcastDetailModal({ broadcastId, onClose }: BroadcastDetailModalProps) {
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  const query = useBroadcastQuery(broadcastId)
  const broadcast = query.data?.data.data
  const locations = useAudienceLocationsQuery().data?.data.data ?? []
  const { mutate: cancel, isPending: cancelling } = useCancelBroadcastMutation(onClose)

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title="Broadcast details"
      footer={
        broadcast?.status === 'SCHEDULED' ? (
          confirmingCancel ? (
            <>
              <button className="btn-secondary" onClick={() => setConfirmingCancel(false)} disabled={cancelling}>
                Keep it
              </button>
              <button className="btn-danger" onClick={() => cancel(broadcast.id)} disabled={cancelling}>
                {cancelling && <Spinner size="sm" className="text-white" />}
                Yes, cancel broadcast
              </button>
            </>
          ) : (
            <>
              <button className="btn-secondary" onClick={onClose}>
                Close
              </button>
              <button className="btn-danger" onClick={() => setConfirmingCancel(true)}>
                Cancel broadcast
              </button>
            </>
          )
        ) : (
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        )
      }
    >
      {query.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : query.isError || !broadcast ? (
        <p className="py-8 text-center text-sm text-red-600">This broadcast could not be loaded.</p>
      ) : (
        <div className="space-y-5 text-sm">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="font-semibold text-gray-900">{broadcast.title}</p>
            <p className="mt-1 whitespace-pre-wrap text-gray-700">{broadcast.message}</p>
          </div>

          {confirmingCancel && (
            <p className="rounded-lg bg-amber-50 p-3 text-amber-800">This stops the broadcast before it starts. Nobody will receive it.</p>
          )}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Detail label="Status" value={<StatusBadge status={broadcast.status} label={BROADCAST_STATUS_LABELS[broadcast.status]} />} />
            <Detail label="Type" value={BROADCAST_TYPE_LABELS[broadcast.type] ?? broadcast.type} />
            <Detail label="Audience" value={describeAudience(broadcast.audience, locations)} />
            <Detail label="Channels" value={broadcast.channels.map((c) => BROADCAST_CHANNEL_LABELS[c]).join(', ')} />
            <Detail label={broadcast.status === 'SCHEDULED' ? 'Scheduled for' : 'Scheduled'} value={formatDateTime(broadcast.scheduledAt)} />
            <Detail label="Recipients queued" value={broadcast.recipientCount.toLocaleString('en-IN')} />
            <Detail label="Timing" value={broadcast.smartTiming ? "Each person's best time" : 'All at once'} />
            {broadcast.startedAt && <Detail label="Started" value={formatDateTime(broadcast.startedAt)} />}
            {broadcast.completedAt && <Detail label="Finished" value={formatDateTime(broadcast.completedAt)} />}
            <Detail label="Created by" value={`${broadcast.createdBy.name} on ${formatDateTime(broadcast.createdAt)}`} />
          </dl>

          {broadcast.failureReason && (
            <p className="rounded-lg bg-red-50 p-3 text-red-700">
              <span className="font-medium">Failed:</span> {broadcast.failureReason}
            </p>
          )}

          {broadcast.status === 'SENDING' && (
            <p className="text-gray-500">Still sending. These numbers update on their own.</p>
          )}

          <DeliveryTable channels={broadcast.channels} deliveries={broadcast.deliveries} />
        </div>
      )}
    </Modal>
  )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-gray-900">{value}</dd>
    </div>
  )
}

/** Adds up the per-status counts the server reports into one row per channel. */
function summarise(channel: BroadcastChannel, deliveries: BroadcastDelivery[]) {
  const count = (...statuses: BroadcastDelivery['status'][]) =>
    deliveries.filter((d) => d.channel === channel && statuses.includes(d.status)).reduce((sum, d) => sum + d.count, 0)

  return {
    created: count('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED'),
    sent: count('SENT', 'DELIVERED', 'READ'),
    read: count('READ'),
    failed: count('FAILED'),
    waiting: count('QUEUED'),
  }
}

function DeliveryTable({ channels, deliveries }: { channels: BroadcastChannel[]; deliveries: BroadcastDelivery[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-900">Delivery</h3>
      <div className="table-container">
        <table className="table">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-th">Channel</th>
              <th className="table-th text-right">Messages</th>
              <th className="table-th text-right">Sent</th>
              <th className="table-th text-right">Read</th>
              <th className="table-th text-right">Failed</th>
              <th className="table-th text-right">Waiting</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {channels.map((channel) => {
              const row = summarise(channel, deliveries)
              return (
                <tr key={channel} className="table-tr">
                  <td className="table-td font-medium text-gray-900">{BROADCAST_CHANNEL_LABELS[channel]}</td>
                  <td className="table-td text-right">{row.created.toLocaleString('en-IN')}</td>
                  <td className="table-td text-right">{row.sent.toLocaleString('en-IN')}</td>
                  <td className="table-td text-right">{row.read.toLocaleString('en-IN')}</td>
                  <td className="table-td text-right">{row.failed.toLocaleString('en-IN')}</td>
                  <td className="table-td text-right">{row.waiting.toLocaleString('en-IN')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Users who turned off a channel are skipped there, so a channel can show fewer messages than recipients.
      </p>
    </div>
  )
}
