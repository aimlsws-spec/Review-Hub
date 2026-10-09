import { DetailSection, ErrorState, FactList, Modal, Spinner, StatusBadge } from '@viralkar/shared-ui'

import PolicyFlags, { hasBlockingFlag } from '@/components/PolicyFlags'
import { useCampaignDetailQuery, type CampaignReviewKind } from '@/hooks/useCampaignQueue'
import type { CampaignDetail, CampaignTaskDetail } from '@/types'
import { formatCurrency, formatDate, formatDateTime, humanize, uploadUrl } from '@/utils'

/** Who checks a task's proof. A person (the merchant, or an admin) approves every reward; checks only advise. */
const VERIFICATION_LABELS: Record<string, string> = {
  MANUAL: 'Merchant reviews each one',
  HYBRID: 'AI checks, then merchant confirms',
  // "The AI pays automatically" was retired: such a task now works as AI checks, then merchant confirms.
  AI: 'AI checks, then merchant confirms',
  SYSTEM: 'Code or location checked, then merchant confirms',
}

function audience(campaign: CampaignDetail): string {
  const parts: string[] = []
  if (campaign.minimumAge || campaign.maximumAge) {
    parts.push(`Age ${campaign.minimumAge ?? 'any'}–${campaign.maximumAge ?? 'any'}`)
  }
  if (campaign.targetGender && campaign.targetGender !== 'ALL') parts.push(humanize(campaign.targetGender))
  if (campaign.minimumFollowers > 0) parts.push(`${campaign.minimumFollowers}+ followers`)
  return parts.length ? parts.join(' · ') : 'Everyone'
}

