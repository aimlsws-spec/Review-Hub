import { Link } from 'react-router-dom'

import { ROUTES } from '@/constants'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <p className="text-6xl font-extrabold tracking-tight text-primary-600">404</p>
      <h1 className="mt-4 text-xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">The page you're looking for doesn't exist or was moved.</p>
      <Link to={ROUTES.DASHBOARD} className="btn-primary mt-6">
        Back to dashboard
      </Link>
    </div>
  )
}
