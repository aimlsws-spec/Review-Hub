import { Spinner } from '@reviewhub/shared-ui'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/constants'
import { useForgotPasswordMutation } from '@/hooks/useAuthMutations'
import { getApiErrorMessage, cn } from '@/utils'

interface ForgotPasswordForm {
  email: string
}

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>()

  const { mutate, isPending, isSuccess } = useForgotPasswordMutation()

  function onSubmit(data: ForgotPasswordForm) {
    mutate(data, {
      onSuccess: () => toast.success('If the account exists, an OTP has been sent.'),
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
          {isSuccess ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Check your email</h1>
              <p className="mt-2 text-sm text-slate-500">We've sent a password reset OTP to your email address.</p>
              <Link to={ROUTES.RESET_PASSWORD} className="btn-primary mt-6 inline-flex">
                Enter OTP
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Forgot password?</h1>
                <p className="mt-1 text-sm text-slate-500">Enter your email and we'll send you a reset OTP.</p>
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

                <button type="submit" disabled={isPending} className="btn-primary w-full">
                  {isPending ? (
                    <>
                      <Spinner size="sm" className="text-white" />
                      Sending…
                    </>
                  ) : (
                    'Send reset OTP'
                  )}
                </button>

                <p className="text-center text-sm text-slate-500">
                  <Link to={ROUTES.LOGIN} className="font-medium text-primary-600 hover:text-primary-700">
                    Back to sign in
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
