import type { WordingFlag } from '@/types'

/** True when at least one flag stops the campaign being approved. */
export function hasBlockingFlag(flags: WordingFlag[] | undefined): boolean {
  return (flags ?? []).some((flag) => flag.severity === 'BLOCK')
}

/**
 * The honest-feedback wording problems found in a campaign, each with the words and where they were written.
 * Blocking flags are red and stop approval on the server; the others are for the moderator's judgement.
 */
export default function PolicyFlags({ flags }: { flags: WordingFlag[] | undefined }) {
  if (!flags || flags.length === 0) return null

  return (
    <ul className="mt-2 space-y-1" aria-label="Wording flags">
      {flags.map((flag, index) => {
        const blocking = flag.severity === 'BLOCK'
        return (
          <li
            key={`${flag.rule}-${flag.field}-${index}`}
            className={`rounded px-2 py-1 text-xs ${blocking ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}
          >
            <span className="font-semibold">{blocking ? 'Blocks approval' : 'Check wording'}</span>
            {' · '}
            <span className="italic">“{flag.excerpt}”</span> in {flag.field}. {flag.message}
          </li>
        )
      })}
    </ul>
  )
}
