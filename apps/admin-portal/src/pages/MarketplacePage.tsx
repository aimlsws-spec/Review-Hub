import {
  PageHeader,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Pagination,
  ConfirmDialog,
  Modal,
  Input,
  Textarea,
  Spinner,
  cn,
} from '@reviewhub/shared-ui'
import { useState } from 'react'

import { ITEMS_PER_PAGE } from '@/constants'
import {
  useDeleteMarketplaceItemMutation,
  useMarketplaceItemsQuery,
  useRedemptionsQuery,
  useSaveMarketplaceItemMutation,
} from '@/hooks/useMarketplace'
import type { MarketplaceItem } from '@/types'
import { formatCurrency, formatDate } from '@/utils'

interface ItemFormState {
  title: string
  description: string
  thumbnailUrl: string
  category: string
  costAmount: string
  stock: string
  sortOrder: string
  isActive: boolean
}

const EMPTY_FORM: ItemFormState = {
  title: '',
  description: '',
  thumbnailUrl: '',
  category: '',
  costAmount: '',
  stock: '',
  sortOrder: '0',
  isActive: true,
}

function CatalogueTab() {
  const [page, setPage] = useState(1)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<MarketplaceItem | null>(null)
  const [form, setForm] = useState<ItemFormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<MarketplaceItem | null>(null)

  const { data, isLoading, isError, refetch } = useMarketplaceItemsQuery({ page, limit: ITEMS_PER_PAGE })

  const items = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const { mutate: save, isPending: saving } = useSaveMarketplaceItemMutation(() => closeEditor())
  const { mutate: remove, isPending: deleting } = useDeleteMarketplaceItemMutation(() => setDeleteTarget(null))

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setEditorOpen(true)
  }

  const openEdit = (item: MarketplaceItem) => {
    setEditing(item)
    setForm({
      title: item.title,
      description: item.description,
      thumbnailUrl: item.thumbnailUrl ?? '',
      category: item.category ?? '',
      costAmount: String(item.costAmount),
      stock: item.stock === null ? '' : String(item.stock),
      sortOrder: String(item.sortOrder),
      isActive: item.isActive,
    })
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditing(null)
  }

  const costAmountNumber = Number(form.costAmount)
  const canSave = form.title.trim().length >= 3 && form.description.trim().length >= 3 && costAmountNumber >= 0

  const handleSave = () => {
    save({
      editingId: editing?.id ?? null,
      form: {
        title: form.title,
        description: form.description,
        thumbnailUrl: form.thumbnailUrl,
        category: form.category,
        costAmount: costAmountNumber,
        stock: form.stock.trim() === '' ? null : Number(form.stock),
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      },
    })
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={openCreate}>New item</button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No catalogue items yet"
          description="Create the first redeemable item."
          action={<button className="btn-primary" onClick={openCreate}>New item</button>}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Title</th>
                <th className="table-th">Category</th>
                <th className="table-th">Cost</th>
                <th className="table-th">Stock</th>
                <th className="table-th">Active</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id} className="table-tr">
                  <td className="table-td font-medium text-gray-900">{item.title}</td>
                  <td className="table-td text-gray-500">{item.category ?? '—'}</td>
                  <td className="table-td text-gray-500">{formatCurrency(item.costAmount)}</td>
                  <td className="table-td text-gray-500">{item.stock === null ? 'Unlimited' : item.stock}</td>
                  <td className="table-td text-gray-500">{item.isActive ? 'Yes' : 'No'}</td>
                  <td className="table-td text-right">
                    <div className="flex justify-end gap-2">
                      <button className="btn-ghost btn-sm" onClick={() => openEdit(item)}>Edit</button>
                      <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(item)}>Delete</button>
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
          title={editing ? 'Edit catalogue item' : 'New catalogue item'}
          size="lg"
          footer={
            <>
              <button className="btn-secondary" onClick={closeEditor} disabled={saving}>Cancel</button>
              <button className="btn-primary" disabled={!canSave || saving} onClick={handleSave}>
                {saving && <Spinner size="sm" className="text-white" />}
                {editing ? 'Save changes' : 'Create item'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <Input label="Title" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Textarea label="Description" required rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <Input label="Thumbnail URL" value={form.thumbnailUrl} onChange={(e) => setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))} />
            <Input label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            <Input label="Cost (points)" required type="number" min={0} value={form.costAmount} onChange={(e) => setForm((f) => ({ ...f, costAmount: e.target.value }))} />
            <Input label="Stock" type="number" min={0} hint="Leave blank for unlimited stock." value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
            <Input label="Sort order" type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
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
          title="Delete catalogue item"
          message={`Delete "${deleteTarget.title}"? Past redemptions are kept for history.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleting}
        />
      )}
    </div>
  )
}

function RedemptionsTab() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useRedemptionsQuery({ page, limit: ITEMS_PER_PAGE })

  const redemptions = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  if (isLoading) return <TableSkeleton rows={6} cols={4} />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (redemptions.length === 0) return <EmptyState title="No redemptions yet" description="Redemption history will appear here." />

  return (
    <div className="table-container">
      <table className="table">
        <thead className="bg-gray-50">
          <tr>
            <th className="table-th">Item</th>
            <th className="table-th">Redemption code</th>
            <th className="table-th">Cost</th>
            <th className="table-th">Redeemed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {redemptions.map((redemption) => (
            <tr key={redemption.id} className="table-tr">
              <td className="table-td font-medium text-gray-900">{redemption.item?.title ?? redemption.itemId}</td>
              <td className="table-td font-mono text-xs text-gray-500">{redemption.redemptionCode}</td>
              <td className="table-td text-gray-500">{formatCurrency(redemption.costAmount)}</td>
              <td className="table-td text-gray-500">{formatDate(redemption.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}

export default function MarketplacePage() {
  const [tab, setTab] = useState<'catalogue' | 'redemptions'>('catalogue')

  return (
    <div>
      <PageHeader title="Marketplace" subtitle="Redeemable catalogue and redemption history." />

      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {(['catalogue', 'redemptions'] as const).map((t) => (
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

      {tab === 'catalogue' ? <CatalogueTab /> : <RedemptionsTab />}
    </div>
  )
}
