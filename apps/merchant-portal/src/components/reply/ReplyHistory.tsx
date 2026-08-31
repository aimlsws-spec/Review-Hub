import { memo } from 'react'

import { cn } from '@/utils'

export interface ReplyHistoryEntry {
  text:      string
  timestamp: string
  type:      'original' | 'edited'
}

interface ReplyHistoryProps {
  entries: ReplyHistoryEntry[]
}

export const ReplyHistory = memo(function ReplyHistory({ entries }: ReplyHistoryProps) {
  if (entries.length <= 1) return null

  return (
    <div>
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
        Edit History
      </p>
      <div className="relative space-y-3 pl-5">
        <div
          className="absolute bottom-1 left-[8px] top-1 w-px bg-gray-100"
          aria-hidden="true"
        />
        {entries.map((entry, i) => (
          <div key={i} className="relative flex items-start gap-3">
            <div
              className={cn(
                'relative z-10 mt-1 h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 border-white',
                entry.type === 'original' ? 'bg-gray-300' : 'bg-primary-400',
              )}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-gray-600">
                  {entry.type === 'original' ? 'Original Reply' : 'Edited Reply'}
                </span>
                <span className="text-[10px] text-gray-400">{entry.timestamp}</span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-500">
                {entry.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})
