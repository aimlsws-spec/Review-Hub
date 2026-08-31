import { Badge } from '@reviewhub/shared-ui'
import { memo } from 'react'

import type { ApiReviewSource, ApiReviewStatus } from '@/types/review'
import { cn } from '@/utils'

// ─── Types ────────────────────────────────────────────────────────────────────


export type ReviewStatus = ApiReviewStatus
export type ReviewSource = ApiReviewSource

export interface Review {
  id: string
  customerName: string
  customerInitials: string
  avatarBg: string
  source: ReviewSource
  rating: number
  title: string
  body: string
  date: string
  status: ReviewStatus
  reply?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const SOURCE_BADGE: Record<ReviewSource, { variant: 'blue' | 'purple' | 'gray'; label: string }> = {
  GOOGLE:      { variant: 'blue',   label: 'Google'      },
  FACEBOOK:    { variant: 'purple', label: 'Facebook'     },
  ZOMATO:      { variant: 'gray',   label: 'Zomato'       },
  SWIGGY:      { variant: 'gray',   label: 'Swiggy'       },
  TRIPADVISOR: { variant: 'gray',   label: 'TripAdvisor'  },
  WEBSITE:     { variant: 'gray',   label: 'Website'      },
  OTHER:       { variant: 'gray',   label: 'Other'        },
}

const STATUS_MAP: Record<ReviewStatus, { variant: 'yellow' | 'green' | 'red' | 'gray'; label: string }> = {
  PENDING:  { variant: 'yellow', label: 'Pending'  },
  REPLIED:  { variant: 'green',  label: 'Replied'  },
  FLAGGED:  { variant: 'red',    label: 'Flagged'  },
  RESOLVED: { variant: 'gray',   label: 'Resolved' },
}

// ─── StarRating ───────────────────────────────────────────────────────────────

export function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${rating} out of 5 stars`}
      role="img"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={cn(sz, i < rating ? 'text-amber-400' : 'text-gray-200')}
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  )
}

// ─── ReviewCard ───────────────────────────────────────────────────────────────

interface ReviewCardProps {
  review: Review
  onViewDetails: (review: Review) => void
}

export const ReviewCard = memo(function ReviewCard({ review, onViewDetails }: ReviewCardProps) {
  const src = SOURCE_BADGE[review.source]
  const st  = STATUS_MAP[review.status]

  return (
    <article
      className="card p-5 transition-all duration-200 hover:shadow-card-hover hover:-translate-y-px"
      role="listitem"
      aria-label={`Review by ${review.customerName}, ${review.rating} stars, ${st.label}`}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 select-none items-center justify-center rounded-full text-sm font-semibold',
            review.avatarBg,
          )}
          aria-hidden="true"
        >
          {review.customerInitials}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          {/* Row 1: name + badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{review.customerName}</span>
            <Badge variant={src.variant}>{src.label}</Badge>
            <Badge variant={st.variant}>{st.label}</Badge>
          </div>

          {/* Stars + date */}
          <div className="mt-1.5 flex items-center gap-2">
            <StarRating rating={review.rating} />
            <span className="text-[11px] text-gray-400">{review.date}</span>
          </div>

          {/* Title */}
          <p className="mt-2 text-sm font-semibold text-gray-800 leading-snug">{review.title}</p>

          {/* Body */}
          <p className="mt-1 text-sm leading-relaxed text-gray-500 line-clamp-2">{review.body}</p>

          {/* Reply preview */}
          {review.reply && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <svg className="mt-0.5 h-3 w-3 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <p className="text-xs text-gray-500 line-clamp-1">{review.reply}</p>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={() => onViewDetails(review)}
            className="btn-secondary btn-sm whitespace-nowrap"
            aria-label={`View details for review by ${review.customerName}`}
          >
            View Details
          </button>
        </div>
      </div>
    </article>
  )
})
