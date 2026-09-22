import { Badge, Skeleton } from '@reviewhub/shared-ui'
import { Link } from 'react-router-dom'

import { CAMPAIGN_TYPE_LABELS, ROUTES } from '@/constants'
import { useMerchantInsightsQuery } from '@/hooks/useInsights'
import type { InsightSeverity, InsightSuggestion } from '@/types'
import { formatCurrency } from '@/utils'

const SEVERITY_STYLE: Record<InsightSeverity, { label: string; variant: 'red' | 'yellow' | 'blue' }> = {
  WARNING: { label: 'Needs attention', variant: 'red' },
  OPPORTUNITY: { label: 'Could be better', variant: 'yellow' },
  INFO: { label: 'Good to know', variant: 'blue' },
}

const percent = (fraction: number) => `${Math.round(fraction * 100)}%`

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-[11.5px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
      {hint && <p className="text-[11.5px] text-slate-400">{hint}</p>}
    </div>
  )
}

function Suggestion({ suggestion }: { suggestion: InsightSuggestion }) {
  const style = SEVERITY_STYLE[suggestion.severity]
  return (
    <li className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">{suggestion.title}</p>
        <Badge variant={style.variant}>{style.label}</Badge>
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{suggestion.detail}</p>
    </li>
  )
}

/**
 * What the merchant's campaigns cost per completed task, and what could work better. It shows what was paid
 * out, not what it earned the business, because the platform cannot see sales; the note says so.
 */
export function InsightsPanel({ merchantId }: { merchantId: string }) {
  const { data, isLoading, isError, refetch } = useMerchantInsightsQuery(merchantId)

  return (
    <section className="card mt-6 p-5" aria-label="Campaign insights">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[14px] font-semibold text-slate-800">Campaign insights</p>
          {data && <p className="text-[12px] text-slate-400">Last {data.windowDays} days, and anything live now</p>}
        </div>
        <Link to={ROUTES.CAMPAIGNS} className="btn-secondary btn-sm">
          Plan a campaign
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : isError || !data ? (
        <p className="mt-4 text-sm text-slate-500">
          Could not load your insights.{' '}
          <button className="font-medium text-primary-700 underline" onClick={() => refetch()}>
            Try again
          </button>
        </p>
      ) : (
        <>
          {data.summary.campaignsAnalysed > 0 && (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Tile label="Paid to participants" value={formatCurrency(data.summary.rewardsPaid)} />
                <Tile label="Completed tasks" value={String(data.summary.completions)} />
                <Tile
                  label="Cost per completed task"
                  value={data.summary.costPerCompletion === null ? '—' : formatCurrency(data.summary.costPerCompletion)}
                />
                <Tile
                  label="People who finish"
                  value={data.summary.joins > 0 ? percent(data.summary.completionRate) : '—'}
                  hint={data.summary.joins > 0 ? `of ${data.summary.joins} who joined` : undefined}
                />
              </div>
              <p className="mt-2 text-[12px] text-slate-400">
                Estimated platform fee ({Math.round(data.summary.platformFeeRate * 10000) / 100}%):{' '}
                {formatCurrency(data.summary.estimatedPlatformFee)}, billed separately when you settle.
              </p>

              {data.byType.some((t) => t.completions > 0) && (
                <div className="mt-4 overflow-x-auto">
                  <table className="table">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="table-th">Campaign type</th>
                        <th className="table-th">Completed</th>
                        <th className="table-th">Cost per task</th>
                        <th className="table-th">Finish rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {data.byType.map((row) => (
                        <tr key={row.campaignType} className="table-tr">
                          <td className="table-td">{CAMPAIGN_TYPE_LABELS[row.campaignType] ?? row.campaignType}</td>
                          <td className="table-td">{row.completions}</td>
                          <td className="table-td">{row.costPerCompletion === null ? '—' : formatCurrency(row.costPerCompletion)}</td>
                          <td className="table-td">{row.joins > 0 ? percent(row.completionRate) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {data.suggestions.length > 0 && (
            <ul className="mt-4 space-y-2" aria-label="Suggestions">
              {data.suggestions.map((suggestion) => (
                <Suggestion key={`${suggestion.code}-${suggestion.campaignId ?? 'all'}`} suggestion={suggestion} />
              ))}
            </ul>
          )}

          <p className="mt-4 text-[12px] text-slate-400">{data.note}</p>
        </>
      )}
    </section>
  )
}
