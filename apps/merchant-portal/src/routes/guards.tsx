import { EmptyState, Spinner } from '@viralkar/shared-ui'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'

import { ROUTES } from '@/constants'
import { useAuth } from '@/contexts/AuthContext'
import { useAuthStore } from '@/stores/auth.store'

export function ProtectedRoute() {
  const { isAuthenticated, loading, isInitialized } = useAuth()
  const location = useLocation()

  if (!isInitialized || loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-white">
        <Spinner size="lg" className="text-orange-500 mb-4" />
        <p className="text-slate-500 text-sm font-medium animate-pulse">Verifying session...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  return <Outlet />
}

/**
 * Pages that act on a business (team, documents, webhooks, support, …). Signing up creates only the person's
 * account; the business is created on the Profile page. Without one, every call on these pages would go to
 * `/merchants/undefined/...` and fail, so point the person to Profile instead.
 */
export function BusinessRequiredRoute() {
  const hasBusiness = useAuthStore((s) => Boolean(s.merchant?.id))

  if (!hasBusiness) {
    return (
      <EmptyState
        title="Set up your business profile first"
        description="Your account is ready. Create your business profile to start campaigns, upload documents, invite your team and use the rest of the portal."
        action={<Link to={ROUTES.PROFILE} className="btn-primary btn-sm">Set up profile</Link>}
      />
    )
  }

  return <Outlet />
}

export function GuestRoute() {
  const { isAuthenticated, loading, isInitialized } = useAuth()

  if (!isInitialized || loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-white">
        <Spinner size="lg" className="text-orange-500 mb-4" />
        <p className="text-slate-500 text-sm font-medium animate-pulse">Loading...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return <Outlet />
}
