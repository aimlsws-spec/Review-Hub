import {
  PageHeader,
  EmptyState,
  ErrorState,
  CardSkeleton,
  Modal,
  Input,
  Select,
  Textarea,
  Spinner,
} from '@reviewhub/shared-ui'
import { useState } from 'react'

import { useCreateSettingMutation, useSettingsQuery, useUpdateSettingMutation } from '@/hooks/useSettings'
import type { SettingDataType, SystemSetting } from '@/types'

function parseValue(raw: string, dataType: SettingDataType): unknown {
  if (dataType === 'NUMBER') return Number(raw)
  if (dataType === 'BOOLEAN') return raw === 'true'
  if (dataType === 'JSON' || dataType === 'ARRAY') return JSON.parse(raw)
  return raw
}

function displayValue(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

const DATA_TYPE_OPTIONS: { value: SettingDataType; label: string }[] = [
  { value: 'STRING', label: 'String' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'BOOLEAN', label: 'Boolean' },
  { value: 'JSON', label: 'JSON' },
  { value: 'ARRAY', label: 'Array' },
]

export default function SettingsPage() {
  const [editTarget, setEditTarget] = useState<SystemSetting | null>(null)
  const [editValue, setEditValue] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ key: '', value: '', dataType: 'STRING' as SettingDataType, category: '', description: '' })

  const { data, isLoading, isError, refetch } = useSettingsQuery()

  const settings = data?.data.data ?? []

  const { mutate: update, isPending: updating } = useUpdateSettingMutation(() => setEditTarget(null))

  const { mutate: create, isPending: creating } = useCreateSettingMutation(() => {
    setCreateOpen(false)
    setCreateForm({ key: '', value: '', dataType: 'STRING', category: '', description: '' })
  })

  return (
    <div>
      <PageHeader
        title="System Settings"
        subtitle="Platform-wide configuration values."
        primaryAction={<button className="btn-primary" onClick={() => setCreateOpen(true)}>New setting</button>}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : settings.length === 0 ? (
        <EmptyState title="No settings yet" description="Create your first system setting." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {settings.map((setting) => (
            <div key={setting.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-gray-400">{setting.key}</p>
                  {setting.description && <p className="mt-1 text-sm text-gray-500">{setting.description}</p>}
                </div>
                {setting.editable && (
                  <button
                    className="btn-ghost btn-sm flex-shrink-0"
                    onClick={() => {
                      setEditValue(displayValue(setting.value))
                      setEditTarget(setting)
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>
              <p className="mt-3 truncate font-mono text-sm font-semibold text-gray-900">{displayValue(setting.value)}</p>
              {!setting.editable && <p className="mt-1 text-xs text-gray-400">Not editable</p>}
            </div>
          ))}
        </div>
      )}

      {editTarget && (
        <Modal
          open
          onClose={() => setEditTarget(null)}
          title={`Edit ${editTarget.key}`}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setEditTarget(null)} disabled={updating}>Cancel</button>
              <button
                className="btn-primary"
                disabled={updating}
                onClick={() => update({ key: editTarget.key, value: parseValue(editValue, editTarget.dataType) })}
              >
                {updating && <Spinner size="sm" className="text-white" />}
                Save
              </button>
            </>
          }
        >
          <Input label={`Value (${editTarget.dataType.toLowerCase()})`} value={editValue} onChange={(e) => setEditValue(e.target.value)} />
        </Modal>
      )}

      {createOpen && (
        <Modal
          open
          onClose={() => setCreateOpen(false)}
          title="New setting"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</button>
              <button
                className="btn-primary"
                disabled={!createForm.key || !createForm.value || creating}
                onClick={() =>
                  create({
                    key: createForm.key,
                    value: parseValue(createForm.value, createForm.dataType),
                    dataType: createForm.dataType,
                    category: createForm.category || undefined,
                    description: createForm.description || undefined,
                  })
                }
              >
                {creating && <Spinner size="sm" className="text-white" />}
                Create
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <Input label="Key" required placeholder="withdrawal.min_amount" value={createForm.key} onChange={(e) => setCreateForm((f) => ({ ...f, key: e.target.value }))} />
            <Select label="Data type" options={DATA_TYPE_OPTIONS} value={createForm.dataType} onChange={(e) => setCreateForm((f) => ({ ...f, dataType: e.target.value as SettingDataType }))} />
            <Input label="Value" required value={createForm.value} onChange={(e) => setCreateForm((f) => ({ ...f, value: e.target.value }))} />
            <Input label="Category" value={createForm.category} onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))} />
            <Textarea label="Description" rows={2} value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
        </Modal>
      )}
    </div>
  )
}
