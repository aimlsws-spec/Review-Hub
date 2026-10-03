import { Badge, Skeleton } from '@reviewhub/shared-ui'
import { useState } from 'react'

import { useReferralsQuery } from '@/hooks/useUsers'
import { formatDate } from '@/utils'

/** One level of the tree, fetched only when it is opened. */
function ReferralLevel({ userId, depth }: { userId: string; depth: number }) {
  const { data, isLoading, isError } = useReferralsQuery(userId)
  const level = data?.data.data
  const [open, setOpen] = useState<Record<string, boolean>>({})

  if (isLoading) return <Skeleton className="h-4 w-48" />
  if (isError || !level) return <p className="text-sm text-gray-500">The referrals could not be loaded.</p>
  if (level.data.length === 0) return <p className="text-sm text-gray-500">{depth === 0 ? 'Has not referred anyone.' : 'Nobody further.'}</p>

  return (
    <ul className={depth === 0 ? 'space-y-1' : 'mt-1 space-y-1 border-l border-gray-200 pl-4'}>
      {level.data.map((referral) => (
        <li key={referral.id}>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {referral.ownReferralCount > 0 ? (
              <button
                type="button"
                className="font-medium text-primary-700"
                aria-expanded={!!open[referral.referredUserId]}
                onClick={() => setOpen((o) => ({ ...o, [referral.referredUserId]: !o[referral.referredUserId] }))}
              >
                {open[referral.referredUserId] ? '▾' : '▸'} {referral.name}
              </button>
            ) : (
              <span className="font-medium text-gray-900">{referral.name}</span>
            )}
            <span className="text-gray-500">joined {formatDate(referral.joinedAt)}</span>
            <Badge variant={referral.rewardIssued ? 'green' : 'gray'}>{referral.rewardIssued ? 'Reward paid' : 'Reward pending'}</Badge>
            {referral.ownReferralCount > 0 && <span className="text-gray-500">· referred {referral.ownReferralCount}</span>}
          </div>
          {open[referral.referredUserId] && <ReferralLevel userId={referral.referredUserId} depth={depth + 1} />}
        </li>
      ))}
      {level.total > level.data.length && (
        <li className="text-xs text-gray-500">Showing the newest {level.data.length} of {level.total}.</li>
      )}
    </ul>
  )
}

/**
 * Read-only referral tree for one user: who referred them, and the people they referred, opened one level at a time
 * so a large tree never loads at once.
 */
export function ReferralTreePanel({ userId }: { userId: string }) {
  const { data } = useReferralsQuery(userId)
  const referrer = data?.data.data.referrer

  return (
    <section className="space-y-2 border-t border-gray-100 pt-4" aria-label="Referrals">
      <h3 className="text-sm font-semibold text-gray-900">Referrals</h3>
      <p className="text-sm text-gray-600">{referrer ? `Referred by ${referrer.name}.` : 'Joined without a referral.'}</p>
      <ReferralLevel userId={userId} depth={0} />
    </section>
  )
}
