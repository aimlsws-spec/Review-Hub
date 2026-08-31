import { Input, Spinner } from '@reviewhub/shared-ui'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'

import { ROUTES } from '@/constants'
import { useRegisterMutation } from '@/hooks/useAuthMutations'
import { AuthCard } from '@/layouts/AuthCard'
import { useAuthStore } from '@/stores/auth.store'
import { getApiErrorMessage } from '@/utils'

interface RegisterForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>()

  const { mutate, isPending } = useRegisterMutation()

  function onSubmit(data: RegisterForm) {
    mutate(data, {
      onSuccess: (res) => {
        const { user, tokens } = res.data.data
        setAuth(user, null, tokens.accessToken, tokens.refreshToken)
        toast.success('Account created! Welcome to ReviewHub.')
        navigate(ROUTES.DASHBOARD, { replace: true })
      },
      onError: (err) => toast.error(getApiErrorMessage(err)),
    })
  }

  return (
    <AuthCard>
    <div className="card px-8 py-10">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Create account</h2>
        <p className="mt-1 text-sm text-gray-500">
          Already have an account?{' '}
          <Link to={ROUTES.LOGIN} className="font-medium text-primary-600 hover:text-primary-700">
            Sign in
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First name"
            autoComplete="given-name"
            required
            error={errors.firstName?.message}
            {...register('firstName', { required: 'Required' })}
          />
          <Input
            label="Last name"
            autoComplete="family-name"
            required
            error={errors.lastName?.message}
            {...register('lastName', { required: 'Required' })}
          />
        </div>

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

        <Input
          label="Phone number"
          type="tel"
          autoComplete="tel"
          hint="Optional — used for OTP verification"
          error={errors.phone?.message}
          {...register('phone')}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'Minimum 8 characters' },
          })}
        />

        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (v) => v === watch('password') || 'Passwords do not match',
          })}
        />

        <button type="submit" className="btn-primary w-full btn-lg mt-2" disabled={isPending}>
          {isPending && <Spinner size="sm" className="text-white" />}
          {isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </div>
    </AuthCard>
  )
}
