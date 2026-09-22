import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { merchantApi } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'
import type { WordingCheck } from '@/types'

const TYPING_PAUSE_MS = 600
const MIN_CHARACTERS = 5

interface CampaignWording {
  title?: string
  shortDescription?: string
  description?: string
}

/** A value that follows `value` only once it has stopped changing for `delayMs`. */
function useDebounced<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return settled
}

/**
 * Checks campaign wording against the honest-feedback policy while the merchant writes it, so a problem is seen
 * before they try to submit. The check pauses while they type, and a failed check is silent: the server checks
 * again on submit, so this is only a heads-up and never a gate.
 */
export function useWordingCheck(merchantId: string | undefined, wording: CampaignWording): WordingCheck | undefined {
  const title = (wording.title ?? '').trim()
  const shortDescription = (wording.shortDescription ?? '').trim()
  const description = (wording.description ?? '').trim()
  const key = JSON.stringify([title, shortDescription, description])
  const settledKey = useDebounced(key, TYPING_PAUSE_MS)

  const [settledTitle, settledShort, settledDescription] = JSON.parse(settledKey) as string[]
  const hasText = [settledTitle, settledShort, settledDescription].some((text) => text.length >= MIN_CHARACTERS)

  const { data } = useQuery({
    queryKey: [...QUERY_KEYS.CAMPAIGNS, 'wording', settledKey],
    queryFn: async () =>
      (
        await merchantApi.checkCampaignWording(merchantId as string, {
          title: settledTitle,
          shortDescription: settledShort,
          description: settledDescription,
        })
      ).data.data,
    enabled: !!merchantId && hasText,
    staleTime: 60_000,
    retry: false,
  })

  return hasText ? data : undefined
}
