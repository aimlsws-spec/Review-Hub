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
} from '@reviewhub/shared-ui'
import { useState } from 'react'

import { ITEMS_PER_PAGE } from '@/constants'
import {
  useAddAiModelMutation,
  useAddAiPromptTemplateMutation,
  useAiProvidersQuery,
  useAiUsageLogsQuery,
  useCreateAiProviderMutation,
  useDeleteAiProviderMutation,
  useRemoveAiModelMutation,
  useRemoveAiPromptTemplateMutation,
  useUpdateAiProviderMutation,
} from '@/hooks/useAiProviders'
import type { AiProvider } from '@/types'
import { formatDateTime } from '@/utils'

interface ProviderFormState {
  name: string
  provider: string
  apiEndpoint: string
  model: string
  priority: string
  timeout: string
  enabled: boolean
}

const EMPTY_FORM: ProviderFormState = { name: '', provider: '', apiEndpoint: '', model: '', priority: '0', timeout: '30000', enabled: true }

function UsageLogsModal({ provider, onClose }: { provider: AiProvider; onClose: () => void }) {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useAiUsageLogsQuery(provider.id, { page, limit: ITEMS_PER_PAGE })

  const logs = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  return (
    <Modal open onClose={onClose} title={`Usage logs — ${provider.name}`} size="lg">
      {isLoading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : logs.length === 0 ? (
        <EmptyState title="No usage yet" description="Calls to this provider will appear here." />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">When</th>
                <th className="table-th">Tokens</th>
                <th className="table-th">Latency</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="table-tr">
                  <td className="table-td text-gray-500">{formatDateTime(log.createdAt)}</td>
                  <td className="table-td text-gray-500">{log.tokens}</td>
                  <td className="table-td text-gray-500">{log.latency}ms</td>
                  <td className="table-td">{log.responseStatus}</td>
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

function ProviderDetailModal({ provider, onClose }: { provider: AiProvider; onClose: () => void }) {
  const [modelName, setModelName] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [templatePrompt, setTemplatePrompt] = useState('')

  const { mutate: addModel, isPending: addingModel } = useAddAiModelMutation(() => setModelName(''))
  const { mutate: removeModel } = useRemoveAiModelMutation()
  const { mutate: addTemplate, isPending: addingTemplate } = useAddAiPromptTemplateMutation(() => {
    setTemplateName('')
    setTemplatePrompt('')
  })
  const { mutate: removeTemplate } = useRemoveAiPromptTemplateMutation()

  return (
    <Modal open onClose={onClose} title={provider.name} size="lg">
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Models</h3>
          <ul className="mt-2 divide-y divide-gray-100">
            {(provider.models ?? []).map((model) => (
              <li key={model.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-700">{model.modelName}{model.version ? ` (v${model.version})` : ''}</span>
                <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => removeModel(model.id)}>Remove</button>
              </li>
            ))}
            {(provider.models ?? []).length === 0 && <li className="py-2 text-sm text-gray-400">No models added.</li>}
          </ul>
          <div className="mt-2 flex gap-2">
            <Input placeholder="gpt-4o-mini" value={modelName} onChange={(e) => setModelName(e.target.value)} className="flex-1" />
            <button
              className="btn-secondary"
              disabled={!modelName.trim() || addingModel}
              onClick={() => addModel({ providerId: provider.id, data: { modelName } })}
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900">Prompt templates</h3>
          <ul className="mt-2 divide-y divide-gray-100">
            {(provider.prompts ?? []).map((template) => (
              <li key={template.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-700">{template.name}</span>
                <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => removeTemplate(template.id)}>Remove</button>
              </li>
            ))}
            {(provider.prompts ?? []).length === 0 && <li className="py-2 text-sm text-gray-400">No prompt templates added.</li>}
          </ul>
          <div className="mt-2 space-y-2">
            <Input placeholder="submission-fraud-check" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
            <Textarea placeholder="Prompt text..." rows={3} value={templatePrompt} onChange={(e) => setTemplatePrompt(e.target.value)} />
            <button
              className="btn-secondary"
              disabled={!templateName.trim() || !templatePrompt.trim() || addingTemplate}
              onClick={() => addTemplate({ providerId: provider.id, data: { name: templateName, prompt: templatePrompt } })}
            >
              Add template
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function AiProvidersPage() {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<AiProvider | null>(null)
  const [form, setForm] = useState<ProviderFormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<AiProvider | null>(null)
  const [detailTarget, setDetailTarget] = useState<AiProvider | null>(null)
  const [usageTarget, setUsageTarget] = useState<AiProvider | null>(null)

  const { data, isLoading, isError, refetch } = useAiProvidersQuery()
  const providers = data?.data.data ?? []

  const { mutate: create, isPending: creating } = useCreateAiProviderMutation(() => closeEditor())
  const { mutate: update, isPending: updating } = useUpdateAiProviderMutation(() => closeEditor())
  const { mutate: remove, isPending: deleting } = useDeleteAiProviderMutation(() => setDeleteTarget(null))

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setEditorOpen(true)
  }

  const openEdit = (provider: AiProvider) => {
    setEditing(provider)
    setForm({
      name: provider.name,
      provider: provider.provider,
      apiEndpoint: provider.apiEndpoint ?? '',
      model: provider.model ?? '',
      priority: String(provider.priority),
      timeout: String(provider.timeout),
      enabled: provider.enabled,
    })
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditing(null)
  }

  const canSave = form.name.trim().length > 0 && form.provider.trim().length > 0

  const handleSave = () => {
    const shared = {
      apiEndpoint: form.apiEndpoint || undefined,
      model: form.model || undefined,
      priority: Number(form.priority) || 0,
      timeout: Number(form.timeout) || 30000,
      enabled: form.enabled,
    }
    if (editing) {
      update({ providerId: editing.id, data: shared })
    } else {
      create({ name: form.name, provider: form.provider, ...shared })
    }
  }

  const saving = creating || updating

  return (
    <div>
      <PageHeader
        title="AI Providers"
        subtitle="LLM providers, models, and prompt templates."
        primaryAction={<button className="btn-primary" onClick={openCreate}>New provider</button>}
      />

      {isLoading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : providers.length === 0 ? (
        <EmptyState
          title="No AI providers configured"
          description="Register the first provider."
          action={<button className="btn-primary" onClick={openCreate}>New provider</button>}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Provider</th>
                <th className="table-th">Priority</th>
                <th className="table-th">Enabled</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {providers.map((provider) => (
                <tr key={provider.id} className="table-tr">
                  <td className="table-td font-medium text-gray-900">{provider.name}</td>
                  <td className="table-td text-gray-500">{provider.provider}</td>
                  <td className="table-td text-gray-500">{provider.priority}</td>
                  <td className="table-td text-gray-500">{provider.enabled ? 'Yes' : 'No'}</td>
                  <td className="table-td text-right">
                    <div className="flex justify-end gap-2">
                      <button className="btn-ghost btn-sm" onClick={() => setDetailTarget(provider)}>Manage</button>
                      <button className="btn-ghost btn-sm" onClick={() => setUsageTarget(provider)}>Usage</button>
                      <button className="btn-ghost btn-sm" onClick={() => openEdit(provider)}>Edit</button>
                      <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(provider)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editorOpen && (
        <Modal
          open
          onClose={closeEditor}
          title={editing ? 'Edit AI provider' : 'New AI provider'}
          footer={
            <>
              <button className="btn-secondary" onClick={closeEditor} disabled={saving}>Cancel</button>
              <button className="btn-primary" disabled={!canSave || saving} onClick={handleSave}>
                {saving && <Spinner size="sm" className="text-white" />}
                {editing ? 'Save changes' : 'Create provider'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Name"
              required
              placeholder="openai-primary"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={!!editing}
              hint={editing ? 'Name cannot be changed after creation.' : undefined}
            />
            <Input
              label="Provider"
              required
              placeholder="openai"
              value={form.provider}
              onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
              disabled={!!editing}
            />
            <Input label="API endpoint" value={form.apiEndpoint} onChange={(e) => setForm((f) => ({ ...f, apiEndpoint: e.target.value }))} />
            <Input label="Default model" placeholder="gpt-4o-mini" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />
            <Input label="Priority" type="number" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} />
            <Input label="Timeout (ms)" type="number" min={1000} value={form.timeout} onChange={(e) => setForm((f) => ({ ...f, timeout: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} />
              Enabled
            </label>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => remove(deleteTarget.id)}
          title="Delete AI provider"
          message={`Delete "${deleteTarget.name}"? Its models and prompt templates are removed with it.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleting}
        />
      )}

      {detailTarget && <ProviderDetailModal provider={detailTarget} onClose={() => setDetailTarget(null)} />}
      {usageTarget && <UsageLogsModal provider={usageTarget} onClose={() => setUsageTarget(null)} />}
    </div>
  )
}
