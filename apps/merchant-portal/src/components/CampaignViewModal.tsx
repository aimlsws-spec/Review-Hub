import { DetailSection, ErrorState, FactList, Modal, Spinner, StatusBadge } from '@viralkar/shared-ui'

import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_TYPE_LABELS,
  TASK_COMPLETION_LIMIT_LABELS,
  TASK_PROOF_LABELS,
  TASK_TYPE_LABELS,
  verificationLabel,
} from '@/constants'
import { useCampaignTasksQuery } from '@/hooks/useCampaignTasks'
import type { Campaign, CampaignWithTasks } from '@/types'
import { formatCurrency, formatDate, formatDateTime } from '@/utils'

const EDITABLE_STATUSES = ['DRAFT', 'CHANGES_REQUESTED']

/** What an admin's review decided, in the merchant's words. */
const REVIEW_LABELS: Record<string, string> = {
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CHANGES_REQUESTED: 'Changes requested',
  PENDING: 'Waiting for review',
}

const GENDER_LABELS: Record<string, string> = { MALE: 'Men', FEMALE: 'Women', OTHER: 'Other' }

function audience(campaign: CampaignWithTasks): string {
  const parts: string[] = []
  if (campaign.minimumAge || campaign.maximumAge) parts.push(`Age ${campaign.minimumAge ?? 'any'}–${campaign.maximumAge ?? 'any'}`)
  if (campaign.targetGender && campaign.targetGender !== 'ALL') parts.push(GENDER_LABELS[campaign.targetGender] ?? campaign.targetGender)
  if (campaign.minimumFollowers) parts.push(`${campaign.minimumFollowers}+ followers`)
  return parts.length ? parts.join(' · ') : 'Everyone'
}

/**
 * One of the merchant's campaigns, read-only: what they wrote, what it pays, when it runs, who it is for, every task,
 * and what the admin said at each review, so they can check what they set up and see why changes were asked for.
 */
export function CampaignViewModal({
  campaign: row,
  onClose,
  onEdit,
  onEditTasks,
}: {
  campaign: Campaign
  onClose: () => void
  /** Offered while the campaign can still be changed. */
  onEdit?: () => void
  onEditTasks?: () => void
}) {
  const { data, isLoading, isError, refetch } = useCampaignTasksQuery(row.id)
  const campaign = data?.data.data
  const editable = EDITABLE_STATUSES.includes(row.status)
  const latestReview = campaign?.approvals?.[0]

  return (
    <Modal
      open
      onClose={onClose}
      title={row.title}
      size="xl"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Close</button>
          {editable && onEditTasks && <button className="btn-secondary" onClick={onEditTasks}>Edit tasks</button>}
          {editable && onEdit && <button className="btn-primary" onClick={onEdit}>Edit campaign</button>}
        </>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : isError || !campaign ? (
        <ErrorState message="Could not load this campaign." onRetry={() => refetch()} />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={campaign.status} label={CAMPAIGN_STATUS_LABELS[campaign.status]} />
            <span className="text-sm text-gray-500">
              {CAMPAIGN_TYPE_LABELS[campaign.campaignType] ?? campaign.campaignType} · created {formatDate(campaign.createdAt)}
            </span>
          </div>

          {latestReview?.comments && (latestReview.status === 'CHANGES_REQUESTED' || latestReview.status === 'REJECTED') && (
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">{REVIEW_LABELS[latestReview.status]} by Viralkar</p>
              <p className="mt-1">“{latestReview.comments}”</p>
              {editable && <p className="mt-1 text-amber-800">Make the changes, then submit it again.</p>}
            </div>
          )}

          <DetailSection title="What it says">
            {campaign.shortDescription && <p className="text-sm font-medium text-gray-900">{campaign.shortDescription}</p>}
            <p className="whitespace-pre-line text-sm text-gray-700">{campaign.description}</p>
          </DetailSection>

          <DetailSection title="Reward and budget">
            <FactList
              items={[
                ['Reward per person', formatCurrency(campaign.rewardAmount)],
                ['Total budget', formatCurrency(campaign.totalBudget)],
                ['Spent', formatCurrency(campaign.spentBudget)],
                ['Remaining', formatCurrency(campaign.remainingBudget)],
                ['Max participants', campaign.maxParticipants ?? 'No limit'],
                ['Joined so far', campaign.currentParticipants],
              ]}
            />
          </DetailSection>

          <DetailSection title="Dates and audience">
            <FactList
              items={[
                ['Starts', campaign.startAt ? formatDate(campaign.startAt) : 'When you activate it'],
                ['Ends', campaign.endAt ? formatDate(campaign.endAt) : 'When the budget runs out'],
                ['Who can join', audience(campaign)],
              ]}
            />
          </DetailSection>

          <DetailSection title={`Tasks (${campaign.tasks.length})`}>
            {campaign.tasks.length === 0 ? (
              <p className="text-sm text-gray-500">No tasks yet. Add at least one before you submit.</p>
            ) : (
              <ol className="space-y-2">
                {campaign.tasks.map((task, index) => (
                  <li key={task.id} className="rounded-lg border border-gray-200 p-3">
                    <p className="font-medium text-gray-900">
                      {index + 1}. {task.title}
                      {!task.required && <span className="ml-2 text-xs font-normal text-gray-400">optional</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {[
                        TASK_TYPE_LABELS[task.taskType] ?? task.taskType,
                        task.proofType ? TASK_PROOF_LABELS[task.proofType] : undefined,
                        verificationLabel(task.verificationType) ?? (task.verificationType === 'SYSTEM' ? 'Code or place checked, then I confirm' : undefined),
                        TASK_COMPLETION_LIMIT_LABELS[task.completionLimit],
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {task.description && <p className="mt-2 text-sm text-gray-700">{task.description}</p>}
                    {task.instructions && <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{task.instructions}</p>}
                  </li>
                ))}
              </ol>
            )}
          </DetailSection>

          <DetailSection title="Review history">
            {!campaign.approvals?.length ? (
              <p className="text-sm text-gray-500">Not reviewed yet.</p>
            ) : (
              <ul className="space-y-2">
                {campaign.approvals.map((review, index) => (
                  <li key={index} className="text-sm">
                    <span className="font-medium text-gray-900">{REVIEW_LABELS[review.status] ?? review.status}</span>
                    <span className="text-gray-500"> · {formatDateTime(review.createdAt)}</span>
                    {review.comments && <p className="text-gray-600">“{review.comments}”</p>}
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>
        </div>
      )}
    </Modal>
  )
}
