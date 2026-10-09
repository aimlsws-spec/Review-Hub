import { EmptyState, ErrorState, Input, PageHeader, Pagination, Select, StatusBadge, TableSkeleton } from '@viralkar/shared-ui'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { CampaignDetailModal } from '@/components/CampaignDetailModal'
import { CAMPAIGN_STATUS_LABELS, ITEMS_PER_PAGE } from '@/constants'
import { useAllCampaignsQuery } from '@/hooks/useCampaignQueue'
import type { CampaignStatus } from '@/types'
import { cn, formatCurrency, formatDate, humanize } from '@/utils'

/** Tab order: what an admin watches most (live, waiting) first, finished campaigns last. */
const STATUS_TABS: CampaignStatus[] = [
  'ACTIVE',
  'PENDING_REVIEW',
  'APPROVED',
  'SCHEDULED',
  'PAUSED',
  'CHANGES_REQUESTED',
  'DRAFT',
  'COMPLETED',
  'EXPIRED',
  'CANCELLED',
  'REJECTED',
]

const CAMPAIGN_TYPES = ['REVIEW', 'SOCIAL_SHARE', 'SOCIAL_FOLLOW', 'REFERRAL', 'APP_INSTALL', 'VIDEO_WATCH', 'WEBSITE_VISIT', 'SURVEY', 'CUSTOM']
const TYPE_OPTIONS = [{ value: '', label: 'All types' }, ...CAMPAIGN_TYPES.map((value) => ({ value, label: humanize(value) }))]

function dateRange(startAt: string | null, endAt: string | null): string {
  if (!startAt && !endAt) return 'No dates set'
  return `${startAt ? formatDate(startAt) : 'On activation'} – ${endAt ? formatDate(endAt) : 'Until budget runs out'}`
}

/**
 * Every merchant's campaigns, whatever their status, so an approved campaign stays in sight after it leaves the
 * moderation queue. `?merchant=<id>` narrows the list to one business (the merchant page links here) and
 * `?campaign=<id>` opens that campaign's details.
 */
export default function AllCampaignsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const merchantId = searchParams.get('merchant') ?? undefined
  const openCampaignId = searchParams.get('campaign')

  const [status, setStatus] = useState<CampaignStatus | ''>('')
  const [campaignType, setCampaignType] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, refetch } = useAllCampaignsQuery({
    page,
    limit: ITEMS_PER_PAGE,
    status: status || undefined,
    campaignType: campaignType || undefined,
    merchantId,
    search: search || undefined,
  })

  const result = data?.data.data
  const campaigns = result?.data ?? []
  const counts = result?.statusCounts ?? {}
  const allCount = Object.values(counts).reduce((sum, count) => sum + (count ?? 0), 0)
  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / ITEMS_PER_PAGE))
  const merchantName = merchantId ? campaigns[0]?.merchant.businessName : undefined

  const chooseStatus = (next: CampaignStatus | '') => {
    setStatus(next)
    setPage(1)
  }

  const setParam = (key: 'merchant' | 'campaign', value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault()
    setSearch(searchInput.trim())
    setPage(1)
  }

  return (
    <div>
      <PageHeader title="All Campaigns" subtitle="Every merchant's campaigns in any status: live, waiting, paused and finished." />

      {merchantId && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="rounded-full bg-primary-50 px-3 py-1 font-medium text-primary-700">
            Merchant: {merchantName ?? 'selected merchant'}
          </span>
          <button type="button" className="btn-ghost btn-sm" onClick={() => setParam('merchant', null)}>
            Show all merchants
          </button>
        </div>
      )}

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200" role="tablist" aria-label="Campaign status">
        {(['', ...STATUS_TABS] as const).map((value) => {
          const count = value ? counts[value] ?? 0 : allCount
          const selected = status === value
          return (
            <button
              key={value || 'all'}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => chooseStatus(value)}
              className={cn(
                '-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium',
                selected ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {value ? CAMPAIGN_STATUS_LABELS[value] : 'All'}
              {/* No counts until the list has loaded: a failed request must not read as "no campaigns". */}
              {result && <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 text-xs text-gray-600">{count}</span>}
            </button>
          )
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <form onSubmit={submitSearch} className="flex min-w-[240px] flex-1 items-end gap-2" role="search">
          <div className="flex-1">
            <Input
              id="campaign-search"
              label="Search"
              placeholder="Campaign title or business name..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
          <button type="submit" className="btn-secondary">Search</button>
        </form>
        <div className="w-48">
          <Select
            id="campaign-type"
            label="Campaign type"
            options={TYPE_OPTIONS}
            value={campaignType}
            onChange={(event) => {
              setCampaignType(event.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : campaigns.length === 0 ? (
        <EmptyState title="No campaigns found" description="No campaign matches these filters." />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Campaign</th>
                <th className="table-th">Merchant</th>
                <th className="table-th">Status</th>
                <th className="table-th">Reward</th>
                <th className="table-th">Budget used</th>
                <th className="table-th">Rewarded</th>
                <th className="table-th">Dates</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="table-tr">
                  <td className="table-td">
                    <button
                      type="button"
                      className="text-left font-medium text-gray-900 hover:text-primary-600 hover:underline"
                      onClick={() => setParam('campaign', campaign.id)}
                    >
                      {campaign.title}
                    </button>
                    <p className="text-xs text-gray-400">
                      {humanize(campaign.campaignType)}
                      {campaign.featured && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">Featured</span>}
                    </p>
                  </td>
                  <td className="table-td">
                    <button
                      type="button"
                      className="text-left text-gray-700 hover:text-primary-600 hover:underline"
                      title="Show only this merchant's campaigns"
                      onClick={() => setParam('merchant', campaign.merchant.id)}
                    >
                      {campaign.merchant.businessName}
                    </button>
                  </td>
                  <td className="table-td">
                    <StatusBadge status={campaign.status} />
                  </td>
                  <td className="table-td">{formatCurrency(campaign.rewardAmount)}</td>
                  <td className="table-td">
                    {formatCurrency(campaign.spentBudget)} <span className="text-gray-400">/ {formatCurrency(campaign.totalBudget)}</span>
                  </td>
                  <td className="table-td">
                    {campaign.performance?.completions ?? 0}
                    <span className="text-gray-400"> · {campaign.performance?.joins ?? 0} joined</span>
                  </td>
                  <td className="table-td text-xs text-gray-500">{dateRange(campaign.startAt, campaign.endAt)}</td>
                  <td className="table-td text-right">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setParam('campaign', campaign.id)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {openCampaignId && <CampaignDetailModal campaignId={openCampaignId} onClose={() => setParam('campaign', null)} />}
    </div>
  )
}
