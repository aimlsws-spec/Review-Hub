import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@reviewhub/shared-ui'
import { ROUTES } from '@/constants'
import { getApiErrorMessage, cn } from '@/utils'

interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? ROUTES.DASHBOARD
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ defaultValues: { rememberMe: false } })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: LoginForm) => login(data),
    onSuccess: () => {
      toast.success('Welcome back')
      navigate(from, { replace: true })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-[400px]">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-gradient-to-br from-primary-500 to-primary-700 shadow-[0_4px_12px_rgba(37,99,235,0.25)]">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
              <rect x="4" y="4" width="6.5" height="6.5" rx="1.2" fill="white" />
              <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" fill="white" fillOpacity="0.6" />
              <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" fill="white" fillOpacity="0.6" />
              <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2" fill="white" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[19px] font-extrabold tracking-tight text-slate-900 leading-none">VIRAL KAR</p>
            <p className="text-[11px] font-bold text-primary-500 leading-tight mt-1 uppercase tracking-widest">Admin Portal</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-auth-card">
          <div className="mb-6">
            <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Sign in</h1>
            <p className="mt-1 text-sm text-slate-500">Restricted to platform administrators.</p>
          </div>

          <form onSubmit={handleSubmit((data) => mutate(data))} noValidate className="space-y-4">
            <div className="form-group">
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@viralkar.com"
                className={cn('input', errors.email && 'input-error')}
                aria-invalid={!!errors.email}
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
                })}
              />
              {errors.email && <p className="error-text" role="alert">{errors.email.message}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className={cn('input pr-10', errors.password && 'input-error')}
                  aria-invalid={!!errors.password}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="error-text" role="alert">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex cursor-pointer items-center gap-2.5 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  {...register('rememberMe')}
                />
                <span className="text-sm text-slate-600">Remember me on this device</span>
              </label>
              <Link to={ROUTES.FORGOT_PASSWORD} className="text-sm font-medium text-primary-600 hover:text-primary-700">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={isPending} className="btn-primary w-full">
              {isPending ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Access is limited to authorized VIRAL KAR staff. All actions are logged.
        </p>
      </div>
    </div>
  )
}
