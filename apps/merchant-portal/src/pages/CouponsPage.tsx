import { StatusBadge, EmptyState, ErrorState, TableSkeleton } from '@reviewhub/shared-ui'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { ROUTES, REWARD_TYPE_LABELS } from '@/constants'
import { useCampaignsQuery } from '@/hooks/useCampaigns'
import { useAuthStore } from '@/stores/auth.store'
import type { RewardType } from '@/types'
import { formatCurrency } from '@/utils'

const COUPON_REWARD_TYPES: RewardType[] = ['COUPON', 'GIFT_CARD', 'DISCOUNT']

export default function CouponsPage() {
  const merchantId = useAuthStore((s) => s.merchant?.id)

  const { data, isLoading, isError, refetch } = useCampaignsQuery(merchantId, { limit: 100 }, 'coupons')

  const campaigns = data?.data?.data?.data ?? []
  const coupons = useMemo(() => campaigns.filter((c) => COUPON_REWARD_TYPES.includes(c.rewardType)), [campaigns])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Coupons</h1>
          <p className="page-subtitle">Campaigns rewarding participants with coupons, gift cards, or discounts.</p>
        </div>
        <Link to={ROUTES.CAMPAIGNS} className="btn-primary">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Coupon Campaign
        </Link>
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : coupons.length === 0 ? (
        <EmptyState
          title="No coupon campaigns yet"
          description="Create a campaign with a coupon, gift card, or discount reward to see it here."
          action={<Link to={ROUTES.CAMPAIGNS} className="btn-primary">Go to Campaigns</Link>}
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
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
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {coupons.map((campaign) => (
                <tr key={campaign.id} className="table-tr">
                  <td className="table-td">
                    <Link to={ROUTES.CAMPAIGNS} className="font-medium text-gray-900 hover:text-primary-600">
                      {campaign.title}
                    </Link>
                  </td>
                  <td className="table-td">
                    {formatCurrency(campaign.rewardAmount)} <span className="text-gray-400">({REWARD_TYPE_LABELS[campaign.rewardType] ?? campaign.rewardType})</span>
                  </td>
                  <td className="table-td">
                    {formatCurrency(campaign.spentBudget)} <span className="text-gray-400">/ {formatCurrency(campaign.totalBudget)}</span>
                  </td>
                  <td className="table-td"><StatusBadge status={campaign.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
