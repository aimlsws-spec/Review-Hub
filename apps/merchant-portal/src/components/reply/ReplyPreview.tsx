import { memo, useMemo } from 'react'

interface ReplyPreviewProps {
  text:   string
  onBack: () => void
}

export const ReplyPreview = memo(function ReplyPreview({ text, onBack }: ReplyPreviewProps) {
  const now = useMemo(
    () =>
      new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }),
    [],
  )

  return (
    <div className="rounded-xl border border-primary-100 bg-primary-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary-600">
          Reply Preview
        </p>
        <button
          type="button"
          onClick={onBack}
          className="text-[11px] text-gray-400 underline underline-offset-2 transition-colors duration-150 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
          aria-label="Go back to edit reply"
        >
          Edit
        </button>
      </div>

      <div className="flex items-start gap-3">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-[11px] font-bold text-white"
          aria-hidden="true"
        >
          M
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-900">Your Business</span>
            <span className="text-[10px] text-gray-400">{now}</span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    </div>
  )
})
