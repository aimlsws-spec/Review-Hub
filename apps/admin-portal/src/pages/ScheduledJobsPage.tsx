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
  Spinner,
} from '@reviewhub/shared-ui'
import { useState } from 'react'

import { ITEMS_PER_PAGE } from '@/constants'
import {
  useCreateScheduledJobMutation,
  useDeleteScheduledJobMutation,
  useJobExecutionLogsQuery,
  useScheduledJobsQuery,
  useUpdateScheduledJobMutation,
} from '@/hooks/useScheduledJobs'
import type { JobType, ScheduledJob } from '@/types'
import { formatDateTime } from '@/utils'

interface JobFormState {
  jobName: string
  jobType: JobType
  cronExpression: string
  enabled: boolean
}

const EMPTY_FORM: JobFormState = { jobName: '', jobType: 'CAMPAIGN_EXPIRY', cronExpression: '', enabled: true }

const JOB_TYPE_OPTIONS: { value: JobType; label: string }[] = [
  { value: 'CAMPAIGN_EXPIRY', label: 'Campaign expiry' },
  { value: 'REWARD_PROCESSING', label: 'Reward processing' },
  { value: 'ANALYTICS_AGGREGATION', label: 'Analytics aggregation' },
  { value: 'REPORT_GENERATION', label: 'Report generation' },
  { value: 'NOTIFICATION_DISPATCH', label: 'Notification dispatch' },
  { value: 'FRAUD_SCAN', label: 'Fraud scan' },
]

function LogsModal({ job, onClose }: { job: ScheduledJob; onClose: () => void }) {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useJobExecutionLogsQuery(job.id, { page, limit: ITEMS_PER_PAGE })

  const logs = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  return (
    <Modal open onClose={onClose} title={`Execution logs — ${job.jobName}`} size="lg">
      {isLoading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : logs.length === 0 ? (
        <EmptyState title="No executions yet" description="This job hasn't run yet." />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Started</th>
                <th className="table-th">Duration</th>
                <th className="table-th">Result</th>
                <th className="table-th">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="table-tr">
                  <td className="table-td text-gray-500">{formatDateTime(log.startedAt)}</td>
                  <td className="table-td text-gray-500">{log.duration !== null ? `${log.duration}ms` : '—'}</td>
                  <td className="table-td">{log.success ? 'Success' : 'Failed'}</td>
                  <td className="table-td text-gray-500">{log.errorMessage ?? '—'}</td>
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

export default function ScheduledJobsPage() {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<ScheduledJob | null>(null)
  const [form, setForm] = useState<JobFormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<ScheduledJob | null>(null)
  const [logsTarget, setLogsTarget] = useState<ScheduledJob | null>(null)

  const { data, isLoading, isError, refetch } = useScheduledJobsQuery()
  const jobs = data?.data.data ?? []

  const { mutate: create, isPending: creating } = useCreateScheduledJobMutation(() => closeEditor())
  const { mutate: update, isPending: updating } = useUpdateScheduledJobMutation(() => closeEditor())
  const { mutate: remove, isPending: deleting } = useDeleteScheduledJobMutation(() => setDeleteTarget(null))

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setEditorOpen(true)
  }

  const openEdit = (job: ScheduledJob) => {
    setEditing(job)
    setForm({ jobName: job.jobName, jobType: job.jobType, cronExpression: job.cronExpression, enabled: job.enabled })
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditing(null)
  }

  const canSave = form.jobName.trim().length > 0 && form.cronExpression.trim().length > 0

  const handleSave = () => {
    if (editing) {
      update({ jobId: editing.id, data: { cronExpression: form.cronExpression, enabled: form.enabled } })
    } else {
      create(form)
    }
  }

  const saving = creating || updating

  return (
    <div>
      <PageHeader
        title="Scheduled Jobs"
        subtitle="Cron-driven background job definitions."
        primaryAction={<button className="btn-primary" onClick={openCreate}>New job</button>}
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No scheduled jobs yet"
          description="Register the first job definition."
          action={<button className="btn-primary" onClick={openCreate}>New job</button>}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Type</th>
                <th className="table-th">Cron</th>
                <th className="table-th">Enabled</th>
                <th className="table-th">Last run</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {jobs.map((job) => (
                <tr key={job.id} className="table-tr">
                  <td className="table-td font-medium text-gray-900">{job.jobName}</td>
                  <td className="table-td text-gray-500">{JOB_TYPE_OPTIONS.find((o) => o.value === job.jobType)?.label}</td>
                  <td className="table-td font-mono text-xs text-gray-500">{job.cronExpression}</td>
                  <td className="table-td text-gray-500">{job.enabled ? 'Yes' : 'No'}</td>
                  <td className="table-td text-gray-500">{job.lastRun ? formatDateTime(job.lastRun) : 'Never'}</td>
                  <td className="table-td text-right">
                    <div className="flex justify-end gap-2">
                      <button className="btn-ghost btn-sm" onClick={() => setLogsTarget(job)}>Logs</button>
                      <button className="btn-ghost btn-sm" onClick={() => openEdit(job)}>Edit</button>
                      <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(job)}>Delete</button>
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
          title={editing ? 'Edit scheduled job' : 'New scheduled job'}
          footer={
            <>
              <button className="btn-secondary" onClick={closeEditor} disabled={saving}>Cancel</button>
              <button className="btn-primary" disabled={!canSave || saving} onClick={handleSave}>
                {saving && <Spinner size="sm" className="text-white" />}
                {editing ? 'Save changes' : 'Create job'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Job name"
              required
              placeholder="nightly-settlement-generation"
              value={form.jobName}
              onChange={(e) => setForm((f) => ({ ...f, jobName: e.target.value }))}
              disabled={!!editing}
              hint={editing ? 'Job name cannot be changed after creation.' : undefined}
            />
            <Select
              label="Job type"
              options={JOB_TYPE_OPTIONS}
              value={form.jobType}
              onChange={(e) => setForm((f) => ({ ...f, jobType: e.target.value as JobType }))}
              disabled={!!editing}
            />
            <Input
              label="Cron expression"
              required
              placeholder="0 2 * * *"
              value={form.cronExpression}
              onChange={(e) => setForm((f) => ({ ...f, cronExpression: e.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              />
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
          title="Delete scheduled job"
          message={`Delete "${deleteTarget.jobName}"? Its execution history is kept.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleting}
        />
      )}

      {logsTarget && <LogsModal job={logsTarget} onClose={() => setLogsTarget(null)} />}
    </div>
  )
}
