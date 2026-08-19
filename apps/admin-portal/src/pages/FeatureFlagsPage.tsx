import { useState } from 'react'
import {
  PageHeader,
  EmptyState,
  ErrorState,
  CardSkeleton,
  Modal,
  Input,
  Textarea,
  Spinner,
} from '@reviewhub/shared-ui'
import {
  useCreateFeatureFlagMutation,
  useFeatureFlagsQuery,
  useToggleFeatureFlagMutation,
  useUpdateFeatureFlagRolloutMutation,
} from '@/hooks/useFeatureFlags'

export default function FeatureFlagsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ key: '', description: '', rolloutPercentage: 0 })

  const { data, isLoading, isError, refetch } = useFeatureFlagsQuery()

  const flags = data?.data.data ?? []

  const { mutate: toggle } = useToggleFeatureFlagMutation()

  const { mutate: updateRollout } = useUpdateFeatureFlagRolloutMutation()

  const { mutate: create, isPending: creating } = useCreateFeatureFlagMutation(() => {
    setCreateOpen(false)
    setCreateForm({ key: '', description: '', rolloutPercentage: 0 })
  })

  return (
    <div>
      <PageHeader
        title="Feature Flags"
        subtitle="Roll out features gradually without a deploy."
        primaryAction={<button className="btn-primary" onClick={() => setCreateOpen(true)}>New flag</button>}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : flags.length === 0 ? (
        <EmptyState title="No feature flags yet" description="Create your first feature flag." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {flags.map((flag) => (
            <div key={flag.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-gray-900">{flag.key}</p>
                  {flag.description && <p className="mt-1 text-sm text-gray-500">{flag.description}</p>}
                </div>
                <button
                  role="switch"
                  aria-checked={flag.enabled}
                  onClick={() => toggle(flag)}
                  className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${flag.enabled ? 'bg-primary-600' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${flag.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Rollout</span>
                  <span>{flag.rolloutPercentage}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={flag.rolloutPercentage}
                  onChange={(e) => updateRollout({ key: flag.key, rolloutPercentage: Number(e.target.value) })}
                  className="mt-1 w-full accent-primary-600"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {createOpen && (
        <Modal
          open
          onClose={() => setCreateOpen(false)}
          title="New feature flag"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</button>
              <button className="btn-primary" disabled={!createForm.key || creating} onClick={() => create(createForm)}>
                {creating && <Spinner size="sm" className="text-white" />}
                Create
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <Input label="Key" required placeholder="ai_verification" value={createForm.key} onChange={(e) => setCreateForm((f) => ({ ...f, key: e.target.value }))} />
            <Textarea label="Description" rows={2} value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
        </Modal>
      )}
    </div>
  )
}
