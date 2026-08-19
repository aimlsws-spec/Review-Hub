import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/stores/auth.store'
import {
  useSupportTicketsQuery,
  useSupportTicketQuery,
  useCreateTicketMutation,
  useReplyToTicketMutation,
} from '@/hooks/useSupport'
import { ITEMS_PER_PAGE, SUPPORT_CATEGORY_LABELS, SUPPORT_PRIORITY_LABELS, SUPPORT_STATUS_LABELS } from '@/constants'
import { Input, Select, Textarea, Spinner, StatusBadge, EmptyState, ErrorState, Modal, TableSkeleton, Pagination } from '@reviewhub/shared-ui'
import { formatDateTime } from '@/utils'
import type { SupportCategory, SupportPriority } from '@/types'

const categoryOptions = Object.entries(SUPPORT_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))
const priorityOptions = Object.entries(SUPPORT_PRIORITY_LABELS).map(([value, label]) => ({ value, label }))

interface CreateTicketForm {
  subject: string
  description: string
  category: SupportCategory
  priority: SupportPriority
}

export default function SupportPage() {
  const merchantId = useAuthStore((s) => s.merchant?.id)
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  const { data, isLoading, isError, refetch } = useSupportTicketsQuery(merchantId, page, ITEMS_PER_PAGE)

  const tickets = data?.data?.data?.data ?? []
  const total = data?.data?.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const { data: ticketDetail, isLoading: detailLoading } = useSupportTicketQuery(merchantId, activeTicketId)
  const ticket = ticketDetail?.data?.data

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateTicketForm>({
    defaultValues: { category: 'GENERAL', priority: 'MEDIUM' },
  })

  const createMutation = useCreateTicketMutation(merchantId, () => {
    setCreateOpen(false)
    reset()
  })

  const replyMutation = useReplyToTicketMutation(merchantId, activeTicketId, () => setReplyText(''))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Support</h1>
          <p className="page-subtitle">Get help and contact our support team.</p>
        </div>
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Ticket
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : tickets.length === 0 ? (
        <EmptyState
          title="No support tickets yet"
          description="Need help? Open a ticket and our team will get back to you."
          action={<button className="btn-primary" onClick={() => setCreateOpen(true)}>New Ticket</button>}
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Subject</th>
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

      {/* New ticket modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); reset() }}
        title="New Support Ticket"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setCreateOpen(false); reset() }}>Cancel</button>
            <button
              className="btn-primary"
              onClick={handleSubmit((d) => createMutation.mutate(d))}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Spinner size="sm" className="text-white" />}
              Submit Ticket
            </button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Input
            label="Subject"
            required
            error={errors.subject?.message}
            {...register('subject', { required: 'Required', minLength: { value: 5, message: 'At least 5 characters' } })}
          />
          <Textarea
            label="Description"
            required
            rows={4}
            error={errors.description?.message}
            {...register('description', { required: 'Required', minLength: { value: 10, message: 'At least 10 characters' } })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" options={categoryOptions} {...register('category')} />
            <Select label="Priority" options={priorityOptions} {...register('priority')} />
          </div>
        </form>
      </Modal>

      {/* Ticket detail / thread modal */}
      <Modal
        open={!!activeTicketId}
        onClose={() => { setActiveTicketId(null); setReplyText('') }}
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
            <div className="mb-4 flex items-center gap-2">
              <StatusBadge status={ticket.status} label={SUPPORT_STATUS_LABELS[ticket.status]} />
              <span className="text-xs text-gray-400">{SUPPORT_CATEGORY_LABELS[ticket.category]} · {SUPPORT_PRIORITY_LABELS[ticket.priority]}</span>
            </div>

            <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg bg-gray-50 p-4">
              <div className="rounded-lg bg-white p-3 shadow-sm">
                <p className="text-sm text-gray-700">{ticket.description}</p>
                <p className="mt-1 text-xs text-gray-400">{formatDateTime(ticket.createdAt)}</p>
              </div>
              {(ticket.messages ?? []).filter((m) => !m.internalNote).map((m) => (
                <div
                  key={m.id}
                  className={m.senderType === 'MERCHANT' ? 'ml-auto max-w-[85%] rounded-lg bg-primary-50 p-3' : 'max-w-[85%] rounded-lg bg-white p-3 shadow-sm'}
                >
                  <p className="text-sm text-gray-700">{m.message}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {m.senderType === 'ADMIN' ? 'Support team' : 'You'} · {formatDateTime(m.createdAt)}
                  </p>
                </div>
              ))}
            </div>

            {ticket.status !== 'CLOSED' ? (
              <div className="mt-4 flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Type a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && replyText.trim()) replyMutation.mutate(replyText)
                  }}
                />
                <button
                  className="btn-primary"
                  disabled={!replyText.trim() || replyMutation.isPending}
                  onClick={() => replyMutation.mutate(replyText)}
                >
                  {replyMutation.isPending ? <Spinner size="sm" className="text-white" /> : 'Send'}
                </button>
              </div>
            ) : (
              <p className="mt-4 text-center text-xs text-gray-400">This ticket is closed.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
