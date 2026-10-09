import { Spinner, StatusBadge } from '@viralkar/shared-ui'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/constants'
import { useAllCampaignsQuery } from '@/hooks/useCampaignQueue'
import { formatCurrency } from '@/utils'

const SHOWN = 5

/** A merchant's latest campaigns on the merchant's detail view, each linking to its full details on All Campaigns. */
export function MerchantCampaignsPanel({ merchantId }: { merchantId: string }) {
  const { data, isLoading, isError } = useAllCampaignsQuery({ page: 1, limit: SHOWN, merchantId })
  const campaigns = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const listLink = `${ROUTES.ALL_CAMPAIGNS}?merchant=${merchantId}`

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Campaigns{total > 0 && ` (${total})`}</p>
        {total > 0 && (
          <Link to={listLink} className="text-sm text-primary-600 hover:underline">
            View all
          </Link>
        )}
      </div>
      {isLoading ? (
        <Spinner size="sm" />
      ) : isError ? (
        <p className="text-sm text-red-600">Could not load this merchant's campaigns.</p>
      ) : campaigns.length === 0 ? (
        <p className="text-sm text-gray-400">No campaigns created yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <Link
                to={`${listLink}&campaign=${campaign.id}`}
                className="flex items-center justify-between gap-3 p-3 hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{campaign.title}</p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(campaign.rewardAmount)} per task · {formatCurrency(campaign.spentBudget)} of{' '}
                    {formatCurrency(campaign.totalBudget)} used · {campaign.performance?.completions ?? 0} rewarded
                  </p>
                </div>
                <StatusBadge status={campaign.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
