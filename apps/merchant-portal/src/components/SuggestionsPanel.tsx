import { Badge } from '@reviewhub/shared-ui'

import { useDismissSuggestionMutation, useSuggestionsQuery } from '@/hooks/useInsights'
import type { InsightSeverity } from '@/types'
import { formatDate } from '@/utils'

const SEVERITY_STYLE: Record<InsightSeverity, { label: string; variant: 'red' | 'yellow' | 'blue' }> = {
  WARNING: { label: 'Needs attention', variant: 'red' },
  OPPORTUNITY: { label: 'Could be better', variant: 'yellow' },
  INFO: { label: 'Good to know', variant: 'blue' },
}

/**
 * What the daily optimizer noticed about this merchant's running campaigns. Each one stays until dismissed; the same
 * advice is not repeated within a week. Hidden when there is nothing open.
 */
export function SuggestionsPanel({ merchantId }: { merchantId: string }) {
  const { data } = useSuggestionsQuery(merchantId)
  const dismiss = useDismissSuggestionMutation(merchantId)
  const suggestions = data ?? []
  if (suggestions.length === 0) return null

  return (
    <section className="card mt-6 p-5" aria-label="Suggestions">
      <h2 className="text-sm font-semibold text-slate-900">Suggestions from your daily campaign check</h2>
      <ul className="mt-3 space-y-2">
        {suggestions.map((suggestion) => {
          const style = SEVERITY_STYLE[suggestion.severity as InsightSeverity] ?? SEVERITY_STYLE.INFO
          return (
            <li key={suggestion.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">{suggestion.title}</p>
                <Badge variant={style.variant}>{style.label}</Badge>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{suggestion.detail}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>{formatDate(suggestion.createdAt)}</span>
                <button
                  type="button"
                  className="font-medium text-slate-500 hover:text-slate-700"
                  disabled={dismiss.isPending}
                  onClick={() => dismiss.mutate(suggestion.id)}
                >
                  Dismiss
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
