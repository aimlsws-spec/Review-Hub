import {
  PageHeader,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Pagination,
  ConfirmDialog,
  Modal,
  Input,
  Select,
  Textarea,
  Spinner,
} from '@reviewhub/shared-ui'
import { useState } from 'react'

import { ITEMS_PER_PAGE } from '@/constants'
import { useBadgesQuery, useDeleteBadgeMutation, useSaveBadgeMutation } from '@/hooks/useBadges'
import type { Badge, BadgeCriteriaType } from '@/types'

interface BadgeFormState {
  code: string
  name: string
  description: string
  iconUrl: string
  criteriaType: BadgeCriteriaType
  criteriaValue: string
  isActive: boolean
}

const EMPTY_FORM: BadgeFormState = {
  code: '',
  name: '',
  description: '',
  iconUrl: '',
  criteriaType: 'XP_THRESHOLD',
  criteriaValue: '',
  isActive: true,
}

const CRITERIA_OPTIONS: { value: BadgeCriteriaType; label: string }[] = [
  { value: 'XP_THRESHOLD', label: 'XP threshold' },
  { value: 'STREAK_THRESHOLD', label: 'Streak threshold' },
  { value: 'LEVEL_THRESHOLD', label: 'Level threshold' },
  { value: 'REWARD_COUNT', label: 'Reward count' },
]

export default function BadgesPage() {
  const [page, setPage] = useState(1)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Badge | null>(null)
  const [form, setForm] = useState<BadgeFormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<Badge | null>(null)

  const { data, isLoading, isError, refetch } = useBadgesQuery({ page, limit: ITEMS_PER_PAGE })

  const badges = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const { mutate: save, isPending: saving } = useSaveBadgeMutation(() => closeEditor())

  const { mutate: remove, isPending: deleting } = useDeleteBadgeMutation(() => setDeleteTarget(null))

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setEditorOpen(true)
  }

  const openEdit = (badge: Badge) => {
    setEditing(badge)
    setForm({
      code: badge.code,
      name: badge.name,
      description: badge.description,
      iconUrl: badge.iconUrl ?? '',
      criteriaType: badge.criteriaType,
      criteriaValue: String(badge.criteriaValue),
      isActive: badge.isActive,
    })
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditing(null)
  }

  const criteriaValueNumber = Number(form.criteriaValue)
  const canSave =
    form.code.trim().length > 0 &&
    form.name.trim().length >= 3 &&
    form.description.trim().length >= 3 &&
    Number.isInteger(criteriaValueNumber) &&
    criteriaValueNumber >= 1

  const handleSave = () => {
    save({
      editingId: editing?.id ?? null,
      form: {
        code: form.code,
        name: form.name,
        description: form.description,
        iconUrl: form.iconUrl || undefined,
        criteriaType: form.criteriaType,
        criteriaValue: criteriaValueNumber,
        isActive: form.isActive,
      },
    })
  }

  return (
    <div>
      <PageHeader
        title="Badges"
        subtitle="Achievement badges users can earn."
        primaryAction={<button className="btn-primary" onClick={openCreate}>New badge</button>}
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : badges.length === 0 ? (
        <EmptyState
          title="No badges yet"
          description="Create your first badge."
          action={<button className="btn-primary" onClick={openCreate}>New badge</button>}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Code</th>
                <th className="table-th">Name</th>
                <th className="table-th">Criteria</th>
                <th className="table-th">Active</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {badges.map((badge) => (
                <tr key={badge.id} className="table-tr">
                  <td className="table-td font-mono text-xs text-gray-900">{badge.code}</td>
                  <td className="table-td font-medium text-gray-900">{badge.name}</td>
                  <td className="table-td text-gray-500">
                    {CRITERIA_OPTIONS.find((o) => o.value === badge.criteriaType)?.label} ≥ {badge.criteriaValue}
                  </td>
                  <td className="table-td text-gray-500">{badge.isActive ? 'Yes' : 'No'}</td>
                  <td className="table-td text-right">
                    <div className="flex justify-end gap-2">
                      <button className="btn-ghost btn-sm" onClick={() => openEdit(badge)}>Edit</button>
                      <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(badge)}>Delete</button>
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
          title={editing ? 'Edit badge' : 'New badge'}
          footer={
            <>
              <button className="btn-secondary" onClick={closeEditor} disabled={saving}>Cancel</button>
              <button className="btn-primary" disabled={!canSave || saving} onClick={handleSave}>
                {saving && <Spinner size="sm" className="text-white" />}
                {editing ? 'Save changes' : 'Create badge'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Code"
              required
              placeholder="FIRST_REWARD"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              disabled={!!editing}
              hint={editing ? 'Code cannot be changed after creation.' : undefined}
            />
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Textarea
              label="Description"
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <Input
              label="Icon URL"
              value={form.iconUrl}
              onChange={(e) => setForm((f) => ({ ...f, iconUrl: e.target.value }))}
            />
            <Select
              label="Criteria type"
              options={CRITERIA_OPTIONS}
              value={form.criteriaType}
              onChange={(e) => setForm((f) => ({ ...f, criteriaType: e.target.value as BadgeCriteriaType }))}
            />
            <Input
              label="Criteria value"
              required
              type="number"
              min={1}
              value={form.criteriaValue}
              onChange={(e) => setForm((f) => ({ ...f, criteriaValue: e.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Active
            </label>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => remove(deleteTarget.id)}
          title="Delete badge"
          message={`Delete "${deleteTarget.name}"? Users who already earned it keep it.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleting}
        />
      )}
    </div>
  )
}
