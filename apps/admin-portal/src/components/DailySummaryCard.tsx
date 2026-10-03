import { useDailySummary } from '@/hooks/useDashboardStats'

/** Yesterday's platform summary, written each morning by the daily-admin-summary job. Hidden until the first one exists. */
export function DailySummaryCard() {
  const { data } = useDailySummary()
  const summary = data?.data.data
  if (!summary) return null

  return (
    <section className="card mt-6 p-5" aria-label="Daily summary">
      <h2 className="section-title">Yesterday at a glance</h2>
      <p className="section-subtitle mt-1">Also emailed to admins each morning.</p>
      <div className="mt-3 space-y-1 text-sm text-gray-700">
        {summary.text.split('\n').map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </section>
  )
}
