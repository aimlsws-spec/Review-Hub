import {
  PageHeader,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Pagination,
  ConfirmDialog,
  Modal,
  Input,
  Spinner,
} from '@reviewhub/shared-ui'
import { useState } from 'react'

import { ITEMS_PER_PAGE } from '@/constants'
import {
  useDailyRewardPrizesQuery,
  useDeleteDailyRewardPrizeMutation,
  useSaveDailyRewardPrizeMutation,
} from '@/hooks/useDailyRewardPrizes'
import type { DailyRewardPrize } from '@/types'
import { formatCurrency } from '@/utils'

interface PrizeFormState {
  label: string
  amount: string
  weight: string
  isActive: boolean
}

const EMPTY_FORM: PrizeFormState = { label: '', amount: '', weight: '', isActive: true }

export default function DailyRewardPrizesPage() {
  const [page, setPage] = useState(1)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<DailyRewardPrize | null>(null)
  const [form, setForm] = useState<PrizeFormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<DailyRewardPrize | null>(null)

  const { data, isLoading, isError, refetch } = useDailyRewardPrizesQuery({ page, limit: ITEMS_PER_PAGE })

  const prizes = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))
  const totalWeight = prizes.filter((p) => p.isActive).reduce((sum, p) => sum + p.weight, 0)

  const { mutate: save, isPending: saving } = useSaveDailyRewardPrizeMutation(() => closeEditor())

  const { mutate: remove, isPending: deleting } = useDeleteDailyRewardPrizeMutation(() => setDeleteTarget(null))

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setEditorOpen(true)
  }

  const openEdit = (prize: DailyRewardPrize) => {
    setEditing(prize)
    setForm({ label: prize.label, amount: String(prize.amount), weight: String(prize.weight), isActive: prize.isActive })
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditing(null)
  }

  const amountNumber = Number(form.amount)
  const weightNumber = Number(form.weight)
  const canSave = form.label.trim().length >= 2 && amountNumber >= 0 && Number.isInteger(weightNumber) && weightNumber >= 1

  const handleSave = () => {
    save({
      editingId: editing?.id ?? null,
      form: { label: form.label, amount: amountNumber, weight: weightNumber, isActive: form.isActive },
    })
  }

  return (
    <div>
      <PageHeader
        title="Daily Reward Prizes"
        subtitle={`Prizes in the daily spin's weighted draw.${totalWeight > 0 ? ` Total active weight: ${totalWeight}.` : ''}`}
        primaryAction={<button className="btn-primary" onClick={openCreate}>New prize</button>}
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : prizes.length === 0 ? (
        <EmptyState
          title="No prizes yet"
          description="Create the first daily reward prize."
          action={<button className="btn-primary" onClick={openCreate}>New prize</button>}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Label</th>
                <th className="table-th">Amount</th>
                <th className="table-th">Weight</th>
                <th className="table-th">Active</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {prizes.map((prize) => (
                <tr key={prize.id} className="table-tr">
                  <td className="table-td font-medium text-gray-900">{prize.label}</td>
                  <td className="table-td text-gray-500">{formatCurrency(prize.amount)}</td>
                  <td className="table-td text-gray-500">{prize.weight}</td>
                  <td className="table-td text-gray-500">{prize.isActive ? 'Yes' : 'No'}</td>
                  <td className="table-td text-right">
                    <div className="flex justify-end gap-2">
                      <button className="btn-ghost btn-sm" onClick={() => openEdit(prize)}>Edit</button>
                      <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(prize)}>Delete</button>
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
          title={editing ? 'Edit prize' : 'New prize'}
          footer={
            <>
              <button className="btn-secondary" onClick={closeEditor} disabled={saving}>Cancel</button>
              <button className="btn-primary" disabled={!canSave || saving} onClick={handleSave}>
                {saving && <Spinner size="sm" className="text-white" />}
                {editing ? 'Save changes' : 'Create prize'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Label"
              required
              placeholder="₹10 Bonus"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
            <Input
              label="Amount"
              required
              type="number"
              min={0}
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <Input
              label="Weight"
              required
              type="number"
              min={1}
              hint="Relative odds in the weighted-random draw."
              value={form.weight}
              onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
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
          title="Delete prize"
          message={`Delete "${deleteTarget.label}"? It will no longer appear in the daily spin.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleting}
        />
      )}
    </div>
  )
}
