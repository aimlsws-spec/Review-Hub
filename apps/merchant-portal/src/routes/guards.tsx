import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROUTES } from '@/constants'
import { Spinner } from '@reviewhub/shared-ui'

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