/** What a task asks for, and how it is checked: the part a moderator most needs to read. */
function TaskCard({ task, index }: { task: CampaignTaskDetail; index: number }) {
  const config = task.configuration ?? {}
  return (
    <li className="rounded-lg border border-gray-200 p-3">
      <p className="font-medium text-gray-900">
        {index + 1}. {task.title}
        {!task.required && <span className="ml-2 text-xs font-normal text-gray-400">optional</span>}
      </p>
      <p className="mt-0.5 text-xs text-gray-500">
        {[
          humanize(task.taskType),
          task.proofType ? `Proof: ${humanize(task.proofType)}` : null,
          VERIFICATION_LABELS[task.verificationType] ?? humanize(task.verificationType),
          humanize(task.completionLimit),
          task.rewardAmount ? `Reward ${formatCurrency(task.rewardAmount)}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      {task.description && <p className="mt-2 text-sm text-gray-700">{task.description}</p>}
      {task.instructions && <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{task.instructions}</p>}
      {typeof config.targetUrl === 'string' && (
        <p className="mt-1 text-xs text-gray-500">
          Participants open:{' '}
          <a href={config.targetUrl} target="_blank" rel="noopener noreferrer" className="break-all text-primary-600 hover:underline">
            {config.targetUrl}
          </a>
          <span className="ml-1 text-gray-400">· check it belongs to this business</span>
        </p>
      )}
      {task.taskType === 'QR_SCAN' && typeof config.qrCode === 'string' && (
        <p className="mt-1 text-xs text-gray-500">QR code value: <span className="font-mono">{config.qrCode}</span></p>
      )}
      {task.taskType === 'LOCATION_CHECKIN' && (
        <p className="mt-1 text-xs text-gray-500">
          Check-in point: {String(config.latitude)}, {String(config.longitude)} within {String(config.radiusMeters ?? 200)} m
        </p>
      )}
    </li>
  )
}

/**
 * Everything about a merchant's campaign in one place, so a moderator decides on the whole of it: who runs it, what it
 * says, what it pays and for how long, who it is for, exactly what participants are asked to do, wording problems,
 * and what earlier reviewers said.
 */
export function CampaignDetailModal({
  campaignId,
  onClose,
  onReview,
}: {
  campaignId: string
  onClose: () => void
  /** Moves on to approving, rejecting or requesting changes. Left out, the view is read-only. */
  onReview?: (campaign: CampaignDetail, kind: CampaignReviewKind) => void
}) {
  const { data, isLoading, isError, refetch } = useCampaignDetailQuery(campaignId)
  const campaign = data?.data.data
  const reviewable = !!onReview && campaign?.status === 'PENDING_REVIEW'
  const blocked = hasBlockingFlag(campaign?.policyFlags)

  return (
    <Modal
      open
      onClose={onClose}
      title={campaign?.title ?? 'Campaign'}
      size="xl"
      footer={
        reviewable && campaign ? (
          <>
            <button className="btn-secondary text-red-600" onClick={() => onReview(campaign, 'reject')}>Reject</button>
            <button className="btn-secondary" onClick={() => onReview(campaign, 'request-changes')}>Request changes</button>
            <button
              className="btn-primary"
              disabled={blocked}
              title={blocked ? 'The wording asks for a rating. Request changes or reject instead.' : undefined}
              onClick={() => onReview(campaign, 'approve')}
            >
              Approve
            </button>
          </>
        ) : (
          <button className="btn-secondary" onClick={onClose}>Close</button>
        )
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : isError || !campaign ? (
        <ErrorState message="Could not load this campaign." onRetry={() => refetch()} />
      ) : (
        <div className="space-y-6">
          {campaign.thumbnailUrl && (
            // The cover participants see on the campaign card: part of what the admin approves.
            <img src={uploadUrl(campaign.thumbnailUrl)} alt="Campaign cover" className="h-40 w-full rounded-lg object-cover" />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={campaign.status} />
            <span className="text-sm text-gray-500">
              {humanize(campaign.campaignType)} · created {formatDate(campaign.createdAt)} · last changed {formatDateTime(campaign.updatedAt)}
            </span>
          </div>

          {campaign.policyFlags.length > 0 && (
            <DetailSection title="Wording warnings">
              <PolicyFlags flags={campaign.policyFlags} />
            </DetailSection>
          )}

          <DetailSection title="Merchant">
            <FactList
              items={[
                ['Business', campaign.merchant.businessName],
                ['City', campaign.merchant.city?.name ?? 'Not set'],
                ['Email', campaign.merchant.email],
                ['Phone', campaign.merchant.phone],
                ['Account', <StatusBadge key="status" status={campaign.merchant.status} />],
                ['Verification', <StatusBadge key="verification" status={campaign.merchant.verificationStatus} />],
              ]}
            />
          </DetailSection>

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

          {campaign.performance && (
            <DetailSection title="Performance so far">
              <FactList
                items={[
                  ['People joined', campaign.performance.joins],
                  ['People who finished', `${campaign.performance.finished} (${Math.round(campaign.performance.completionRate * 100)}%)`],
                  ['Tasks rewarded', campaign.performance.completions],
                  ['Rewards paid', formatCurrency(campaign.performance.rewardsPaid)],
                ]}
              />
            </DetailSection>
          )}

          <DetailSection title="Dates and audience">
            <FactList
              items={[
                ['Starts', campaign.startAt ? formatDate(campaign.startAt) : 'When activated'],
                ['Ends', campaign.endAt ? formatDate(campaign.endAt) : 'When the budget runs out'],
                ['Visibility', humanize(campaign.visibility)],
                ['Audience', audience(campaign)],
              ]}
            />
          </DetailSection>

          <DetailSection title={`Tasks (${campaign.tasks.length})`}>
            {campaign.tasks.length === 0 ? (
              <p className="text-sm text-gray-500">No tasks.</p>
            ) : (
              <ol className="space-y-2">
                {campaign.tasks.map((task, index) => (
                  <TaskCard key={task.id} task={task} index={index} />
                ))}
              </ol>
            )}
          </DetailSection>

          {campaign.media.length > 0 && (
            <DetailSection title="Images">
              <div className="flex flex-wrap gap-2">
                {campaign.media.map((item) => (
                  <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline">
                    {humanize(item.type)}
                  </a>
                ))}
              </div>
            </DetailSection>
          )}

          <DetailSection title="Review history">
            {campaign.approvals.length === 0 ? (
              <p className="text-sm text-gray-500">Not reviewed before.</p>
            ) : (
              <ul className="space-y-2">
                {campaign.approvals.map((approval, index) => (
                  <li key={index} className="text-sm">
                    <span className="font-medium text-gray-900">{humanize(approval.status)}</span>
                    <span className="text-gray-500">
                      {' '}by {approval.reviewer.firstName} {approval.reviewer.lastName} · {formatDateTime(approval.createdAt)}
                    </span>
                    {approval.comments && <p className="text-gray-600">“{approval.comments}”</p>}
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
