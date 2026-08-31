import { Spinner } from '@reviewhub/shared-ui'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'

import { ROUTES } from '@/constants'
import { useResetPasswordMutation } from '@/hooks/useAuthMutations'
import { getApiErrorMessage, cn } from '@/utils'

interface ResetForm {
  email: string
  code: string
  password: string
  confirmPassword: string
}

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetForm>()

  const { mutate, isPending } = useResetPasswordMutation()

  function onSubmit(data: ResetForm) {
    mutate(data, {
      onSuccess: () => {
        toast.success('Password reset successfully. Please sign in.')
        navigate(ROUTES.LOGIN)
      },
      onError: (err) => toast.error(getApiErrorMessage(err)),
    })
  }

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
            <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Reset password</h1>
            <p className="mt-1 text-sm text-slate-500">Enter the OTP sent to your email.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="form-group">
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={cn('input', errors.email && 'input-error')}
                aria-invalid={!!errors.email}
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && <p className="error-text" role="alert">{errors.email.message}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="code" className="label">
                OTP code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                className={cn('input', errors.code && 'input-error')}
                aria-invalid={!!errors.code}
                {...register('code', {
                  required: 'OTP is required',
                  minLength: { value: 6, message: 'Enter the 6-digit OTP' },
                })}
              />
              <p className="text-xs text-slate-500 mt-1">6-digit code from your email</p>
              {errors.code && <p className="error-text" role="alert">{errors.code.message}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="label">
                New password
              </label>
              <input
                id="password"
                type="password"
                className={cn('input', errors.password && 'input-error')}
                aria-invalid={!!errors.password}
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Minimum 8 characters' },
                })}
              />
              {errors.password && <p className="error-text" role="alert">{errors.password.message}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="label">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className={cn('input', errors.confirmPassword && 'input-error')}
                aria-invalid={!!errors.confirmPassword}
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (v) => v === watch('password') || 'Passwords do not match',
                })}
              />
              {errors.confirmPassword && <p className="error-text" role="alert">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={isPending} className="btn-primary w-full">
              {isPending ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  Resetting…
                </>
              ) : (
                'Reset password'
              )}
            </button>

            <p className="text-center text-sm text-slate-500">
              <Link to={ROUTES.LOGIN} className="font-medium text-primary-600 hover:text-primary-700">
                Back to sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
