import {
  PageHeader,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Pagination,
  Badge,
  ConfirmDialog,
  Modal,
  Input,
  Textarea,
  Spinner,
} from '@reviewhub/shared-ui'
import { useState } from 'react'

import { ITEMS_PER_PAGE } from '@/constants'
import { useDeleteFaqMutation, useFaqsQuery, useSaveFaqMutation } from '@/hooks/useFaqs'
import type { FAQ } from '@/types'

interface FaqFormState {
  category: string
  question: string
  answer: string
  sortOrder: number
  isActive: boolean
}

const EMPTY_FORM: FaqFormState = { category: '', question: '', answer: '', sortOrder: 0, isActive: true }

export default function FaqsPage() {
  const [page, setPage] = useState(1)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<FAQ | null>(null)
  const [form, setForm] = useState<FaqFormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<FAQ | null>(null)

  const { data, isLoading, isError, refetch } = useFaqsQuery({ page, limit: ITEMS_PER_PAGE })

  const faqs = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const { mutate: save, isPending: saving } = useSaveFaqMutation(() => closeEditor())

  const { mutate: remove, isPending: deleting } = useDeleteFaqMutation(() => setDeleteTarget(null))

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setEditorOpen(true)
  }

  const openEdit = (faq: FAQ) => {
    setEditing(faq)
    setForm({ category: faq.category, question: faq.question, answer: faq.answer, sortOrder: faq.sortOrder, isActive: faq.isActive })
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditing(null)
  }

  const canSave = form.category.trim().length > 0 && form.question.trim().length >= 5 && form.answer.trim().length >= 5

  return (
    <div>
      <PageHeader
        title="FAQs"
        subtitle="Frequently asked questions shown to users and merchants."
        primaryAction={<button className="btn-primary" onClick={openCreate}>New FAQ</button>}
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : faqs.length === 0 ? (
        <EmptyState
          title="No FAQs yet"
          description="Create your first FAQ entry."
          action={<button className="btn-primary" onClick={openCreate}>New FAQ</button>}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Category</th>
                <th className="table-th">Question</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {faqs.map((faq) => (
                <tr key={faq.id} className="table-tr">
                  <td className="table-td text-gray-500">{faq.category}</td>
                  <td className="table-td max-w-md truncate font-medium text-gray-900" title={faq.question}>{faq.question}</td>
                  <td className="table-td">
                    <Badge variant={faq.isActive ? 'green' : 'gray'}>{faq.isActive ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="table-td text-right">
                    <div className="flex justify-end gap-2">
                      <button className="btn-ghost btn-sm" onClick={() => openEdit(faq)}>Edit</button>
                      <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(faq)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {editorOpen && (
        <Modal
          open
          onClose={closeEditor}
          title={editing ? 'Edit FAQ' : 'New FAQ'}
          size="lg"
          footer={
            <>
              <button className="btn-secondary" onClick={closeEditor} disabled={saving}>Cancel</button>
              <button
                className="btn-primary"
                disabled={!canSave || saving}
                onClick={() => save({ editingId: editing?.id ?? null, form })}
              >
                {saving && <Spinner size="sm" className="text-white" />}
                {editing ? 'Save changes' : 'Create FAQ'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Category"
              required
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
            <Input
              label="Question"
              required
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
            />
            <Textarea
              label="Answer"
              required
              rows={4}
              value={form.answer}
              onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
            />
            <Input
              label="Sort order"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
            />
            <label className="flex cursor-pointer items-center gap-2.5 select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              <span className="text-sm text-slate-600">Active (visible to users)</span>
            </label>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => remove(deleteTarget.id)}
          title="Delete FAQ"
          message={`Delete "${deleteTarget.question}"?`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleting}
        />
      )}
    </div>
  )
}
