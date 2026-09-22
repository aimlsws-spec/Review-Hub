import { Badge, Skeleton, StatusBadge } from '@reviewhub/shared-ui'

import { ACCOUNT_LINK_LABELS, IP_VERDICT_LABELS } from '@/constants'
import { useAccountRiskQuery } from '@/hooks/useAccountRisk'
import type { IpVerdict } from '@/types'

const VERDICT_VARIANT: Record<IpVerdict, 'red' | 'green' | 'gray'> = {
  ANONYMIZER: 'red',
  CLEAN: 'green',
  PRIVATE: 'gray',
  UNKNOWN: 'gray',
}

/**
 * The fraud picture of one account for a reviewer: an overall score with what it is made of, the other
 * accounts this one is tied to (and how), and where it has been logging in from.
 */
export function AccountRiskPanel({ userId }: { userId: string }) {
  const { data, isLoading, isError } = useAccountRiskQuery(userId)
  const risk = data?.data.data

  return (
    <section className="space-y-3 border-t border-gray-100 pt-4" aria-label="Account risk">
      <h3 className="text-sm font-semibold text-gray-900">Account risk</h3>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : isError || !risk ? (
        <p className="text-sm text-gray-500">The risk details could not be loaded.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <StatusBadge status={risk.level} />
            <span className="text-gray-900">
              Score <strong>{risk.score}</strong> / 100
            </span>
            <span className="text-gray-500">
              Device risk {risk.deviceRisk} · Linked-account points {risk.linkPoints}
            </span>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Linked accounts</p>
            {risk.linkedAccounts.length === 0 ? (
              <p className="text-sm text-gray-500">No other account shares a PAN, bank account, device or network with this one.</p>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {risk.linkedAccounts.map((account) => (
                  <li key={account.userId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{account.name}</span>
                      <StatusBadge status={account.status} />
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {account.kinds.map((kind) => (
                        <Badge key={kind} variant={kind === 'IP' ? 'gray' : kind === 'DEVICE' ? 'yellow' : 'red'}>
                          {ACCOUNT_LINK_LABELS[kind] ?? kind}
                        </Badge>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Recent IP addresses</p>
            {risk.recentIps.length === 0 ? (
              <p className="text-sm text-gray-500">No recent logins.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {risk.recentIps.map((entry) => (
                  <li key={entry.ip} className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-gray-900">{entry.ip}</span>
                    <Badge variant={VERDICT_VARIANT[entry.verdict]}>{IP_VERDICT_LABELS[entry.verdict] ?? entry.verdict}</Badge>
                    {entry.sources.length > 0 && <span className="text-xs text-gray-500">{entry.sources.join(', ')}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  )
}
