import { useState } from 'react'
import { ITEMS_PER_PAGE, SUPPORT_CATEGORY_LABELS, SUPPORT_PRIORITY_LABELS, SUPPORT_STATUS_LABELS } from '@/constants'
import {
  PageHeader,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Pagination,
  StatusBadge,
  Modal,
  Select,
  Spinner,
} from '@reviewhub/shared-ui'
import { formatDateTime } from '@/utils'
import {
  useReplySupportTicketMutation,
  useSupportTicketDetailQuery,
  useSupportTicketsQuery,
  useUpdateSupportTicketStatusMutation,
} from '@/hooks/useSupportTickets'
import type { SupportTicketStatus } from '@/types'

const STATUS_OPTIONS = Object.entries(SUPPORT_STATUS_LABELS).map(([value, label]) => ({ value, label }))

export default function SupportTicketsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<SupportTicketStatus | ''>('')
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [internalNote, setInternalNote] = useState(false)

  const { data, isLoading, isError, refetch } = useSupportTicketsQuery({ page, limit: ITEMS_PER_PAGE, status })

  const tickets = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const { data: ticketDetail, isLoading: detailLoading } = useSupportTicketDetailQuery(activeTicketId)

  const ticket = ticketDetail?.data.data

  const { mutate: reply, isPending: replying } = useReplySupportTicketMutation(activeTicketId, () => {
    setReplyText('')
    setInternalNote(false)
  })

  const { mutate: changeStatus } = useUpdateSupportTicketStatusMutation(activeTicketId)

  return (
    <div>
      <PageHeader title="Support Tickets" subtitle="Requests from users and merchants." />

      <div className="mb-4 w-56">
        <Select
          label="Status"
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value as SupportTicketStatus | '')
          }}
          options={STATUS_OPTIONS}
          placeholder="All statuses"
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : tickets.length === 0 ? (
        <EmptyState title="No support tickets" description="Nothing matches the current filter." />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Subject</th>
                <th className="table-th">From</th>
                <th className="table-th">Category</th>
                <th className="table-th">Priority</th>
                <th className="table-th">Status</th>
                <th className="table-th">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tickets.map((t) => (
                <tr key={t.id} className="table-tr cursor-pointer" onClick={() => setActiveTicketId(t.id)}>
                  <td className="table-td font-medium text-gray-900">{t.subject}</td>
                  <td className="table-td text-gray-500">{t.merchantId ? 'Merchant' : 'User'}</td>
                  <td className="table-td text-gray-500">{SUPPORT_CATEGORY_LABELS[t.category] ?? t.category}</td>
                  <td className="table-td text-gray-500">{SUPPORT_PRIORITY_LABELS[t.priority] ?? t.priority}</td>
                  <td className="table-td"><StatusBadge status={t.status} label={SUPPORT_STATUS_LABELS[t.status]} /></td>
                  <td className="table-td text-gray-500">{formatDateTime(t.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <Modal
        open={!!activeTicketId}
        onClose={() => { setActiveTicketId(null); setReplyText(''); setInternalNote(false) }}
        title={ticket?.subject ?? 'Ticket'}
        size="lg"
      >
        {detailLoading || !ticket ? (
          <div className="space-y-3">
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-16 w-full" />
          </div>
        ) : (
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <StatusBadge status={ticket.status} label={SUPPORT_STATUS_LABELS[ticket.status]} />
              <span className="text-xs text-gray-400">
                {SUPPORT_CATEGORY_LABELS[ticket.category]} · {SUPPORT_PRIORITY_LABELS[ticket.priority]} · {ticket.merchantId ? 'Merchant' : 'User'}
              </span>
              <div className="ml-auto w-44">
                <Select
                  value={ticket.status}
                  onChange={(e) => changeStatus(e.target.value as SupportTicketStatus)}
                  options={STATUS_OPTIONS}
                />
              </div>
            </div>

            <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg bg-gray-50 p-4">
              <div className="rounded-lg bg-white p-3 shadow-sm">
                <p className="text-sm text-gray-700">{ticket.description}</p>
                <p className="mt-1 text-xs text-gray-400">{formatDateTime(ticket.createdAt)}</p>
              </div>
              {(ticket.messages ?? []).map((m) => (
                <div
                  key={m.id}
                  className={
                    m.internalNote
                      ? 'max-w-[85%] rounded-lg border border-yellow-200 bg-yellow-50 p-3'
                      : m.senderType === 'ADMIN'
                        ? 'ml-auto max-w-[85%] rounded-lg bg-primary-50 p-3'
                        : 'max-w-[85%] rounded-lg bg-white p-3 shadow-sm'
                  }
                >
                  <p className="text-sm text-gray-700">{m.message}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {m.internalNote ? 'Internal note' : m.senderType === 'ADMIN' ? 'Support team' : ticket.merchantId ? 'Merchant' : 'User'}
                    {' · '}{formatDateTime(m.createdAt)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="Type a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={internalNote}
                    onChange={(e) => setInternalNote(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  Internal note (not visible to requester)
                </label>
                <button className="btn-primary" disabled={!replyText.trim() || replying} onClick={() => reply({ message: replyText, internalNote })}>
                  {replying && <Spinner size="sm" className="text-white" />}
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
