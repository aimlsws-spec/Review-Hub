import { Badge } from '@reviewhub/shared-ui'
import { memo, useEffect, useRef, useState } from 'react'

import { ReplyCard, type PublishedReply } from '@/components/reply/ReplyCard'
import { ReplyComposer } from '@/components/reply/ReplyComposer'
import { StarRating, SOURCE_BADGE, type Review } from '@/components/ReviewCard'
import { cn } from '@/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sentimentVariant(rating: number): { variant: 'green' | 'yellow' | 'red'; label: string } {
  if (rating >= 4) return { variant: 'green',  label: 'Positive' }
  if (rating === 3) return { variant: 'yellow', label: 'Neutral'  }
  return                   { variant: 'red',    label: 'Negative' }
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
// Only real, known events — no fabricated "Merchant Viewed" step, since there's
// no view-tracking behind this drawer.

interface TimelineEvent { label: string; time: string; icon: React.ReactNode; color: string }

function getTimeline(review: Review): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      label: 'Review Submitted', time: review.date, color: 'bg-blue-500',
      icon: <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
    },
  ]
  if (review.reply) {
    events.push({
      label: 'Reply Sent', time: 'After review', color: 'bg-emerald-500',
      icon: <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>,
    })
  }
  if (review.status === 'FLAGGED') {
    events.push({
      label: 'Flagged for Review', time: 'Recently', color: 'bg-red-500',
      icon: <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>,
    })
  }
  if (review.status === 'RESOLVED') {
    events.push({
      label: 'Resolved', time: 'Final', color: 'bg-primary-600',
      icon: <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    })
  }
  return events
}

// ─── Section / InfoRow ────────────────────────────────────────────────────────

const Section = memo(function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
        {title}
      </h3>
      {children}
    </div>
  )
})

const InfoRow = memo(function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5">
      <span className="flex-shrink-0 text-xs text-gray-500">{label}</span>
      <span className="text-right text-xs font-medium text-gray-900">{value}</span>
    </div>
  )
})

// ─── Reply Management ─────────────────────────────────────────────────────────
// The backend keeps one current reply per review, not a version history — Edit
// just re-submits, replacing the stored text. "Save draft" is a local-only
// convenience (never claimed to be server-persisted) so it stays client-side.

function ReplyManagement({ review, onReply }: { review: Review; onReply: (text: string) => Promise<void> }) {
  const [mode, setMode]             = useState<'view' | 'compose' | 'edit'>(review.reply ? 'view' : 'compose')
  const [draft, setDraft]           = useState('')
  const [draftSaved, setDraftSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setMode(review.reply ? 'view' : 'compose')
    setDraft('')
    setDraftSaved(false)
  }, [review.id, review.reply])

  async function handlePublish(text: string) {
    setSubmitting(true)
    try {
      await onReply(text)
      setMode('view')
    } finally {
      setSubmitting(false)
    }
  }

  function handleSaveDraft(text: string) {
    setDraft(text)
    setDraftSaved(true)
    setTimeout(() => setDraftSaved(false), 2000)
  }

  const published: PublishedReply | null = review.reply
    ? { text: review.reply, publishedAt: 'Sent' }
    : null

  return (
    <>
      {published && mode === 'view' && (
        <ReplyCard reply={published} onEdit={() => setMode('edit')} />
      )}

      {(mode === 'compose' || mode === 'edit') && (
        <div className="space-y-3">
          {draftSaved && (
            <p role="status" className="animate-fade-in text-xs font-medium text-emerald-600">
              ✓ Draft saved
            </p>
          )}
          <ReplyComposer
            reviewerName={review.customerName}
            initialValue={mode === 'edit' ? (published?.text ?? draft) : draft}
            onPublish={handlePublish}
            onSaveDraft={handleSaveDraft}
            onCancel={() => setMode(published ? 'view' : 'compose')}
            disabled={submitting}
          />
        </div>
      )}
    </>
  )
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

interface ReviewDetailDrawerProps {
  review: Review | null
  onClose: () => void
  onReply: (reviewId: string, text: string) => Promise<void>
  onResolve: (reviewId: string) => Promise<void>
}

