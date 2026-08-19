import { memo, useCallback, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { PageHeader, Badge, Skeleton, EmptyState, Modal, Pagination } from '@reviewhub/shared-ui'
import { cn } from '@/utils'
import { ReviewCard, type Review as DisplayReview } from '@/components/ReviewCard'
import { ReviewDetailDrawer } from '@/components/ReviewDetailDrawer'
import type { CreateReviewInput } from '@/api/merchant.api'
import { useAuthStore } from '@/stores/auth.store'
import { useReviewsQuery, useReviewStatsQuery, useReviewMutations } from '@/hooks/useReviews'
import type { ApiReview, ApiReviewSource, ApiReviewStatus } from '@/types/review'

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform    = 'all' | ApiReviewSource
type RatingFilter = 'all' | '1' | '2' | '3' | '4' | '5'
type StatusFilter = 'all' | ApiReviewStatus
type SortOption   = 'newest' | 'oldest' | 'highest' | 'lowest'

interface Filters {
  search:   string
  platform: Platform
  rating:   RatingFilter
  status:   StatusFilter
  dateFrom: string
  dateTo:   string
  sort:     SortOption
}

const DEFAULT_FILTERS: Filters = {
  search: '', platform: 'all', rating: 'all',
  status: 'all', dateFrom: '', dateTo: '', sort: 'newest',
}

const PAGE_SIZE = 20

// ─── Display adapter ──────────────────────────────────────────────────────────
// The backend stores the facts (name, source, rating, body, timestamps); avatar
// color/initials and the relative-time label are purely presentational and
// computed here rather than stored.

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700', 'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700', 'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700', 'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700', 'bg-amber-100 text-amber-700',
]

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

function colorFor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function toDisplayReview(r: ApiReview): DisplayReview {
  return {
    id: r.id,
    customerName: r.customerName,
    customerInitials: initialsOf(r.customerName),
    avatarBg: colorFor(r.id),
    source: r.source,
    rating: r.rating,
    title: r.title ?? '(no title)',
    body: r.body,
    date: formatDistanceToNow(new Date(r.reviewedAt), { addSuffix: true }),
    status: r.status,
    reply: r.reply ?? undefined,
  }
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string; value: string; helper: string
  icon: React.ReactNode; iconBg: string
  loading?: boolean
}

const StatCard = memo(function StatCard({ label, value, helper, icon, iconBg, loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-2.5 w-24 rounded" />
            <Skeleton className="h-8 w-20 rounded" />
            <Skeleton className="h-2.5 w-32 rounded" />
          </div>
          <Skeleton className="h-11 w-11 rounded-xl flex-shrink-0" />
        </div>
      </div>
    )
  }

  return (
    <div
      className="card p-5 group cursor-default transition-shadow duration-200 hover:shadow-card-hover"
      role="region"
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
          <p className="mt-2 text-[30px] font-bold leading-none tracking-tight text-gray-900">
            {value}
          </p>
          <p className="mt-1.5 text-[12px] text-gray-400">{helper}</p>
        </div>
        <div
          className={cn(
            'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl',
            'transition-transform duration-200 group-hover:scale-110',
            iconBg,
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
    </div>
  )
})

// ─── Toolbar ──────────────────────────────────────────────────────────────────

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: 'all', label: 'All Platforms' },
  { value: 'GOOGLE', label: 'Google' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'ZOMATO', label: 'Zomato' },
  { value: 'SWIGGY', label: 'Swiggy' },
  { value: 'TRIPADVISOR', label: 'TripAdvisor' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'OTHER', label: 'Other' },
]

const RATING_OPTIONS: { value: RatingFilter; label: string }[] = [
  { value: 'all', label: 'All Ratings' },
  { value: '5', label: '★★★★★  5 Stars' },
  { value: '4', label: '★★★★☆  4 Stars' },
  { value: '3', label: '★★★☆☆  3 Stars' },
  { value: '2', label: '★★☆☆☆  2 Stars' },
  { value: '1', label: '★☆☆☆☆  1 Star' },
]

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending Reply' },
  { value: 'REPLIED', label: 'Replied' },
  { value: 'FLAGGED', label: 'Flagged' },
  { value: 'RESOLVED', label: 'Resolved' },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'highest', label: 'Highest Rating' },
  { value: 'lowest', label: 'Lowest Rating' },
]

interface ToolbarProps {
  filters: Filters
  onChange: (f: Filters) => void
}

