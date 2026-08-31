import { Input, Spinner } from '@reviewhub/shared-ui'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'

import { ROUTES } from '@/constants'
import { useResetPasswordMutation } from '@/hooks/useAuthMutations'
import { AuthCard } from '@/layouts/AuthCard'
import { getApiErrorMessage } from '@/utils'

interface ResetForm {
  email: string
  code: string
  password: string
  confirmPassword: string
}

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetForm>()

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
    <AuthCard>
    <div className="card px-8 py-10">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Reset password</h2>
        <p className="mt-1 text-sm text-gray-500">Enter the OTP sent to your email.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          label="Email address"
          type="email"
          required
          error={errors.email?.message}
          {...register('email', { required: 'Email is required' })}
        />
        <Input
          label="OTP code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          required
          error={errors.code?.message}
          hint="6-digit code from your email"
          {...register('code', {
            required: 'OTP is required',
            minLength: { value: 6, message: 'Enter the 6-digit OTP' },
          })}
        />
        <Input
          label="New password"
          type="password"
          required
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'Minimum 8 characters' },
          })}
        />
        <Input
          label="Confirm new password"
          type="password"
          required
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (v) => v === watch('password') || 'Passwords do not match',
          })}
        />

        <button type="submit" className="btn-primary w-full btn-lg mt-2" disabled={isPending}>
          {isPending && <Spinner size="sm" className="text-white" />}
          {isPending ? 'Resetting…' : 'Reset password'}
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
