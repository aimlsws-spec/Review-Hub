import { memo } from 'react'
import { Badge } from '@reviewhub/shared-ui'

export interface PublishedReply {
  text:        string
  publishedAt: string
  editedAt?:   string
}

interface ReplyCardProps {
  reply:     PublishedReply
  onEdit:    () => void
  onDelete?: () => void
}

export const ReplyCard = memo(function ReplyCard({ reply, onEdit, onDelete }: ReplyCardProps) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white"
            aria-hidden="true"
          >
            M
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-900">Your Business</span>
              {reply.editedAt && (
                <Badge variant="gray" className="text-[10px]">Edited</Badge>
              )}
            </div>
            <p className="text-[10px] text-gray-400">
              {reply.editedAt
                ? `Edited ${reply.editedAt}`
                : `Published ${reply.publishedAt}`}
            </p>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-1.5 text-gray-400 transition-colors duration-150 hover:bg-emerald-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
            aria-label="Edit reply"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg p-1.5 text-gray-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500"
              aria-label="Delete reply"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{reply.text}</p>
    </div>
  )
})
