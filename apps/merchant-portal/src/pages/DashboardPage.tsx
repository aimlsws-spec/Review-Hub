import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { useAuthStore } from '@/stores/auth.store'
import { Skeleton, StatusBadge, Badge, PageHeader } from '@reviewhub/shared-ui'
import { StarRating } from '@/components/ReviewCard'
import { useDashboardStatsQuery } from '@/hooks/useDashboard'
import { useNotificationsQuery } from '@/hooks/useNotifications'
import { useRecentReviewsQuery } from '@/hooks/useReviews'
import { ROUTES } from '@/constants'
import { cn, formatCurrency } from '@/utils'

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  iconBg: string
  loading?: boolean
}

function StatCard({ label, value, subtitle, icon, iconBg, loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="card p-5 space-y-3">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-20" />
        <div className="flex justify-end">
          <Skeleton className="h-11 w-11 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5 hover:shadow-card-hover transition-shadow cursor-default group" role="region" aria-label={label}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="mt-1.5 text-[26px] font-bold text-slate-900 leading-none tracking-tight">{value}</p>
          {subtitle && (
            <p className="mt-1 text-[11.5px] text-slate-400">{subtitle}</p>
          )}
        </div>
        <div className={cn('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110', iconBg)}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// ─── Quick Action Card ────────────────────────────────────────────────────────

function QuickActionCard({
  to, icon, iconBg, label, description,
}: {
  to: string
  icon: React.ReactNode
  iconBg: string
  label: string
  description: string
}) {
  return (
    <Link
      to={to}
      className="card group flex items-center gap-4 p-4 hover:shadow-card-hover transition-all duration-150 hover:-translate-y-[1px]"
    >
      <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-105', iconBg)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold text-slate-800">{label}</p>
        <p className="text-[12px] text-slate-400 mt-0.5">{description}</p>
      </div>
      <svg className="ml-auto h-4 w-4 flex-shrink-0 text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

// ─── Notifications Widget (real data) ──────────────────────────────────────────

function NotifIcon({ type }: { type: string }) {
  const cls = 'h-4 w-4'
  const t = type.toLowerCase()
  if (t.includes('reward') || t.includes('wallet')) return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  )
  if (t.includes('team') || t.includes('campaign')) return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function NotificationsWidget() {
  const { data, isLoading } = useNotificationsQuery({ limit: 6 })

  const notifications = data?.data?.data?.data ?? []
  const unreadCount = notifications.filter((n) => !n.readAt).length

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-semibold text-slate-800">Notifications</p>
          {unreadCount > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : notifications.length === 0 ? (
        <p className="px-5 py-6 text-center text-[12.5px] text-slate-400">No notifications yet.</p>
      ) : (
        <div className="divide-y divide-slate-50">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                'flex items-start gap-3 px-5 py-3.5 transition-all duration-200 hover:bg-slate-50/70',
                !n.readAt && 'bg-orange-50/30',
              )}
            >
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <NotifIcon type={n.type} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn('text-[12.5px] leading-snug', !n.readAt ? 'font-semibold text-slate-800' : 'font-medium text-slate-600')}>
                    {n.title}
                  </p>
                  {!n.readAt && (
                    <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-orange-500" role="status" aria-label="Unread notification" />
                  )}
                </div>
                <p className="mt-0.5 text-[11.5px] text-slate-400 leading-snug line-clamp-1">{n.message}</p>
                <span className="mt-1 block text-[10.5px] text-slate-300">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Verification banner ──────────────────────────────────────────────────────

function VerificationBanner({ status }: { status: string }) {
  if (status === 'APPROVED') return null

  const config = {
    NOT_SUBMITTED: { bg: 'bg-blue-50 border-blue-200', icon: 'text-blue-500', text: 'text-blue-800', sub: 'text-blue-700', msg: 'Complete your KYC to unlock all features.', label: 'Start KYC' },
    PENDING: { bg: 'bg-yellow-50 border-yellow-200', icon: 'text-yellow-500', text: 'text-yellow-800', sub: 'text-yellow-700', msg: 'Your account is under review. You\'ll be notified once approved.', label: 'View Status' },
    UNDER_REVIEW: { bg: 'bg-yellow-50 border-yellow-200', icon: 'text-yellow-500', text: 'text-yellow-800', sub: 'text-yellow-700', msg: 'Documents are being reviewed by our team.', label: 'View Status' },
    REJECTED: { bg: 'bg-red-50 border-red-200', icon: 'text-red-500', text: 'text-red-800', sub: 'text-red-700', msg: 'Your verification was rejected. Please resubmit your documents.', label: 'Resubmit' },
    REQUIRES_RESUBMISSION: { bg: 'bg-red-50 border-red-200', icon: 'text-red-500', text: 'text-red-800', sub: 'text-red-700', msg: 'Additional documents are required.', label: 'Resubmit' },
  } as Record<string, { bg: string; icon: string; text: string; sub: string; msg: string; label: string }>

  const c = config[status] ?? config['PENDING']

  return (
    <div className={cn('mb-6 flex items-start gap-3 rounded-xl border p-4', c.bg)}>
      <svg className={cn('mt-0.5 h-5 w-5 flex-shrink-0', c.icon)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div className="flex-1">
        <p className={cn('text-sm font-semibold', c.text)}>Verification {status.toLowerCase().replace(/_/g, ' ')}</p>
        <p className={cn('text-sm mt-0.5', c.sub)}>{c.msg}</p>
      </div>
      <Link to={ROUTES.DOCUMENTS} className="flex-shrink-0 text-[12px] font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-2 transition-colors">
        {c.label}
      </Link>
    </div>
  )
}

// ─── Recent Reviews (real data) ─────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700', 'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700', 'bg-indigo-100 text-indigo-700',
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

function RecentReviews({ merchantId }: { merchantId: string }) {
  const { data, isLoading } = useRecentReviewsQuery(merchantId)

  const reviews = data?.data?.data?.data ?? []

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-semibold text-slate-800">Recent Reviews</p>
          {reviews.length > 0 && <Badge variant="yellow" className="text-[10px] font-bold px-2 py-0.5">{reviews.length}</Badge>}
        </div>
        <Link to={ROUTES.REVIEWS} className="btn-ghost btn-sm text-[12px] font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50">
          View All
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
      {isLoading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : reviews.length === 0 ? (
        <p className="px-5 py-6 text-center text-[12.5px] text-slate-400">
          No reviews logged yet. <Link to={ROUTES.REVIEWS} className="text-orange-600 hover:underline">Log your first review</Link>.
        </p>
      ) : (
        <div className="divide-y divide-slate-50">
          {reviews.map((review) => (
            <div key={review.id} className="flex items-start gap-3.5 px-5 py-4 transition-colors hover:bg-slate-50/60">
              <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold', colorFor(review.id))}>
                {initialsOf(review.customerName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p className="text-[13px] font-semibold text-slate-800">{review.customerName}</p>
                  <Badge variant="gray" className="text-[10px]">{review.source}</Badge>
                </div>
                <StarRating rating={review.rating} />
                <p className="mt-1 text-[12.5px] text-slate-500 leading-relaxed line-clamp-2">{review.body}</p>
              </div>
              <div className="flex flex-shrink-0 flex-col items-end gap-2">
                <p className="text-[11px] text-slate-400 whitespace-nowrap">
                  {formatDistanceToNow(new Date(review.reviewedAt), { addSuffix: true })}
                </p>
                {!review.reply && (
                  <Link to={ROUTES.REVIEWS} className="btn-secondary btn-sm text-[11px] px-2.5 py-1">
                    Reply
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, merchant } = useAuthStore()

  const { data: dashboardRes, isLoading: dashboardLoading } = useDashboardStatsQuery(merchant?.id)
  const stats = dashboardRes?.data?.data

  // No merchant yet — onboarding state
  if (!merchant) {
    return (
      <div>
        <PageHeader
          title={`Welcome, ${user?.firstName ?? 'Merchant'}!`}
          subtitle="Get started by setting up your merchant profile."
        />
        <div className="card p-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
            <svg className="h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-[17px] font-bold text-slate-900">Complete your merchant profile</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            Set up your business profile to start creating campaigns and managing your team.
          </p>
          <Link to={ROUTES.PROFILE} className="btn-primary mt-6 inline-flex">
            Set up profile
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <PageHeader
        title={`Welcome back, ${user?.firstName ?? 'Merchant'}!`}
        subtitle={formatDate()}
        badge={<StatusBadge status={merchant.status} />}
        primaryAction={
          <Link to={ROUTES.CAMPAIGNS} className="btn-primary btn-sm">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Campaign
          </Link>
        }
        secondaryAction={
          merchant.verificationStatus !== 'APPROVED' ? (
            <Link to={ROUTES.DOCUMENTS} className="btn-secondary btn-sm">
              Complete KYC
            </Link>
          ) : undefined
        }
      />

      {/* Verification banner */}
      <VerificationBanner status={merchant.verificationStatus} />

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Campaigns"
          value={stats?.totalCampaigns ?? '—'}
          subtitle={stats ? `${stats.activeCampaigns} active` : ''}
          loading={dashboardLoading}
          iconBg="bg-orange-50 text-orange-600"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          }
        />
        <StatCard
          label="Total Participants"
          value={stats?.totalParticipants ?? '—'}
          subtitle="Across all campaigns"
          loading={dashboardLoading}
          iconBg="bg-blue-50 text-blue-600"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          label="Wallet Balance"
          value={stats ? formatCurrency(Number(stats.walletBalance)) : '—'}
          subtitle="Available to spend"
          loading={dashboardLoading}
          iconBg="bg-purple-50 text-purple-600"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
        />
        <StatCard
          label="Budget Spent"
          value={stats ? formatCurrency(Number(stats.totalSpent)) : '—'}
          subtitle={stats ? `of ${formatCurrency(Number(stats.totalBudget))} allocated` : ''}
          loading={dashboardLoading}
          iconBg="bg-emerald-50 text-emerald-600"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          }
        />
      </div>

      {/* Main grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Left column — 2/3 */}
        <div className="space-y-6 lg:col-span-2">

          {/* Quick actions */}
          <div>
            <p className="section-title mb-3">Quick Actions</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <QuickActionCard
                to={ROUTES.REVIEWS}
                iconBg="bg-orange-50 text-orange-600"
                label="Manage Reviews"
                description="View and respond to reviews"
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                }
              />
              <QuickActionCard
                to={ROUTES.CAMPAIGNS}
                iconBg="bg-emerald-50 text-emerald-600"
                label="Manage Campaigns"
                description="Create or edit a campaign"
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                }
              />
              <QuickActionCard
                to={ROUTES.TEAM}
                iconBg="bg-blue-50 text-blue-600"
                label="Manage Team"
                description="Invite and manage members"
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              />
              <QuickActionCard
                to={ROUTES.WALLET}
                iconBg="bg-purple-50 text-purple-600"
                label="Wallet"
                description="View balance & transactions"
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Recent Reviews */}
          <RecentReviews merchantId={merchant.id} />
        </div>

        {/* Right column — 1/3 */}
        <div className="space-y-6">
          <NotificationsWidget />
        </div>
      </div>
    </div>
  )
}
