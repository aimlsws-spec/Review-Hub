import { EmptyState, ErrorState, PageHeader, Skeleton } from '@reviewhub/shared-ui'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'

const RANGES = [7, 30, 90]

const FEATURE_LABELS: Record<string, string> = {
  TEXT_SUGGESTION: 'Text suggestions',
  REVIEW_DRAFTS: 'Review drafts',
  CAPTIONS: 'Captions and stories',
  KYC_OCR: 'KYC document reading',
  SUBMISSION_VERIFICATION: 'Submission verification',
  ADMIN_SUMMARY: 'Daily admin summary',
}

const shortDay = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })

/**
 * How the platform's AI is doing: calls per day split into answered, fallback and failed, and per feature the error
 * and fallback rates, 95th-percentile latency, tokens and cost. Tokens are estimated from text size; cost needs prices
 * set on the AI provider.
 */
export default function AiMonitoringPage() {
  const [days, setDays] = useState(30)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...QUERY_KEYS.AI_MONITORING, days],
    queryFn: () => adminApi.getAiMonitoring(days),
  })
  const monitoring = data?.data.data
  const chart = monitoring?.days.map((day) => ({ ...day, answered: day.calls - day.failed - day.fallback }))

  return (
    <div>
      <PageHeader title="AI monitoring" subtitle="Every AI call the platform makes. Prompts and answers are never stored." />

      <div className="mb-4 flex gap-1" role="group" aria-label="Range">
        {RANGES.map((range) => (
          <button
            key={range}
            type="button"
            aria-pressed={days === range}
            className={days === range ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setDays(range)}
          >
            {range} days
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError || !monitoring ? (
        <ErrorState onRetry={() => refetch()} />
      ) : monitoring.totals.calls === 0 ? (
        <EmptyState title="No AI calls yet" description={`Nothing in the last ${days} days.`} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              ['Calls', monitoring.totals.calls.toLocaleString('en-IN')],
              ['Errors', `${monitoring.totals.errorRate}%`],
              ['Fallbacks', `${monitoring.totals.fallbackRate}%`],
              ['Estimated cost', `₹${monitoring.totals.cost.toLocaleString('en-IN')}`],
            ].map(([label, value]) => (
              <div key={label} className="card p-4">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          <section className="card p-5" aria-label="Calls per day">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Calls per day</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tickFormatter={shortDay} fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip labelFormatter={(day) => shortDay(String(day))} />
                  <Legend />
                  <Bar dataKey="answered" name="Answered by the model" stackId="calls" fill="#16A34A" />
                  <Bar dataKey="fallback" name="Fallback template" stackId="calls" fill="#EAB308" />
                  <Bar dataKey="failed" name="Failed" stackId="calls" fill="#DC2626" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="table-container">
            <table className="table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">Feature</th>
                  <th className="table-th text-right">Calls</th>
                  <th className="table-th text-right">Errors</th>
                  <th className="table-th text-right">Fallbacks</th>
                  <th className="table-th text-right">p95 latency</th>
                  <th className="table-th text-right">Tokens (est.)</th>
                  <th className="table-th text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {monitoring.features.map((row) => (
                  <tr key={row.feature} className="table-tr">
                    <td className="table-td font-medium text-gray-900">{FEATURE_LABELS[row.feature] ?? row.feature}</td>
                    <td className="table-td text-right">{row.calls.toLocaleString('en-IN')}</td>
                    <td className="table-td text-right">{row.errorRate}%</td>
                    <td className="table-td text-right">{row.fallbackRate}%</td>
                    <td className="table-td text-right">{(row.p95LatencyMs / 1000).toFixed(1)} s</td>
                    <td className="table-td text-right">{row.tokens.toLocaleString('en-IN')}</td>
                    <td className="table-td text-right">₹{row.cost.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
