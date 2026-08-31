import { Link, useNavigate } from 'react-router-dom'

import { ROUTES } from '@/constants'
import { useAuthStore } from '@/stores/auth.store'

export default function NotFoundPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <p className="text-6xl font-bold text-primary-600">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-gray-900">Page not found</h1>
      <p className="mt-2 text-sm text-gray-500">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="mt-6 flex gap-3">
        <button className="btn-secondary" onClick={() => navigate(-1)}>
          Go back
        </button>
        <Link
          to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN}
          className="btn-primary"
        >
          {isAuthenticated ? 'Go to Dashboard' : 'Go to Login'}
        </Link>
      </div>
    </div>
  )
}
