import type { WordingCheck } from '@/types'

/**
 * Tells a merchant, while they write, when their wording asks for a particular rating. It explains the rule in
 * plain words, because the point is honest feedback rather than a blocked form.
 */
export function WordingNotice({ check }: { check: WordingCheck | undefined }) {
  if (!check || check.findings.length === 0) return null

  return (
    <div
      role={check.allowed ? 'status' : 'alert'}
      className={`rounded-lg border p-3 text-sm ${check.allowed ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-800'}`}
    >
      <p className="font-medium">
        {check.allowed ? 'A few words may need a second look' : 'This wording needs to change before you can submit'}
      </p>
      <p className="mt-1">Rewards are for honest feedback, good or bad, and never depend on the rating a customer gives.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {check.findings.map((finding, index) => (
          <li key={`${finding.rule}-${finding.field}-${index}`}>
            <span className="italic">“{finding.excerpt}”</span> in {finding.field}
          </li>
        ))}
      </ul>
    </div>
  )
}
