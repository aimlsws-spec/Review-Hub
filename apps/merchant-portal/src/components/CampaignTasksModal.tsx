import { ConfirmDialog, EmptyState, ErrorState, Input, Modal, Select, Spinner, Textarea } from '@viralkar/shared-ui'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import type { CampaignTaskInput } from '@/api/merchant.api'
import {
  ENABLED_PROOF_TYPES,
  ENABLED_TASK_TYPES,
  SYSTEM_VERIFIED_TASK_TYPES,
  TASK_LINK_SITES,
  TASK_COMPLETION_LIMIT_LABELS,
  TASK_PROOF_LABELS,
  TASK_TYPE_LABELS,
  TASK_VERIFICATION_HINTS,
  TASK_VERIFICATION_LABELS,
  taskLinkError,
  verificationLabel,
} from '@/constants'
import { useCampaignTaskMutations, useCampaignTasksQuery } from '@/hooks/useCampaignTasks'
import type { Campaign, CampaignTask, TaskCompletionLimit, TaskProofType, TaskType, TaskVerificationType } from '@/types'

const toOptions = (labels: Partial<Record<string, string>>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label: label ?? value }))

/** The task types on offer, in the label list's order. An existing task of another kind keeps its own (see below). */
const taskTypeOptions = toOptions(TASK_TYPE_LABELS).filter((option) => ENABLED_TASK_TYPES.includes(option.value as TaskType))
const proofOptions = ENABLED_PROOF_TYPES.map((value) => ({ value, label: TASK_PROOF_LABELS[value] ?? value }))
const verificationOptions = toOptions(TASK_VERIFICATION_LABELS)
const limitOptions = toOptions(TASK_COMPLETION_LIMIT_LABELS)

/** Tasks can change only while the campaign itself can: a live campaign's rules must not shift under participants. */
const EDITABLE_STATUSES = ['DRAFT', 'CHANGES_REQUESTED']

const DEFAULT_RADIUS_METERS = 200

interface TaskFormValues {
  title: string
  taskType: TaskType
  description: string
  instructions: string
  proofType: TaskProofType
  verificationType: TaskVerificationType
  completionLimit: TaskCompletionLimit
  required: boolean
  /** Where the participant goes to do the task: the Google review page, Instagram profile, post... */
  targetUrl: string
  qrCode: string
  latitude: string
  longitude: string
  radiusMeters: string
}

const emptyTask: TaskFormValues = {
  title: '',
  taskType: 'SCREENSHOT',
  description: '',
  instructions: '',
  proofType: 'SCREENSHOT',
  verificationType: 'MANUAL',
  completionLimit: 'ONCE',
  required: true,
  targetUrl: '',
  qrCode: '',
  latitude: '',
  longitude: '',
  radiusMeters: String(DEFAULT_RADIUS_METERS),
}

function toFormValues(task: CampaignTask): TaskFormValues {
  const config = task.configuration ?? {}
  const text = (value: unknown) => (value === undefined || value === null ? '' : String(value))
  return {
    title: task.title,
    taskType: task.taskType,
    description: task.description ?? '',
    instructions: task.instructions ?? '',
    // A proof no longer offered (a written answer) becomes a screenshot when the task is edited.
    proofType: task.proofType && ENABLED_PROOF_TYPES.includes(task.proofType) ? task.proofType : 'SCREENSHOT',
    // An older "AI pays automatically" task now works as "AI checks, then I confirm", so it is edited as that.
    verificationType: task.verificationType === 'AI' ? 'HYBRID' : task.verificationType in TASK_VERIFICATION_LABELS ? task.verificationType : 'MANUAL',
    completionLimit: task.completionLimit,
    required: task.required,
    targetUrl: text(config.targetUrl),
    qrCode: text(config.qrCode),
    latitude: text(config.latitude),
    longitude: text(config.longitude),
    radiusMeters: text(config.radiusMeters ?? DEFAULT_RADIUS_METERS),
  }
}

/**
 * What the API is sent. A QR or location task is checked by a rule (the code matches, the phone is close enough), so
 * it has no proof type or reviewer to choose, only the code or the place.
 */
export function toTaskInput(values: TaskFormValues, taskOrder?: number): CampaignTaskInput {
  const isSystem = SYSTEM_VERIFIED_TASK_TYPES.includes(values.taskType)
  const input: CampaignTaskInput = {
    title: values.title.trim(),
    taskType: values.taskType,
    description: values.description.trim(),
    instructions: values.instructions.trim(),
    verificationType: isSystem ? 'SYSTEM' : values.verificationType,
    completionLimit: values.completionLimit,
    required: values.required,
  }
  if (!isSystem) {
    input.proofType = values.proofType
    // Always sent, so clearing an optional link on an edit removes it rather than keeping the old one.
    const targetUrl = values.targetUrl.trim()
    input.configuration = targetUrl ? { targetUrl } : {}
  }
  if (values.taskType === 'QR_SCAN') input.configuration = { qrCode: values.qrCode.trim() }
  if (values.taskType === 'LOCATION_CHECKIN') {
    input.configuration = {
      latitude: Number(values.latitude),
      longitude: Number(values.longitude),
      radiusMeters: Number(values.radiusMeters) || DEFAULT_RADIUS_METERS,
    }
  }
  if (taskOrder !== undefined) input.taskOrder = taskOrder
  return input
}

