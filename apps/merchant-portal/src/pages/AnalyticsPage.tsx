import { EmptyState, ErrorState, PageHeader, Select, Skeleton, StatusBadge } from '@reviewhub/shared-ui'
import { useState } from 'react'

import { useAnalyticsOverviewQuery } from '@/hooks/useAnalytics'
import { useAuthStore } from '@/stores/auth.store'
import type { AnalyticsOverview } from '@/types'
import { cn, formatCurrency } from '@/utils'

const PERIOD_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
]

type Metric = 'joins' | 'rewardsPaid'

const METRICS: { value: Metric; label: string }[] = [
  { value: 'joins', label: 'People who joined' },
  { value: 'rewardsPaid', label: 'Rewards paid' },
]

const percent = (fraction: number) => `${(fraction * 100).toFixed(1)}%`
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** 2026-09-21 as "21 Sep". Written out, not left to the browser's locale, so it reads the same everywhere. */
const shortDate = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5" role="region" aria-label={label}>
      <p className="text-[12.5px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1.5 text-[26px] font-bold leading-none tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-[11.5px] text-slate-400">{hint}</p>}
    </div>
  )
}

/** One bar for each day. Every bar says what it shows, so the chart can be read without seeing it. */
function DailyBars({ daily, metric }: { daily: AnalyticsOverview['daily']; metric: Metric }) {
  const max = Math.max(1, ...daily.map((day) => day[metric]))
  const describe = (day: AnalyticsOverview['daily'][number]) =>
    metric === 'joins'
      ? `${shortDate(day.date)}: ${day.joins} joined`
      : `${shortDate(day.date)}: ${formatCurrency(day.rewardsPaid)} paid for ${day.completions} completed ${day.completions === 1 ? 'task' : 'tasks'}`

  return (
    <div role="img" aria-label={`${METRICS.find((m) => m.value === metric)?.label}, day by day`} className="flex h-40 items-end gap-[2px]">
      {daily.map((day) => (
        <div key={day.date} className="flex h-full min-w-0 flex-1 items-end" title={describe(day)}>
          <div
            data-testid="bar"
            aria-label={describe(day)}
            className={cn('w-full rounded-t', day[metric] > 0 ? 'bg-primary-500' : 'bg-slate-100')}
            style={{ height: day[metric] > 0 ? `${Math.max(4, (day[metric] / max) * 100)}%` : '2px' }}
          />
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const merchantId = useAuthStore((s) => s.merchant?.id)
  const [days, setDays] = useState(30)
  const [metric, setMetric] = useState<Metric>('joins')

  const { data, isLoading, isError, refetch } = useAnalyticsOverviewQuery(merchantId, days)

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="How your campaigns are doing, counted from the people who joined and the rewards actually paid."
        primaryAction={
          <div className="w-44">
            <Select label="Period" options={PERIOD_OPTIONS} value={String(days)} onChange={(e) => setDays(Number(e.target.value))} />
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : isError || !data ? (
        <ErrorState onRetry={() => refetch()} />
      ) : data.totals.campaigns === 0 ? (
        <EmptyState title="No campaigns yet" description="Once you run a campaign, how it is doing shows up here." />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="People who joined" value={String(data.totals.joins)} hint={`${data.totals.activeCampaigns} of ${data.totals.campaigns} campaigns running`} />
            <StatCard label="Finished the campaign" value={String(data.totals.finished)} hint={`${percent(data.totals.completionRate)} of those who joined`} />
            <StatCard label="Rewards paid" value={formatCurrency(data.totals.rewardsPaid)} hint={`${data.totals.completions} completed ${data.totals.completions === 1 ? 'task' : 'tasks'}`} />
            <StatCard
              label="Cost per completed task"
              value={data.totals.costPerCompletion === null ? '—' : formatCurrency(data.totals.costPerCompletion)}
              hint={data.totals.costPerCompletion === null ? 'Nothing completed yet' : 'What each completed task cost you'}
            />
          </div>

          <section className="card p-5" aria-label="Day by day">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Day by day</h2>
              <div className="flex gap-1" role="group" aria-label="Show">
                {METRICS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={metric === value}
                    onClick={() => setMetric(value)}
                    className={cn('rounded-md px-3 py-1.5 text-xs font-medium', metric === value ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <DailyBars daily={data.daily} metric={metric} />
            <div className="mt-1 flex justify-between text-[11px] text-slate-400">
              <span>{shortDate(data.period.from)}</span>
              <span>{shortDate(data.period.to)}</span>
            </div>
          </section>

          <section aria-label="Campaigns">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Each campaign</h2>
            <div className="table-container">
              <table className="table">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="table-th">Campaign</th>
                    <th className="table-th">Joined</th>
                    <th className="table-th">Finished</th>
                    <th className="table-th">Rewards paid</th>
                    <th className="table-th">Per task</th>
                    <th className="table-th">Budget used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.campaigns.map((campaign) => (
                    <tr key={campaign.id} className="table-tr">
                      <td className="table-td">
                        <p className="font-medium text-slate-900">{campaign.title}</p>
                        <StatusBadge status={campaign.status} />
                      </td>
                      <td className="table-td text-slate-700">{campaign.joins}</td>
                      <td className="table-td text-slate-700">
                        {campaign.finished}
                        <span className="ml-1 text-xs text-slate-400">({percent(campaign.completionRate)})</span>
                      </td>
                      <td className="table-td text-slate-700">{formatCurrency(campaign.rewardsPaid)}</td>
                      <td className="table-td text-slate-700">{campaign.costPerCompletion === null ? '—' : formatCurrency(campaign.costPerCompletion)}</td>
                      <td className="table-td text-slate-700">
                        {formatCurrency(campaign.spentBudget)}
                        <span className="ml-1 text-xs text-slate-400">of {formatCurrency(campaign.totalBudget)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
