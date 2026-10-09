import { EmptyState, ErrorState, Pagination, Select, StatusBadge, TableSkeleton } from '@viralkar/shared-ui'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { SubmissionReviewModal } from '@/components/SubmissionReviewModal'
import { ITEMS_PER_PAGE, SUBMISSION_STATUS_LABELS } from '@/constants'
import { useCampaignsQuery } from '@/hooks/useCampaigns'
import { useSubmissionsQuery } from '@/hooks/useSubmissions'
import { useAuthStore } from '@/stores/auth.store'
import type { MerchantSubmission, SubmissionStatus } from '@/types'
import { formatDateTime } from '@/utils'

/** The views a merchant switches between. "Waiting for you" is where the work is, so it opens first. */
const STATUS_FILTERS: { value: SubmissionStatus | ''; label: string }[] = [
  { value: 'PENDING_MANUAL', label: 'Waiting for you' },
  { value: 'PENDING', label: 'AI checking' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: '', label: 'All submissions' },
]

/** Enough campaigns for the filter; a merchant with more can still reach one from its row on the Campaigns page. */
const CAMPAIGN_FILTER_LIMIT = 100

function proofLabel(submission: MerchantSubmission): string {
  const file = submission.evidence.file
  if (file?.mimeType.startsWith('image/')) return 'Screenshot'
  if (file?.mimeType.startsWith('video/')) return 'Video'
  if (file) return 'File'
  return submission.evidence.link ? 'Link' : 'None'
}

/** The task submissions to the merchant's campaigns, to look at and approve or reject. */
export default function SubmissionsPage() {
  const merchantId = useAuthStore((s) => s.merchant?.id)
  const [searchParams, setSearchParams] = useSearchParams()
  const campaignId = searchParams.get('campaignId') ?? ''
  const [status, setStatus] = useState<SubmissionStatus | ''>('PENDING_MANUAL')
  const [page, setPage] = useState(1)
  const [reviewing, setReviewing] = useState<MerchantSubmission | null>(null)

  const { data, isLoading, isError, refetch } = useSubmissionsQuery(merchantId, {
    page,
    limit: ITEMS_PER_PAGE,
    status: status || undefined,
    campaignId: campaignId || undefined,
  })
  const campaigns = useCampaignsQuery(merchantId, { page: 1, limit: CAMPAIGN_FILTER_LIMIT }, 'submissions-filter').data?.data?.data?.data ?? []

  const submissions = data?.data?.data?.data ?? []
  const total = data?.data?.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const chooseCampaign = (value: string) => {
    setPage(1)
    setSearchParams(value ? { campaignId: value } : {})
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Submissions</h1>
          <p className="page-subtitle">Check the proof people send for your campaign tasks, then approve or reject it.</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-48">
          <Select
            aria-label="Status"
            options={STATUS_FILTERS.map((filter) => ({ value: filter.value, label: filter.label }))}
            value={status}
            onChange={(event) => {
              setPage(1)
              setStatus(event.target.value as SubmissionStatus | '')
            }}
          />
        </div>
        <div className="w-64">
          <Select
            aria-label="Campaign"
            options={[{ value: '', label: 'All campaigns' }, ...campaigns.map((campaign) => ({ value: campaign.id, label: campaign.title }))]}
            value={campaignId}
            onChange={(event) => chooseCampaign(event.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : isError ? (
        <ErrorState message="Could not load submissions." onRetry={() => refetch()} />
      ) : submissions.length === 0 ? (
        <EmptyState
          title={status === 'PENDING_MANUAL' ? 'Nothing waiting for you' : 'No submissions here'}
          description={
            status === 'PENDING_MANUAL'
              ? 'When someone completes a task you check yourself, it appears here for you to approve or reject.'
              : 'Try another status or campaign.'
          }
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Submitted</th>
                <th className="table-th">Task</th>
                <th className="table-th">From</th>
                <th className="table-th">Proof</th>
                <th className="table-th">Checks</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {submissions.map((submission) => (
                <tr key={submission.id} className="table-tr">
                  <td className="table-td whitespace-nowrap text-gray-500">{formatDateTime(submission.createdAt)}</td>
                  <td className="table-td">
                    <p className="font-medium text-gray-900">{submission.task.title}</p>
                    <p className="text-xs text-gray-400">{submission.campaign.title}</p>
                  </td>
                  <td className="table-td text-gray-700">{submission.participantName}</td>
                  <td className="table-td text-gray-700">{proofLabel(submission)}</td>
                  <td className="table-td">
                    {submission.flags.length > 0 ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                        {submission.flags.length} {submission.flags.length === 1 ? 'warning' : 'warnings'}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">No warnings</span>
                    )}
                  </td>
                  <td className="table-td">
                    <StatusBadge status={submission.status} label={SUBMISSION_STATUS_LABELS[submission.status]} />
                  </td>
                  <td className="table-td text-right">
                    <button className="btn-ghost btn-sm text-primary-700 hover:bg-primary-50" onClick={() => setReviewing(submission)}>
                      {['PENDING', 'AI_PROCESSING', 'PENDING_MANUAL'].includes(submission.status) ? 'Review' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {reviewing && <SubmissionReviewModal merchantId={merchantId} submission={reviewing} onClose={() => setReviewing(null)} />}
    </div>
  )
}
