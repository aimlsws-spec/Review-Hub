import { memo, useMemo, useState } from 'react'

import { cn } from '@/utils'

function getSuggestions(reviewerName: string): string[] {
  const first = reviewerName.split(' ')[0]
  return [
    `Thank you so much for your kind words, ${first}! We're thrilled to hear you had a great experience with us. Your feedback means the world to our team, and we look forward to serving you again soon.`,
    `Hi ${first}, we truly appreciate you taking the time to share your experience. It's feedback like yours that helps us continue to improve and deliver the best service possible. We hope to see you again!`,
    `Dear ${first}, thank you for your valuable review. We're committed to providing every customer with an exceptional experience, and we're glad we could meet your expectations. Please don't hesitate to reach out if there's anything we can do for you.`,
  ]
}

interface AISuggestionsProps {
  reviewerName: string
  onUse: (text: string) => void
}

export const AISuggestions = memo(function AISuggestions({ reviewerName, onUse }: AISuggestionsProps) {
  const [open, setOpen]     = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  const suggestions         = useMemo(() => getSuggestions(reviewerName), [reviewerName])

  function handleCopy(text: string, idx: number) {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(idx)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
        aria-expanded={open}
        aria-controls="ai-suggestions-panel"
      >
        <span className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary-100" aria-hidden="true">
            <svg className="h-3 w-3 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </span>
          <span className="text-xs font-semibold text-gray-700">AI Suggested Replies</span>
          <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700">
            3
          </span>
        </span>
        <svg
          className={cn('h-4 w-4 text-gray-400 transition-transform duration-150', open && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          id="ai-suggestions-panel"
          className="space-y-2 border-t border-gray-200 px-4 pb-3 pt-2.5"
        >
          {suggestions.map((s, i) => (
            <div key={i} className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-xs leading-relaxed text-gray-600 line-clamp-3">{s}</p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onUse(s)}
                  className="btn-primary btn-sm px-2.5 py-1 text-[11px]"
                  aria-label={`Use AI suggestion ${i + 1}`}
                >
                  Use Reply
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(s, i)}
                  className="btn-ghost btn-sm px-2.5 py-1 text-[11px]"
                  aria-label={copied === i ? 'Copied to clipboard' : `Copy AI suggestion ${i + 1}`}
                >
                  {copied === i ? (
                    <span className="text-emerald-600">✓ Copied</span>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})
