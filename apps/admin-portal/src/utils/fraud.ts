import { FRAUD_SIGNAL_LABELS } from '@/constants'
import type { FraudFlag } from '@/types'

/** A short label for what raised the flag, or null for flags raised before the type was recorded. */
export function fraudSignalLabel(flag: Pick<FraudFlag, 'type'>): string | null {
  return flag.type ? (FRAUD_SIGNAL_LABELS[flag.type] ?? flag.type) : null
}

const asString = (value: unknown): string | undefined => (typeof value === 'string' && value ? value : undefined)
const asNumber = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined)

/**
 * A line of extra detail for a reviewer, taken from the flag's evidence, in plain words.
 * Returns null when there is nothing more to say. Never throws on unexpected metadata, because the shape
 * depends on which check raised the flag and older flags have none.
 */
export function fraudSignalDetail(flag: Pick<FraudFlag, 'type' | 'metadata'>): string | null {
  const meta = flag.metadata
  if (!meta || typeof meta !== 'object') return null

  if (flag.type === 'DUPLICATE_SUBMISSION') {
    const matched = asString(meta.matchedSubmissionId)
    const kind = asString(meta.kind)
    const bits = asNumber(meta.differingBits)
    const how =
      kind === 'exact' ? 'Identical file' : bits !== undefined ? `Looks the same (${bits} of 64 bits differ)` : 'Looks the same'
    return matched ? `${how} as submission ${matched.slice(0, 8)}` : how
  }

  if (flag.type === 'MULTIPLE_ACCOUNTS') {
    const linked = Array.isArray(meta.linkedUserIds) ? meta.linkedUserIds.length : 0
    return linked > 0 ? `${linked} linked ${linked === 1 ? 'account' : 'accounts'} in the same campaign` : null
  }

  if (flag.type === 'VPN_DETECTED') {
    const sources = Array.isArray(meta.sources) ? meta.sources.filter((s): s is string => typeof s === 'string') : []
    const ip = asString(meta.ip)
    if (!ip && sources.length === 0) return null
    return [ip, sources.length > 0 ? `listed in ${sources.join(', ')}` : null].filter(Boolean).join(' · ')
  }

  return null
}