const Toolbar = memo(function Toolbar({ filters, onChange }: ToolbarProps) {
  const set = useCallback(
    <K extends keyof Filters>(key: K, val: Filters[K]) =>
      onChange({ ...filters, [key]: val }),
    [filters, onChange],
  )

  const activeCount = [
    filters.platform !== 'all',
    filters.rating   !== 'all',
    filters.status   !== 'all',
    filters.dateFrom !== '',
    filters.dateTo   !== '',
    filters.search   !== '',
  ].filter(Boolean).length

  const hasActiveFilters = activeCount > 0

  const selectCls = (active: boolean) =>
    cn('input w-auto text-sm', active && 'border-primary-400 ring-1 ring-primary-300 bg-primary-50/40')

  return (
    <div className="card p-4" role="search" aria-label="Review filters">
      {/* Row 1: search + sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            placeholder="Search reviews, customers…"
            className="input pl-9 pr-4"
            aria-label="Search reviews"
          />
        </div>
        <div className="flex-shrink-0">
          <select
            value={filters.sort}
            onChange={(e) => set('sort', e.target.value as SortOption)}
            className="input w-full sm:w-44"
            aria-label="Sort reviews"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Row 2: filters */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={filters.platform}
          onChange={(e) => set('platform', e.target.value as Platform)}
          className={selectCls(filters.platform !== 'all')}
          style={{ minWidth: '140px' }}
          aria-label="Filter by platform"
        >
          {PLATFORM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={filters.rating}
          onChange={(e) => set('rating', e.target.value as RatingFilter)}
          className={selectCls(filters.rating !== 'all')}
          style={{ minWidth: '130px' }}
          aria-label="Filter by rating"
        >
          {RATING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={filters.status}
          onChange={(e) => set('status', e.target.value as StatusFilter)}
          className={selectCls(filters.status !== 'all')}
          style={{ minWidth: '140px' }}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => set('dateFrom', e.target.value)}
            className={selectCls(!!filters.dateFrom)}
            aria-label="Filter from date"
            title="From date"
          />
          <span className="text-xs text-gray-400" aria-hidden="true">–</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => set('dateTo', e.target.value)}
            className={selectCls(!!filters.dateTo)}
            aria-label="Filter to date"
            title="To date"
          />
        </div>

        {hasActiveFilters && (
          <>
            <button
              type="button"
              onClick={() => onChange(DEFAULT_FILTERS)}
              className="btn-ghost btn-sm gap-1 text-gray-500 hover:text-gray-700"
              aria-label="Clear all filters"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
            <Badge variant="blue" className="text-[11px]">
              {activeCount} active
            </Badge>
          </>
        )}
      </div>
    </div>
  )
})

// ─── Skeleton list ────────────────────────────────────────────────────────────

function ReviewsListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading reviews">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="card p-5">
          <div className="flex items-start gap-4">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3.5 w-full rounded" />
              <Skeleton className="h-3.5 w-5/6 rounded" />
            </div>
            <div className="flex-shrink-0 flex flex-col items-end gap-2">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Log Review modal ─────────────────────────────────────────────────────────

function LogReviewModal({
  open, onClose, onSubmit, submitting,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (input: CreateReviewInput) => void
  submitting: boolean
}) {
  const [form, setForm] = useState<CreateReviewInput>({
    customerName: '', customerEmail: '', source: 'GOOGLE', rating: 5, title: '', body: '',
  })

  function set<K extends keyof CreateReviewInput>(key: K, value: CreateReviewInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit() {
    if (!form.customerName.trim() || !form.body.trim()) return
    onSubmit({
      ...form,
      customerEmail: form.customerEmail?.trim() || undefined,
      title: form.title?.trim() || undefined,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log a Review"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost btn-sm" disabled={submitting}>Cancel</button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !form.customerName.trim() || !form.body.trim()}
            className="btn-primary btn-sm"
          >
            {submitting ? 'Saving…' : 'Save Review'}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-gray-400">
          Log a review you received elsewhere (Google, Facebook, etc.) so you can track and reply to it here.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-medium text-gray-600">
            Customer Name
            <input
              className="input mt-1 w-full"
              value={form.customerName}
              onChange={(e) => set('customerName', e.target.value)}
            />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Customer Email (optional)
            <input
              className="input mt-1 w-full"
              type="email"
              value={form.customerEmail}
              onChange={(e) => set('customerEmail', e.target.value)}
            />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Platform
            <select
              className="input mt-1 w-full"
              value={form.source}
              onChange={(e) => set('source', e.target.value as CreateReviewInput['source'])}
            >
              {PLATFORM_OPTIONS.filter((o) => o.value !== 'all').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Rating
            <select
              className="input mt-1 w-full"
              value={form.rating}
              onChange={(e) => set('rating', Number(e.target.value))}
            >
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-xs font-medium text-gray-600">
          Title (optional)
          <input className="input mt-1 w-full" value={form.title} onChange={(e) => set('title', e.target.value)} />
        </label>
        <label className="block text-xs font-medium text-gray-600">
          Review Text
          <textarea
            className="input mt-1 w-full"
            rows={4}
            value={form.body}
            onChange={(e) => set('body', e.target.value)}
          />
        </label>
      </div>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReviewsPage() {
  const merchantId = useAuthStore((s) => s.merchant?.id)

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)
  const [showLogModal, setShowLogModal] = useState(false)

  const queryParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      source: filters.platform !== 'all' ? filters.platform : undefined,
      rating: filters.rating !== 'all' ? Number(filters.rating) : undefined,
      status: filters.status !== 'all' ? filters.status : undefined,
      search: filters.search || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      sort: filters.sort,
    }),
    [filters, page],
  )

  const { data: reviewsRes, isLoading, isFetching } = useReviewsQuery(merchantId, queryParams)
  const { data: statsRes } = useReviewStatsQuery(merchantId)

  const reviews: ApiReview[] = reviewsRes?.data?.data?.data ?? []
  const total = reviewsRes?.data?.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const displayReviews = useMemo(() => reviews.map(toDisplayReview), [reviews])
  const selectedReview = reviews.find((r) => r.id === selectedReviewId) ?? null
  const selectedDisplayReview = selectedReview ? toDisplayReview(selectedReview) : null

  const stats = statsRes?.data?.data

  const { replyMutation, resolveMutation, createMutation, invalidateReviews } = useReviewMutations(merchantId, {
    onCreateSuccess: () => setShowLogModal(false),
  })

  const handleFiltersChange = useCallback((f: Filters) => { setFilters(f); setPage(1) }, [])
  const handleViewDetails = useCallback((r: DisplayReview) => setSelectedReviewId(r.id), [])
  const handleCloseDrawer = useCallback(() => setSelectedReviewId(null), [])

  function handleExportCsv() {
    const rows = [
      ['Customer', 'Platform', 'Rating', 'Title', 'Status', 'Date', 'Reply'],
      ...reviews.map((r) => [r.customerName, r.source, String(r.rating), r.title ?? '', r.status, r.reviewedAt, r.reply ?? '']),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reviews-page-${page}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const loading = isLoading

  return (
    <div className="animate-fade-up">

      {/* Header */}
      <PageHeader
        title="Reviews"
        subtitle="Track customer feedback from Google, Facebook, and other platforms in one place."
        primaryAction={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => invalidateReviews()}
              className="btn-secondary btn-sm"
              aria-label="Refresh reviews"
              disabled={isFetching}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={reviews.length === 0}
              className="btn-secondary btn-sm"
              aria-label="Export this page as CSV"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            <button
              type="button"
              onClick={() => setShowLogModal(true)}
              className="btn-primary btn-sm"
              aria-label="Log a new review"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Log Review
            </button>
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Reviews" value={stats ? String(stats.total) : '—'} helper="All time" loading={!stats}
          iconBg="bg-blue-50 text-blue-600"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
        />
        <StatCard
          label="Average Rating" value={stats ? stats.averageRating.toFixed(1) : '—'} helper="Out of 5.0 stars" loading={!stats}
          iconBg="bg-amber-50 text-amber-500"
          icon={<svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>}
        />
        <StatCard
          label="Response Rate" value={stats ? `${Math.round(stats.responseRate * 100)}%` : '—'} helper={stats ? `${stats.repliedCount} of ${stats.total} replied` : ''} loading={!stats}
          iconBg="bg-emerald-50 text-emerald-600"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Pending Replies" value={stats ? String(stats.pendingCount) : '—'} helper="Awaiting response" loading={!stats}
          iconBg="bg-orange-50 text-orange-500"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* Toolbar */}
      <div className="mt-6">
        <Toolbar filters={filters} onChange={handleFiltersChange} />
      </div>

      {/* Results meta */}
      {!loading && (
        <div className="mt-3 flex items-center justify-between px-1">
          <p className="text-xs text-gray-400" aria-live="polite" aria-atomic="true">
            {total === 0 ? 'No reviews' : `${total} review${total === 1 ? '' : 's'} found`}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="mt-3">
        {loading ? (
          <ReviewsListSkeleton />
        ) : displayReviews.length === 0 ? (
          <div className="card">
            <EmptyState
              title="No Reviews Found"
              description="No reviews match your current filters, or none have been logged yet."
              icon={
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              }
              action={
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleFiltersChange(DEFAULT_FILTERS)}
                  aria-label="Clear all filters to show all reviews"
                >
                  Clear Filters
                </button>
              }
            />
          </div>
        ) : (
          <>
            <div
              className="space-y-3"
              aria-live="polite"
              aria-label={`Reviews list, ${displayReviews.length} results`}
              role="list"
            >
              {displayReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
            <div className="mt-4">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      <ReviewDetailDrawer
        review={selectedDisplayReview}
        onClose={handleCloseDrawer}
        onReply={async (reviewId, text) => { await replyMutation.mutateAsync({ reviewId, text }) }}
        onResolve={async (reviewId) => { await resolveMutation.mutateAsync(reviewId) }}
      />

      <LogReviewModal
        open={showLogModal}
        onClose={() => setShowLogModal(false)}
        onSubmit={(input) => createMutation.mutate(input)}
        submitting={createMutation.isPending}
      />
    </div>
  )
}