export function ReviewDetailDrawer({ review, onClose, onReply, onResolve }: ReviewDetailDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const isOpen   = review !== null

  // ESC + scroll lock
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    setTimeout(() => closeRef.current?.focus(), 50)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Focus trap
  useEffect(() => {
    if (!isOpen || !panelRef.current) return
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last  = focusable[focusable.length - 1]
    const trap  = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', trap)
    return () => document.removeEventListener('keydown', trap)
  }, [isOpen])

  const sentiment = review ? sentimentVariant(review.rating) : null
  const timeline  = review ? getTimeline(review) : []
  const [resolving, setResolving] = useState(false)

  async function handleResolve() {
    if (!review) return
    setResolving(true)
    try {
      await onResolve(review.id)
    } finally {
      setResolving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-[250ms]',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={review ? `Review details for ${review.customerName}` : 'Review details'}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-float-card',
          'sm:w-[480px] lg:w-[520px]',
          'transition-transform duration-[250ms] ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {!review ? null : (
          <>
            {/* ── Header ── */}
            <div className="flex-shrink-0 border-b border-gray-100 px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={cn(
                      'flex h-11 w-11 flex-shrink-0 select-none items-center justify-center rounded-full text-sm font-semibold',
                      review.avatarBg,
                    )}
                    aria-hidden="true"
                  >
                    {review.customerInitials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-sm font-semibold text-gray-900">
                        {review.customerName}
                      </h2>
                      <Badge variant={SOURCE_BADGE[review.source].variant}>{SOURCE_BADGE[review.source].label}</Badge>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <StarRating rating={review.rating} size="sm" />
                      <span className="text-[11px] text-gray-400">{review.date}</span>
                    </div>
                  </div>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={onClose}
                  className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
                  aria-label="Close review details"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">

              {/* 1 — Customer Information */}
              <Section title="Customer Information">
                <div className="card divide-y divide-gray-50 px-4">
                  <InfoRow label="Customer Name"   value={review.customerName} />
                  <InfoRow label="Review Platform" value={<Badge variant={SOURCE_BADGE[review.source].variant}>{SOURCE_BADGE[review.source].label}</Badge>} />
                  <InfoRow label="Review Date"     value={review.date} />
                </div>
              </Section>

              {/* 2 — Review Details */}
              <Section title="Review Details">
                <div className="card divide-y divide-gray-50 px-4">
                  <InfoRow
                    label="Review Title"
                    value={<span className="max-w-[220px] text-right leading-snug">{review.title}</span>}
                  />
                  <div className="py-3">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                      Full Review
                    </p>
                    <p className="text-sm leading-relaxed text-gray-700">{review.body}</p>
                  </div>
                  <InfoRow
                    label="Rating"
                    value={
                      <span className="flex items-center gap-1.5">
                        <StarRating rating={review.rating} size="sm" />
                        <span className="text-xs text-gray-500">{review.rating}/5</span>
                      </span>
                    }
                  />
                  <InfoRow
                    label="Sentiment"
                    value={sentiment && <Badge variant={sentiment.variant}>{sentiment.label}</Badge>}
                  />
                  <InfoRow
                    label="Review ID"
                    value={<span className="font-mono text-[11px] text-gray-400">#{review.id}</span>}
                  />
                </div>
              </Section>

              {/* 3 — Merchant Reply */}
              <Section title="Merchant Reply">
                <ReplyManagement review={review} onReply={(text) => onReply(review.id, text)} />
              </Section>

              {/* 4 — Timeline */}
              <Section title="Timeline">
                <div className="relative pl-5">
                  <div
                    className="absolute bottom-2 left-[9px] top-2 w-px bg-gray-100"
                    aria-hidden="true"
                  />
                  <ol className="space-y-4">
                    {timeline.map((event, i) => (
                      <li key={i} className="relative flex items-start gap-3">
                        <div
                          className={cn(
                            'relative z-10 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full',
                            event.color,
                          )}
                          aria-hidden="true"
                        >
                          {event.icon}
                        </div>
                        <div className="-mt-0.5">
                          <p className="text-xs font-medium text-gray-800">{event.label}</p>
                          <p className="text-[11px] text-gray-400">{event.time}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </Section>

            </div>

            {/* ── Footer ── */}
            <div className="flex-shrink-0 border-t border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResolve}
                  disabled={resolving || review.status === 'RESOLVED'}
                  className="btn-secondary btn-sm flex-1"
                  aria-label="Mark this review as resolved"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {review.status === 'RESOLVED' ? 'Resolved' : resolving ? 'Resolving…' : 'Mark Resolved'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-ghost btn-sm"
                  aria-label="Close review details drawer"
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
