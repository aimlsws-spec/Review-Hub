import { Badge } from './Badge'

const LEVELS = [
  { label: 'Not verified', hint: 'The owner’s mobile number is not verified yet.', variant: 'gray' },
  { label: 'L1 · Mobile verified', hint: 'Next: verify the owner’s email address.', variant: 'blue' },
  { label: 'L2 · Email verified', hint: 'Next: get the business documents approved.', variant: 'blue' },
  { label: 'L3 · Business verified', hint: 'Next: a Premium plan gives L4.', variant: 'green' },
  { label: 'L4 · Premium', hint: 'Fully verified, on a Premium plan.', variant: 'purple' },
] as const

/**
 * A merchant's verification level (L1 mobile, L2 email, L3 business documents, L4 Premium plan), as the server works
 * it out. Shown in both portals; the hint says what the next level needs.
 */
export function VerificationLevelBadge({ level }: { level: number | undefined | null }) {
  const entry = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, level ?? 0))]
  return (
    <span title={entry.hint}>
      <Badge variant={entry.variant}>{entry.label}</Badge>
    </span>
  )
}