/** The campaign's tasks: what a participant does to earn the reward. Add, edit and remove them while it is a draft. */
export function CampaignTasksModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const editable = EDITABLE_STATUSES.includes(campaign.status)
  /** null: the list. 'new': adding one. A task: editing it. */
  const [editing, setEditing] = useState<CampaignTask | 'new' | null>(null)
  const [removeTarget, setRemoveTarget] = useState<CampaignTask | null>(null)

  const { data, isLoading, isError, refetch } = useCampaignTasksQuery(campaign.id)
  const tasks = data?.data.data.tasks ?? []

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<TaskFormValues>({ defaultValues: emptyTask })
  const [taskType, verificationType] = watch(['taskType', 'verificationType'])
  const isSystem = SYSTEM_VERIFIED_TASK_TYPES.includes(taskType)
  const linkSite = TASK_LINK_SITES[taskType]

  const { saveMutation, deleteMutation } = useCampaignTaskMutations(campaign.id, { onSaveSuccess: () => setEditing(null) })

  const startAdd = () => {
    reset(emptyTask)
    setEditing('new')
  }
  const startEdit = (task: CampaignTask) => {
    reset(toFormValues(task))
    setEditing(task)
  }

  const save = handleSubmit((values) => {
    if (editing === 'new') {
      const nextOrder = tasks.reduce((max, task) => Math.max(max, task.taskOrder + 1), 0)
      saveMutation.mutate({ input: toTaskInput(values, nextOrder) })
    } else if (editing) {
      // The type can not change after creation (the backend checks a task's settings against its type), so it is not sent.
      const changes: Partial<CampaignTaskInput> = toTaskInput(values)
      delete changes.taskType
      saveMutation.mutate({ taskId: editing.id, input: changes as CampaignTaskInput })
    }
  })

  const inForm = editing !== null

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={inForm ? (editing === 'new' ? 'Add a task' : 'Edit task') : `Tasks · ${campaign.title}`}
        size="xl"
        footer={
          inForm ? (
            <>
              <button className="btn-secondary" onClick={() => setEditing(null)} disabled={saveMutation.isPending}>
                Back
              </button>
              <button className="btn-primary" onClick={save} disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Spinner size="sm" className="text-white" />}
                {editing === 'new' ? 'Add task' : 'Save task'}
              </button>
            </>
          ) : (
            <button className="btn-secondary" onClick={onClose}>Close</button>
          )
        }
      >
        {inForm ? (
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <Input
              label="Task title"
              required
              placeholder="e.g. Share a photo of your order"
              error={errors.title?.message}
              {...register('title', {
                required: 'Title is required',
                validate: (value) => value.trim().length >= 3 || 'At least 3 characters',
              })}
            />
            <Select
              label="What the participant does"
              required
              options={
                // A task made before its kind was switched off still shows what it is; its type can not change anyway.
                editing !== 'new' && editing && !ENABLED_TASK_TYPES.includes(editing.taskType)
                  ? [...taskTypeOptions, { value: editing.taskType, label: TASK_TYPE_LABELS[editing.taskType] ?? editing.taskType }]
                  : taskTypeOptions
              }
              disabled={editing !== 'new'}
              {...register('taskType')}
            />
            {!isSystem && (
              <Input
                label={linkSite ? `Link to ${linkSite.site}` : 'Link (optional)'}
                required={!!linkSite}
                type="url"
                inputMode="url"
                placeholder={linkSite?.placeholder ?? 'https://'}
                hint={
                  linkSite
                    ? `${linkSite.hint} Participants open it from the app to do the task.`
                    : 'A page participants may need, such as your menu or website. Shown as a button in the app.'
                }
                error={errors.targetUrl?.message}
                {...register('targetUrl', { validate: (value) => isSystem || (taskLinkError(taskType, value) ?? true) })}
              />
            )}
            <Input label="Short description" placeholder="One line shown on the task" {...register('description')} />
            <Textarea
              label="Instructions"
              rows={3}
              hint="Step by step, so anyone can do it without asking"
              {...register('instructions')}
            />

            {taskType === 'QR_SCAN' && (
              <Input
                label="QR code value"
                required
                hint="The text inside the QR code you display in store. Participants never see it; their scan must match it."
                error={errors.qrCode?.message}
                {...register('qrCode', { validate: (value) => taskType !== 'QR_SCAN' || !!value.trim() || 'Enter the QR code value' })}
              />
            )}

            {taskType === 'LOCATION_CHECKIN' && (
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Latitude"
                  required
                  type="number"
                  step="any"
                  placeholder="23.0225"
                  error={errors.latitude?.message}
                  {...register('latitude', {
                    validate: (value) =>
                      taskType !== 'LOCATION_CHECKIN' || (value !== '' && Math.abs(Number(value)) <= 90) || 'Between -90 and 90',
                  })}
                />
                <Input
                  label="Longitude"
                  required
                  type="number"
                  step="any"
                  placeholder="72.5714"
                  error={errors.longitude?.message}
                  {...register('longitude', {
                    validate: (value) =>
                      taskType !== 'LOCATION_CHECKIN' || (value !== '' && Math.abs(Number(value)) <= 180) || 'Between -180 and 180',
                  })}
                />
                <Input
                  label="Radius (metres)"
                  type="number"
                  min={1}
                  error={errors.radiusMeters?.message}
                  {...register('radiusMeters', {
                    validate: (value) => taskType !== 'LOCATION_CHECKIN' || value === '' || Number(value) > 0 || 'Must be more than 0',
                  })}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {!isSystem && <Select label="Proof to upload" options={proofOptions} {...register('proofType')} />}
              {!isSystem && <Select label="Who checks it" options={verificationOptions} {...register('verificationType')} />}
              <Select label="How often" options={limitOptions} {...register('completionLimit')} />
            </div>
            {!isSystem && TASK_VERIFICATION_HINTS[verificationType] && (
              <p className="text-sm text-gray-500">
                {TASK_VERIFICATION_HINTS[verificationType]}
              </p>
            )}
            {!isSystem && (
              <p className="text-xs text-gray-400">
                How often: how many times one person can complete this task and be paid. Use once per person for reviews,
                follows and shares.
              </p>
            )}
            {isSystem && (
              <p className="text-sm text-gray-500">
                {taskType === 'QR_SCAN'
                  ? 'The scanned code must match the value above. A match then waits for you to approve and pay it.'
                  : 'The participant’s phone must be within the radius of this point. A check-in in range then waits for you to approve and pay it.'}
              </p>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary-600" {...register('required')} />
              Required to earn the reward
            </label>
          </form>
        ) : isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : isError ? (
          <ErrorState message="Could not load the tasks." onRetry={() => refetch()} />
        ) : (
          <div className="space-y-4">
            {!editable && (
              <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Tasks can only be changed while the campaign is a draft or has changes requested.
              </p>
            )}
            {tasks.length === 0 ? (
              <EmptyState
                title="No tasks yet"
                description="Add at least one task: it is what participants do to earn the reward. A campaign can not be submitted without one."
              />
            ) : (
              <ol className="divide-y divide-gray-200 rounded-lg border border-gray-200">
                {tasks.map((task, index) => (
                  <li key={task.id} className="flex items-start justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">
                        {index + 1}. {task.title}
                        {!task.required && <span className="ml-2 text-xs font-normal text-gray-400">optional</span>}
                      </p>
                      <p className="text-xs text-gray-500">
                        {[
                          TASK_TYPE_LABELS[task.taskType] ?? task.taskType,
                          task.proofType ? TASK_PROOF_LABELS[task.proofType] : undefined,
                          verificationLabel(task.verificationType) ?? (task.verificationType === 'SYSTEM' ? 'Code or place checked, then I confirm' : undefined),
                          TASK_COMPLETION_LIMIT_LABELS[task.completionLimit],
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {typeof task.configuration?.targetUrl === 'string' ? (
                        <a
                          href={task.configuration.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block truncate text-sm text-primary-600 hover:underline"
                        >
                          {task.configuration.targetUrl}
                        </a>
                      ) : (
                        TASK_LINK_SITES[task.taskType] && (
                          <p className="mt-1 text-sm text-amber-700">
                            No link to {TASK_LINK_SITES[task.taskType]?.site} yet: add one before submitting.
                          </p>
                        )
                      )}
                      {task.instructions && <p className="mt-1 line-clamp-2 text-sm text-gray-600">{task.instructions}</p>}
                    </div>
                    {editable && (
                      <div className="flex shrink-0 gap-1.5">
                        <button className="btn-ghost btn-sm" onClick={() => startEdit(task)}>Edit</button>
                        <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => setRemoveTarget(task)}>
                          Remove
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {editable && (
              <button className="btn-primary" onClick={startAdd}>
                Add task
              </button>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && deleteMutation.mutate(removeTarget.id, { onSuccess: () => setRemoveTarget(null) })}
        title="Remove task"
        message={`Remove "${removeTarget?.title}" from this campaign?`}
        confirmLabel="Remove"
        loading={deleteMutation.isPending}
      />
    </>
  )
}
