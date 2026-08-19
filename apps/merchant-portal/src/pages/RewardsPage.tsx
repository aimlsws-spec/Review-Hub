import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { useMerchantRewardsQuery } from '@/hooks/useRewards'
import { ROUTES, ITEMS_PER_PAGE, REWARD_TYPE_LABELS } from '@/constants'
import { StatusBadge, EmptyState, ErrorState, TableSkeleton, Pagination } from '@reviewhub/shared-ui'
import { formatCurrency, formatDateTime, getInitials } from '@/utils'

export default function RewardsPage() {
  const merchantId = useAuthStore((s) => s.merchant?.id)
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, refetch } = useMerchantRewardsQuery(merchantId, page, ITEMS_PER_PAGE)

  const rewards = data?.data?.data?.data ?? []
  const total = data?.data?.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Rewards</h1>
          <p className="page-subtitle">Rewards paid out to participants across your campaigns.</p>
        </div>
        <Link to={ROUTES.CAMPAIGNS} className="btn-secondary">
          Manage Campaigns
        </Link>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : rewards.length === 0 ? (
        <EmptyState
          title="No rewards paid out yet"
          description="Once participants complete tasks and are approved, their rewards will appear here."
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          }
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Participant</th>
                <th className="table-th">Campaign</th>
                <th className="table-th">Amount</th>
                <th className="table-th">Status</th>
                <th className="table-th">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rewards.map((reward) => (
                <tr key={reward.id} className="table-tr">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                        {reward.user ? getInitials(reward.user.firstName, reward.user.lastName) : '?'}
                      </div>
                      <span className="font-medium text-gray-900">
                        {reward.user ? `${reward.user.firstName} ${reward.user.lastName}` : reward.userId.slice(0, 8)}
                      </span>
                    </div>
                  </td>
                  <td className="table-td text-gray-500">{reward.campaign?.title ?? '—'}</td>
                  <td className="table-td font-semibold text-gray-900">
                    {formatCurrency(reward.amount)} <span className="font-normal text-gray-400">({REWARD_TYPE_LABELS[reward.rewardType] ?? reward.rewardType})</span>
                  </td>
                  <td className="table-td"><StatusBadge status={reward.status} /></td>
                  <td className="table-td text-gray-500">{formatDateTime(reward.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}
