import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useForgotPasswordMutation } from '@/hooks/useAuthMutations'
import { Input, Spinner } from '@reviewhub/shared-ui'
import { ROUTES } from '@/constants'
import { getApiErrorMessage } from '@/utils'
import { AuthCard } from '@/layouts/AuthCard'

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<{ email: string }>()

  const { mutate, isPending, isSuccess } = useForgotPasswordMutation()

  function onSubmit(data: { email: string }) {
    mutate(data, {
      onSuccess: () => toast.success('If the account exists, an OTP has been sent.'),
      onError: (err) => toast.error(getApiErrorMessage(err)),
    })
  }

  if (isSuccess) {
    return (
      <AuthCard>
      <div className="card px-8 py-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Check your email</h2>
        <p className="mt-2 text-sm text-gray-500">
          We've sent a password reset OTP to your email address.
        </p>
        <Link to={ROUTES.RESET_PASSWORD} className="btn-primary mt-6 inline-flex">
          Enter OTP
        </Link>
      </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
    <div className="card px-8 py-10">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Forgot password?</h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter your email and we'll send you a reset OTP.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          required
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
          })}
        />

        <button type="submit" className="btn-primary w-full btn-lg" disabled={isPending}>
          {isPending && <Spinner size="sm" className="text-white" />}
          {isPending ? 'Sending…' : 'Send reset OTP'}
        </button>

        <p className="text-center text-sm text-gray-500">
          <Link to={ROUTES.LOGIN} className="font-medium text-primary-600 hover:text-primary-700">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
    </AuthCard>
  )
}
