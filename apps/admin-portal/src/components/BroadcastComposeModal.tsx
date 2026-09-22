import { Modal, Input, Select, Spinner, Textarea } from '@reviewhub/shared-ui'
import { useMemo, useState } from 'react'

import { BROADCAST_CHANNEL_LABELS, BROADCAST_TYPE_LABELS } from '@/constants'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  useAudienceLocationsQuery,
  useAudiencePreviewQuery,
  useCreateBroadcastMutation,
  useNotificationTemplatesQuery,
} from '@/hooks/useNotificationCenter'
import type { BroadcastChannel, BroadcastType, NotificationTemplate } from '@/types'
import { formatDateTime } from '@/utils'
import {
  audienceFormError,
  buildAudienceFilter,
  describeAudience,
  EMPTY_AUDIENCE_FORM,
  findUnsupportedPlaceholders,
  renderPreview,
  toLocalInputValue,
  type AudienceForm,
} from '@/utils/notifications'

import { AudienceFilterForm } from './AudienceFilterForm'

const TITLE_MAX = 100
const MESSAGE_MAX = 500
const MIN_SCHEDULE_LEAD_MS = 60_000
/** How long to wait after the last keystroke before asking the server how many users the filters match. */
const PREVIEW_DELAY_MS = 400

const CHANNELS: BroadcastChannel[] = ['IN_APP', 'PUSH', 'EMAIL']
const TYPE_OPTIONS = Object.entries(BROADCAST_TYPE_LABELS).map(([value, label]) => ({ value, label }))

const asBroadcastChannel = (channel: string): BroadcastChannel[] =>
  (CHANNELS as string[]).includes(channel) ? [channel as BroadcastChannel] : ['IN_APP']

interface BroadcastComposeModalProps {
  onClose: () => void
  /** Pre-fills the message, e.g. when started from a template. */
  template?: NotificationTemplate | null
}

/**
 * Write a message, choose who gets it and how, see how many people it will really reach, then send it now
 * or schedule it. Sending needs an explicit confirmation step, because it cannot be recalled once it starts.
 */
