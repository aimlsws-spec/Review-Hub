const TEMPLATES = [
  'Thank you for your feedback!',
  'We appreciate your support.',
  "We're sorry about your experience.",
  "We'd love to make things right.",
  'Thank you for visiting us!',
]

interface ReplyTemplatesProps {
  onInsert: (text: string) => void
}

export function ReplyTemplates({ onInsert }: ReplyTemplatesProps) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
        Quick Templates
      </p>
      <div className="flex flex-wrap gap-1.5" role="list" aria-label="Quick reply templates">
        {TEMPLATES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onInsert(t)}
            role="listitem"
            className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 transition-all duration-150 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 active:scale-95"
            aria-label={`Insert template: ${t}`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}
