import { Input, Modal, Select, Spinner, Textarea } from '@reviewhub/shared-ui'
import { useState } from 'react'

import { BROADCAST_CHANNEL_LABELS } from '@/constants'
import { useCreateTemplateMutation, useUpdateTemplateMutation } from '@/hooks/useNotificationCenter'
import type { BroadcastChannel, NotificationTemplate } from '@/types'
import { findUnsupportedPlaceholders } from '@/utils/notifications'

const TITLE_MAX = 100
const BODY_MAX = 500
const CHANNEL_OPTIONS = (['IN_APP', 'PUSH', 'EMAIL'] as const).map((value) => ({ value, label: BROADCAST_CHANNEL_LABELS[value] }))

interface TemplateFormModalProps {
  /** Omit to create a new template. */
  template?: NotificationTemplate | null
  onClose: () => void
}

/** Create or edit a reusable message. A template is only a starting point: a broadcast keeps its own copy of the text. */
export function TemplateFormModal({ template, onClose }: TemplateFormModalProps) {
  const [name, setName] = useState(template?.name ?? '')
  const [title, setTitle] = useState(template?.title ?? '')
  const [body, setBody] = useState(template?.body ?? '')
  const [subject, setSubject] = useState(template?.subject ?? '')
  const [channel, setChannel] = useState<BroadcastChannel>(template && template.channel !== 'SMS' ? template.channel : 'IN_APP')
  const [isActive, setIsActive] = useState(template?.isActive ?? true)

  const { mutate: create, isPending: creating } = useCreateTemplateMutation(onClose)
  const { mutate: update, isPending: updating } = useUpdateTemplateMutation(onClose)
  const saving = creating || updating

  const unsupported = findUnsupportedPlaceholders(`${title} ${body} ${subject}`)
  const placeholderError = unsupported.length > 0 ? `Remove ${unsupported.map((n) => `{{${n}}}`).join(', ')}: only {{firstName}} can be used` : undefined
  const valid = name.trim() !== '' && title.trim() !== '' && body.trim() !== '' && !placeholderError

  const save = () => {
    const payload = { name: name.trim(), title: title.trim(), body: body.trim(), subject: subject.trim() || undefined, channel, isActive }
    if (template) update({ templateId: template.id, payload })
    else create(payload)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={template ? 'Edit template' : 'New template'}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={!valid || saving}>
            {saving && <Spinner size="sm" className="text-white" />}
            {template ? 'Save changes' : 'Create template'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} hint="Only you see this, to find the template later" />
        <Input label="Title" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} hint={`${title.length}/${TITLE_MAX}`} />
        <Textarea
          label="Message"
          rows={4}
          value={body}
          maxLength={BODY_MAX}
          onChange={(e) => setBody(e.target.value)}
          error={placeholderError}
          hint={`${body.length}/${BODY_MAX}. Use {{firstName}} to greet each person by name.`}
        />
        <Input label="Email subject" value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} hint="Optional. The title is used when empty." />
        <Select
          label="Usually sent by"
          options={CHANNEL_OPTIONS}
          value={channel}
          onChange={(e) => setChannel(e.target.value as BroadcastChannel)}
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Available when creating a broadcast
        </label>
      </div>
    </Modal>
  )
}