export function BroadcastComposeModal({ onClose, template }: BroadcastComposeModalProps) {
  const [templateId, setTemplateId] = useState(template?.id ?? '')
  const [title, setTitle] = useState(template?.title ?? '')
  const [message, setMessage] = useState(template?.body ?? '')
  const [type, setType] = useState<BroadcastType>('PROMOTIONAL')
  const [channels, setChannels] = useState<BroadcastChannel[]>(template ? asBroadcastChannel(template.channel) : ['IN_APP', 'PUSH'])
  const [audienceForm, setAudienceForm] = useState<AudienceForm>(EMPTY_AUDIENCE_FORM)
  const [timing, setTiming] = useState<'now' | 'later'>('now')
  const [scheduledLocal, setScheduledLocal] = useState('')
  const [smartTiming, setSmartTiming] = useState(false)
  const [step, setStep] = useState<'edit' | 'confirm'>('edit')

  const templates = (useNotificationTemplatesQuery().data?.data.data ?? []).filter((t) => t.isActive)
  const locations = useAudienceLocationsQuery().data?.data.data ?? []

  const audience = useMemo(() => buildAudienceFilter(audienceForm), [audienceForm])
  const audienceProblem = audienceFormError(audience)
  const debouncedAudience = useDebouncedValue(audience, PREVIEW_DELAY_MS)
  const preview = useAudiencePreviewQuery(debouncedAudience, !audienceProblem)
  const reach = audienceProblem ? undefined : preview.data?.data.data
  // The number on screen is for the filters as they were a moment ago until the new answer arrives.
  const reachIsStale = debouncedAudience !== audience || preview.isFetching

  const { mutate: send, isPending: sending } = useCreateBroadcastMutation(onClose)

  const unsupported = findUnsupportedPlaceholders(`${title} ${message}`)
  // Important announcements are always sent straight away, so smart timing is off for them whatever was ticked.
  const smartTimingAllowed = type !== 'SYSTEM'
  const useSmartTiming = smartTiming && smartTimingAllowed
  const scheduledTime = timing === 'later' && scheduledLocal ? new Date(scheduledLocal) : null
  const scheduleTooSoon = scheduledTime !== null && scheduledTime.getTime() < Date.now() + MIN_SCHEDULE_LEAD_MS

  const problems: string[] = []
  if (!title.trim()) problems.push('Add a title')
  if (!message.trim()) problems.push('Add a message')
  if (unsupported.length > 0) problems.push(`Remove ${unsupported.map((name) => `{{${name}}}`).join(', ')}: only {{firstName}} can be used`)
  if (channels.length === 0) problems.push('Choose at least one channel')
  if (audienceProblem) problems.push(audienceProblem)
  if (reach?.total === 0) problems.push('No users match these filters')
  else if (reach && channels.length > 0 && channels.every((c) => reach.byChannel[c] === 0)) {
    problems.push('None of the selected channels can reach anyone in this audience')
  }
  if (timing === 'later' && !scheduledLocal) problems.push('Pick a date and time to send')
  else if (scheduleTooSoon) problems.push('Schedule at least one minute ahead, or send it now')

  const canReview = problems.length === 0 && !!reach && !reachIsStale

  const applyTemplate = (id: string) => {
    setTemplateId(id)
    const chosen = templates.find((t) => t.id === id)
    if (!chosen) return
    setTitle(chosen.title)
    setMessage(chosen.body)
    setChannels(asBroadcastChannel(chosen.channel))
  }

  const toggleChannel = (channel: BroadcastChannel) =>
    setChannels((current) => (current.includes(channel) ? current.filter((c) => c !== channel) : [...current, channel]))

  const submit = () =>
    send({
      title: title.trim(),
      message: message.trim(),
      type,
      channels,
      audience,
      ...(scheduledTime ? { scheduledAt: scheduledTime.toISOString() } : {}),
      ...(useSmartTiming ? { smartTiming: true } : {}),
    })

  const channelList = CHANNELS.filter((c) => channels.includes(c)).map((c) => BROADCAST_CHANNEL_LABELS[c]).join(', ')

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={step === 'confirm' ? 'Confirm broadcast' : 'New broadcast'}
      footer={
        step === 'edit' ? (
          <>
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={() => setStep('confirm')} disabled={!canReview}>
              Review and send
            </button>
          </>
        ) : (
          <>
            <button className="btn-secondary" onClick={() => setStep('edit')} disabled={sending}>
              Back
            </button>
            <button className="btn-primary" onClick={submit} disabled={sending}>
              {sending && <Spinner size="sm" className="text-white" />}
              {scheduledTime ? 'Confirm and schedule' : 'Confirm and send now'}
            </button>
          </>
        )
      }
    >
      {step === 'confirm' && reach ? (
        <div className="space-y-4 text-sm text-gray-700">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="font-semibold text-gray-900">{renderPreview(title.trim())}</p>
            <p className="mt-1 whitespace-pre-wrap">{renderPreview(message.trim())}</p>
          </div>
          <dl className="grid grid-cols-[8rem_1fr] gap-y-2">
            <dt className="text-gray-500">Audience</dt>
            <dd>{describeAudience(audience, locations)}</dd>
            <dt className="text-gray-500">Will reach</dt>
            <dd>
              About <strong>{reach.total.toLocaleString('en-IN')}</strong> users
            </dd>
            <dt className="text-gray-500">Channels</dt>
            <dd>{channelList}</dd>
            <dt className="text-gray-500">When</dt>
            <dd>
              {scheduledTime ? formatDateTime(scheduledTime) : 'Immediately'}
              {useSmartTiming && ', each person at the hour they are usually active (within 24 hours)'}
            </dd>
          </dl>
          <p className="rounded-lg bg-amber-50 p-3 text-amber-800">
            Once sending starts it cannot be recalled.
            {scheduledTime && ' A scheduled broadcast can be cancelled until it starts.'} Users who turned off a channel will not receive it there.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Message</h3>
            <Select
              label="Start from a template"
              placeholder="Write my own"
              options={templates.map((t) => ({ value: t.id, label: t.name }))}
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
            />
            <Input
              label="Title"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              hint={`${title.length}/${TITLE_MAX}`}
            />
            <Textarea
              label="Message"
              rows={4}
              value={message}
              maxLength={MESSAGE_MAX}
              onChange={(e) => setMessage(e.target.value)}
              hint={`${message.length}/${MESSAGE_MAX}. Use {{firstName}} to greet each person by name.`}
            />
            {(title.trim() || message.trim()) && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm" aria-label="Message preview">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Preview for a user named Priya</p>
                <p className="mt-1 font-semibold text-gray-900">{renderPreview(title)}</p>
                <p className="whitespace-pre-wrap text-gray-700">{renderPreview(message)}</p>
              </div>
            )}
            <Select
              label="Type"
              options={TYPE_OPTIONS}
              value={type}
              onChange={(e) => setType(e.target.value as BroadcastType)}
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Send through</h3>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {CHANNELS.map((channel) => (
                <label key={channel} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={channels.includes(channel)} onChange={() => toggleChannel(channel)} />
                  {BROADCAST_CHANNEL_LABELS[channel]}
                  {reach && <span className="text-xs text-gray-500">(reaches {reach.byChannel[channel].toLocaleString('en-IN')})</span>}
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Audience</h3>
            <AudienceFilterForm value={audienceForm} onChange={setAudienceForm} locations={locations} />
            <div className="rounded-xl bg-primary-50 p-3 text-sm text-primary-900" role="status">
              {audienceProblem ? (
                <span>{audienceProblem}</span>
              ) : reach ? (
                <span className={reachIsStale ? 'opacity-60' : undefined}>
                  <strong>{reach.total.toLocaleString('en-IN')}</strong> {reach.total === 1 ? 'user matches' : 'users match'}
                  {reachIsStale && ' (updating…)'}
                </span>
              ) : preview.isError ? (
                <span>Could not check the audience. Try changing a filter.</span>
              ) : (
                <span>Checking who this reaches…</span>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">When</h3>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" name="timing" checked={timing === 'now'} onChange={() => setTiming('now')} />
                Send now
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" name="timing" checked={timing === 'later'} onChange={() => setTiming('later')} />
                Schedule for later
              </label>
              {timing === 'later' && (
                <Input
                  label="Send at"
                  type="datetime-local"
                  value={scheduledLocal}
                  min={toLocalInputValue(new Date(Date.now() + 2 * MIN_SCHEDULE_LEAD_MS))}
                  onChange={(e) => setScheduledLocal(e.target.value)}
                />
              )}
            </div>
          </section>

          <section className="space-y-1">
            <label className={`flex items-center gap-2 text-sm ${smartTimingAllowed ? 'text-gray-700' : 'text-gray-400'}`}>
              <input
                type="checkbox"
                checked={useSmartTiming}
                disabled={!smartTimingAllowed}
                onChange={(e) => setSmartTiming(e.target.checked)}
              />
              Send at each person&apos;s best time
            </label>
            <p className="pl-6 text-xs text-gray-500">
              {smartTimingAllowed
                ? 'Each person gets the message at the hour they are usually active in the app, within 24 hours of the send time. People with little history get it in the early evening. Never sent between 10 PM and 9 AM.'
                : 'System announcements are always sent straight away.'}
            </p>
          </section>

          {problems.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-red-600" role="alert">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  )
}
