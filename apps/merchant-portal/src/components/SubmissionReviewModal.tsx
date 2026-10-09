import { Modal, Spinner, StatusBadge, Textarea } from '@viralkar/shared-ui'
import { useState } from 'react'

import { SUBMISSION_STATUS_LABELS, TASK_TYPE_LABELS, verificationLabel } from '@/constants'
import { useSubmissionDecisions, useSubmissionEvidenceUrl } from '@/hooks/useSubmissions'
import type { MerchantSubmission } from '@/types'
import { formatCurrency, formatDateTime } from '@/utils'

/** Statuses a decision can still be made on: waiting for the merchant, or still with the AI. */
export const DECIDABLE_STATUSES = ['PENDING', 'AI_PROCESSING', 'PENDING_MANUAL']

const MIN_REASON_LENGTH = 5

const RISK_STYLES: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-amber-50 text-amber-800',
  HIGH: 'bg-red-50 text-red-700',
  CRITICAL: 'bg-red-100 text-red-800',
}

/** What the AI said, in plain words. */
function aiSummary(ai: NonNullable<MerchantSubmission['ai']>): string {
  if (ai.status === 'QUEUED' || ai.status === 'PROCESSING') return 'The AI is still checking this.'
  if (ai.status === 'FAILED') return 'The AI check did not finish. Review it yourself.'
  const verdict = ai.decision === 'APPROVE' ? 'looks genuine' : ai.decision === 'REJECT' ? 'looks wrong' : 'needs a person'
  const confidence = ai.confidence === null ? '' : ` (${Math.round(ai.confidence * 100)}% sure)`
  return `The AI thinks it ${verdict}${confidence}.`
}

function Evidence({ merchantId, submission }: { merchantId: string | undefined; submission: MerchantSubmission }) {
  const file = submission.evidence.file
  const { url, isLoading, isError } = useSubmissionEvidenceUrl(merchantId, submission.id, !!file)

  return (
    <div className="space-y-3">
      {file && (
        <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          {isLoading ? (
            <Spinner />
          ) : isError || !url ? (
            <p className="p-6 text-sm text-gray-500">The proof file could not be loaded.</p>
          ) : file.mimeType.startsWith('image/') ? (
            <img src={url} alt={`Proof sent for ${submission.task.title}`} className="max-h-[28rem] w-auto object-contain" />
          ) : file.mimeType.startsWith('video/') ? (
            <video src={url} controls className="max-h-[28rem] w-full" />
          ) : (
            <a href={url} target="_blank" rel="noopener noreferrer" className="p-6 text-sm font-medium text-primary-600 hover:underline">
              Open {file.fileName}
            </a>
          )}
        </div>
      )}
      {submission.evidence.link && (
        <p className="text-sm">
          <span className="text-gray-500">Link: </span>
          <a href={submission.evidence.link} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-primary-600 hover:underline">
            {submission.evidence.link}
          </a>
        </p>
      )}
      {!file && !submission.evidence.link && <p className="text-sm text-gray-500">No proof was attached.</p>}
    </div>
  )
}

/** One submission: the proof, what the AI and the fraud checks found, and the merchant's decision. */
export function SubmissionReviewModal({
  merchantId,
  submission,
  onClose,
}: {
  merchantId: string | undefined
  submission: MerchantSubmission
  onClose: () => void
}) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const { approveMutation, rejectMutation } = useSubmissionDecisions(merchantId, { onDecided: onClose })

  const decidable = DECIDABLE_STATUSES.includes(submission.status)
  const busy = approveMutation.isPending || rejectMutation.isPending
  const reasonTooShort = reason.trim().length < MIN_REASON_LENGTH

  return (
    <Modal
      open
      onClose={onClose}
      title="Review submission"
      size="xl"
      footer={
        !decidable ? (
          <button className="btn-secondary" onClick={onClose}>Close</button>
        ) : rejecting ? (
          <>
            <button className="btn-secondary" onClick={() => setRejecting(false)} disabled={busy}>Back</button>
            <button
              className="btn-danger"
              disabled={busy || reasonTooShort}
              onClick={() => rejectMutation.mutate({ submissionId: submission.id, reason: reason.trim() })}
            >
              {rejectMutation.isPending && <Spinner size="sm" className="text-white" />}
              Reject submission
            </button>
          </>
        ) : (
          <>
            <button className="btn-secondary text-red-600" onClick={() => setRejecting(true)} disabled={busy}>Reject</button>
            <button className="btn-primary" onClick={() => approveMutation.mutate(submission.id)} disabled={busy}>
              {approveMutation.isPending && <Spinner size="sm" className="text-white" />}
              Approve and pay
            </button>
          </>
        )
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium text-gray-900">{submission.task.title}</p>
            <p className="text-sm text-gray-500">
              {submission.campaign.title} · {TASK_TYPE_LABELS[submission.task.taskType] ?? submission.task.taskType}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              From {submission.participantName} · {formatDateTime(submission.createdAt)}
              {submission.attemptNumber > 1 && ` · attempt ${submission.attemptNumber}`}
              {' · '}
              {verificationLabel(submission.task.verificationType) ?? 'Code or place checked, then I confirm'}
            </p>
          </div>
          <StatusBadge status={submission.status} label={SUBMISSION_STATUS_LABELS[submission.status]} />
        </div>

        <Evidence merchantId={merchantId} submission={submission} />

        {submission.ai && (
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
            <p className="font-medium text-gray-900">{aiSummary(submission.ai)}</p>
            {submission.ai.explanation && <p className="mt-1 text-gray-600">{submission.ai.explanation}</p>}
            <p className="mt-1 text-xs text-gray-400">
              The AI can spot re-used, blank or unreadable proof and wrong links. It can not confirm the proof shows your
              business, so look at it yourself.
            </p>
          </div>
        )}

        {submission.flags.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">Warnings</p>
            <ul className="space-y-1.5">
              {submission.flags.map((flag, index) => (
                <li key={index} className={`rounded-md px-3 py-2 text-sm ${RISK_STYLES[flag.riskLevel] ?? RISK_STYLES.LOW}`}>
                  <span className="font-medium">{flag.riskLevel.toLowerCase()} risk:</span> {flag.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {submission.status === 'APPROVED' && submission.rewardAmount !== null && (
          <p className="text-sm text-gray-600">Approved{submission.reviewedAt && ` on ${formatDateTime(submission.reviewedAt)}`}. Reward: {formatCurrency(submission.rewardAmount)}.</p>
        )}
        {submission.status === 'REJECTED' && submission.rejectionReason && (
          <p className="text-sm text-gray-600">Rejected: {submission.rejectionReason}</p>
        )}

        {decidable && rejecting && (
          <Textarea
            label="Why are you rejecting it?"
            required
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            hint="The participant sees this, so say what is missing or wrong (at least 5 characters)."
          />
        )}
        {decidable && !rejecting && (
          <p className="text-xs text-gray-400">Approving pays the reward from this campaign&apos;s budget straight away.</p>
        )}
      </div>
    </Modal>
  )
}
