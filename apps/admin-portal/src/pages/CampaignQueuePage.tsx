import {
  PageHeader,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Pagination,
  Modal,
  Textarea,
  Spinner,
} from '@reviewhub/shared-ui'
import { useState } from 'react'

import { ITEMS_PER_PAGE } from '@/constants'
import { useCampaignQueueQuery, useCampaignReviewMutation } from '@/hooks/useCampaignQueue'
import type { Campaign } from '@/types'
import { formatCurrency, formatDate } from '@/utils'

type ReviewKind = 'approve' | 'reject' | 'request-changes'

const REVIEW_COPY: Record<ReviewKind, { title: string; label: string; required: boolean; placeholder: string }> = {
  approve: { title: 'Approve campaign', label: 'Comments (optional)', required: false, placeholder: 'Looks good to go...' },
  reject: { title: 'Reject campaign', label: 'Reason for rejection', required: true, placeholder: 'Explain why this campaign is being rejected...' },
  'request-changes': { title: 'Request changes', label: 'What needs to change?', required: true, placeholder: 'Explain what the merchant should fix before resubmitting...' },
}

export default function CampaignQueuePage() {
  const [page, setPage] = useState(1)
  const [reviewTarget, setReviewTarget] = useState<{ campaign: Campaign; kind: ReviewKind } | null>(null)
  const [note, setNote] = useState('')

  const { data, isLoading, isError, refetch } = useCampaignQueueQuery({ page, limit: ITEMS_PER_PAGE })

  const campaigns = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const { mutate: submitReview, isPending } = useCampaignReviewMutation(() => {
    setReviewTarget(null)
    setNote('')
  })

  const openReview = (campaign: Campaign, kind: ReviewKind) => {
    setNote('')
    setReviewTarget({ campaign, kind })
  }

  const copy = reviewTarget ? REVIEW_COPY[reviewTarget.kind] : null
  const canSubmit = reviewTarget ? (!copy!.required || note.trim().length >= 5) : false

  return (
    <div>
      <PageHeader title="Campaign Queue" subtitle="Campaigns submitted by merchants and awaiting moderation." />

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : campaigns.length === 0 ? (
        <EmptyState
          title="Nothing to review"
          description="No campaigns are currently pending moderation."
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          }
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Campaign</th>
                <th className="table-th">Reward</th>
                <th className="table-th">Budget</th>
                <th className="table-th">Submitted</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="table-tr">
                  <td className="table-td">
                    <p className="font-medium text-gray-900">{campaign.title}</p>
                    <p className="text-xs text-gray-400">{campaign.campaignType}</p>
                  </td>
                  <td className="table-td">
                    {formatCurrency(campaign.rewardAmount)} <span className="text-gray-400">({campaign.rewardType})</span>
                  </td>
                  <td className="table-td">{formatCurrency(campaign.totalBudget)}</td>
                  <td className="table-td text-gray-500">{formatDate(campaign.updatedAt)}</td>
                  <td className="table-td text-right">
                    <div className="flex justify-end gap-2">
                      <button className="btn-ghost btn-sm text-green-700 hover:bg-green-50" onClick={() => openReview(campaign, 'approve')}>
                        Approve
                      </button>
                      <button className="btn-ghost btn-sm" onClick={() => openReview(campaign, 'request-changes')}>
                        Request Changes
                      </button>
                      <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => openReview(campaign, 'reject')}>
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {reviewTarget && copy && (
        <Modal
          open
          onClose={() => setReviewTarget(null)}
          title={copy.title}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setReviewTarget(null)} disabled={isPending}>
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={!canSubmit || isPending}
                onClick={() => submitReview({ campaign: reviewTarget.campaign, kind: reviewTarget.kind, note })}
              >
                {isPending && <Spinner size="sm" className="text-white" />}
                Confirm
              </button>
            </>
          }
        >
          <p className="mb-3 text-sm text-gray-600">
            <span className="font-medium text-gray-900">{reviewTarget.campaign.title}</span>
          </p>
          <Textarea
            label={copy.label}
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={copy.placeholder}
          />
        </Modal>
      )}
    </div>
  )
}
