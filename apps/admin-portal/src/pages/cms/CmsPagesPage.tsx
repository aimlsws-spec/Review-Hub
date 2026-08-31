import {
  PageHeader,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Pagination,
  StatusBadge,
  ConfirmDialog,
  Modal,
  Input,
  Select,
  Textarea,
  Spinner,
} from '@reviewhub/shared-ui'
import { useState } from 'react'

import { ITEMS_PER_PAGE } from '@/constants'
import { useCmsPagesQuery, useDeleteCmsPageMutation, useSaveCmsPageMutation } from '@/hooks/useCmsPages'
import type { CMSPage, CMSPageStatus } from '@/types'
import { formatDate } from '@/utils'

interface PageFormState {
  title: string
  slug: string
  content: string
  metaTitle: string
  metaDescription: string
  status: CMSPageStatus
}

const EMPTY_FORM: PageFormState = { title: '', slug: '', content: '', metaTitle: '', metaDescription: '', status: 'DRAFT' }

const STATUS_OPTIONS: { value: CMSPageStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
]

function slugify(title: string) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function CmsPagesPage() {
  const [page, setPage] = useState(1)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<CMSPage | null>(null)
  const [form, setForm] = useState<PageFormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<CMSPage | null>(null)

  const { data, isLoading, isError, refetch } = useCmsPagesQuery({ page, limit: ITEMS_PER_PAGE })

  const pages = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const { mutate: save, isPending: saving } = useSaveCmsPageMutation(() => closeEditor())

  const { mutate: remove, isPending: deleting } = useDeleteCmsPageMutation(() => setDeleteTarget(null))

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setEditorOpen(true)
  }

  const openEdit = (cmsPage: CMSPage) => {
    setEditing(cmsPage)
    setForm({
      title: cmsPage.title,
      slug: cmsPage.slug,
      content: cmsPage.content,
      metaTitle: cmsPage.metaTitle ?? '',
      metaDescription: cmsPage.metaDescription ?? '',
      status: cmsPage.status,
    })
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditing(null)
  }

  const canSave = form.title.trim().length >= 3 && form.slug.trim().length >= 3 && form.content.trim().length >= 10

  return (
    <div>
      <PageHeader
        title="CMS Pages"
        subtitle="Static content pages shown on the platform."
        primaryAction={<button className="btn-primary" onClick={openCreate}>New page</button>}
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : pages.length === 0 ? (
        <EmptyState
          title="No pages yet"
          description="Create your first CMS page."
          action={<button className="btn-primary" onClick={openCreate}>New page</button>}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Title</th>
                <th className="table-th">Slug</th>
                <th className="table-th">Status</th>
                <th className="table-th">Updated</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pages.map((cmsPage) => (
                <tr key={cmsPage.id} className="table-tr">
                  <td className="table-td font-medium text-gray-900">{cmsPage.title}</td>
                  <td className="table-td text-gray-500 font-mono text-xs">/{cmsPage.slug}</td>
                  <td className="table-td"><StatusBadge status={cmsPage.status} /></td>
                  <td className="table-td text-gray-500">{formatDate(cmsPage.updatedAt)}</td>
                  <td className="table-td text-right">
                    <div className="flex justify-end gap-2">
                      <button className="btn-ghost btn-sm" onClick={() => openEdit(cmsPage)}>Edit</button>
                      <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(cmsPage)}>Delete</button>
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
          title={editing ? 'Edit page' : 'New page'}
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
                {editing ? 'Save changes' : 'Create page'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Title"
              required
              value={form.title}
              onChange={(e) => {
                const title = e.target.value
                setForm((f) => ({ ...f, title, slug: editing ? f.slug : slugify(title) }))
              }}
            />
            <Input
              label="Slug"
              required
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              disabled={!!editing}
              hint={editing ? 'Slug cannot be changed after creation.' : undefined}
            />
            <Textarea
              label="Content"
              required
              rows={6}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
            <Input
              label="Meta title"
              value={form.metaTitle}
              onChange={(e) => setForm((f) => ({ ...f, metaTitle: e.target.value }))}
            />
            <Textarea
              label="Meta description"
              rows={2}
              value={form.metaDescription}
              onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))}
            />
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CMSPageStatus }))}
            />
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => remove(deleteTarget.id)}
          title="Delete page"
          message={`Delete "${deleteTarget.title}"? This can be restored later by an engineer, but won't be visible on the platform.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleting}
        />
      )}
    </div>
  )
}
