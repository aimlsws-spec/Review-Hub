import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants'
import { PageHeader, CardSkeleton } from '@reviewhub/shared-ui'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStats } from '@/hooks/useDashboardStats'

interface StatCardProps {
  label: string
  value: number | undefined
  loading: boolean
  to: string
  accent: string
  icon: React.ReactNode
}

function StatCard({ label, value, loading, to, accent, icon }: StatCardProps) {
  if (loading) return <CardSkeleton />

  return (
    <Link to={to} className="card group p-5 transition-shadow hover:shadow-card-hover">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent}`}>{icon}</div>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value ?? 0}</p>
      <p className="mt-1 text-xs font-medium text-primary-600 opacity-0 transition-opacity group-hover:opacity-100">
        View queue →
      </p>
    </Link>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { campaigns, withdrawals, fraudFlags, users } = useDashboardStats()

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.firstName ?? 'Admin'}`}
        subtitle="Here's what needs your attention across the platform."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Campaigns awaiting review"
          value={campaigns.total}
          loading={campaigns.loading}
          to={ROUTES.CAMPAIGNS}
          accent="bg-blue-50 text-blue-600"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <StatCard
          label="Withdrawals pending review"
          value={withdrawals.total}
          loading={withdrawals.loading}
          to={ROUTES.WITHDRAWALS}
          accent="bg-green-50 text-green-600"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
        />
        <StatCard
          label="Unresolved fraud flags"
          value={fraudFlags.total}
          loading={fraudFlags.loading}
          to={ROUTES.FRAUD}
          accent="bg-red-50 text-red-600"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <StatCard
          label="Total platform users"
          value={users.total}
          loading={users.loading}
          to={ROUTES.USERS}
          accent="bg-purple-50 text-purple-600"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link to={ROUTES.CMS_PAGES} className="card p-5 transition-shadow hover:shadow-card-hover">
          <p className="section-title">Manage content</p>
          <p className="section-subtitle mt-1">Update CMS pages and FAQs shown across the platform.</p>
        </Link>
        <Link to={ROUTES.AUDIT_LOGS} className="card p-5 transition-shadow hover:shadow-card-hover">
          <p className="section-title">Review activity</p>
          <p className="section-subtitle mt-1">See every approval, suspension, and config change by admins.</p>
        </Link>
      </div>
    </div>
  )
}
