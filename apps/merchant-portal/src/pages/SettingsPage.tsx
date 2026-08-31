import { Input, Spinner } from '@reviewhub/shared-ui'
import { useForm } from 'react-hook-form'

import { useUpdateAccountProfileMutation, useChangePasswordMutation, useSendOtpMutation } from '@/hooks/useAccountSettings'
import { useAuthStore } from '@/stores/auth.store'

interface ProfileForm {
  firstName: string
  lastName: string
}

interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <div className="mb-5 border-b border-gray-200 pb-4">
        <h2 className="section-title">{title}</h2>
        {description && <p className="section-subtitle mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useAuthStore()

  const { register: regProfile, handleSubmit: handleProfile, formState: { errors: profileErrors, isDirty: profileDirty } } =
    useForm<ProfileForm>({
      defaultValues: { firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' },
    })

  const { register: regPwd, handleSubmit: handlePwd, reset: resetPwd, watch, formState: { errors: pwdErrors } } =
    useForm<PasswordForm>()

  const profileMutation = useUpdateAccountProfileMutation()
  const passwordMutation = useChangePasswordMutation(resetPwd)
  const otpMutation = useSendOtpMutation()

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account preferences and security.</p>
        </div>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Personal Info */}
        <SectionCard title="Personal Information" description="Update your name and contact details.">
          <form onSubmit={handleProfile((d) => profileMutation.mutate(d))} noValidate className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First name"
                required
                error={profileErrors.firstName?.message}
                {...regProfile('firstName', { required: 'Required' })}
              />
              <Input
                label="Last name"
                required
                error={profileErrors.lastName?.message}
                {...regProfile('lastName', { required: 'Required' })}
              />
            </div>
            <div className="form-group">
              <label className="label">Email address</label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={user?.email ?? ''}
                  readOnly
                  className="input flex-1 bg-gray-50 text-gray-500"
                />
                {!user?.emailVerifiedAt && (
                  <button
                    type="button"
                    className="btn-secondary btn-sm flex-shrink-0"
                    onClick={() => otpMutation.mutate('EMAIL_VERIFICATION')}
                    disabled={otpMutation.isPending}
                  >
                    Verify
                  </button>
                )}
                {user?.emailVerifiedAt && (
                  <span className="badge-green flex-shrink-0">Verified</span>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="btn-primary"
                disabled={profileMutation.isPending || !profileDirty}
              >
                {profileMutation.isPending && <Spinner size="sm" className="text-white" />}
                Save changes
              </button>
            </div>
          </form>
        </SectionCard>

        {/* Change Password */}
        <SectionCard title="Change Password" description="Use a strong password with at least 8 characters.">
          <form onSubmit={handlePwd((d) => passwordMutation.mutate(d))} noValidate className="space-y-4">
            <Input
              label="Current password"
              type="password"
              required
              error={pwdErrors.currentPassword?.message}
              {...regPwd('currentPassword', { required: 'Required' })}
            />
            <Input
              label="New password"
              type="password"
              required
              error={pwdErrors.newPassword?.message}
              {...regPwd('newPassword', {
                required: 'Required',
                minLength: { value: 8, message: 'Minimum 8 characters' },
              })}
            />
            <Input
              label="Confirm new password"
              type="password"
              required
              error={pwdErrors.confirmPassword?.message}
              {...regPwd('confirmPassword', {
                required: 'Required',
                validate: (v) => v === watch('newPassword') || 'Passwords do not match',
              })}
            />
            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={passwordMutation.isPending}>
                {passwordMutation.isPending && <Spinner size="sm" className="text-white" />}
                Change password
              </button>
            </div>
          </form>
        </SectionCard>

        {/* Account Status */}
        <SectionCard title="Account Status" description="Your current account verification status.">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <span className="text-gray-700">Email verification</span>
              {user?.emailVerifiedAt ? (
                <span className="badge-green">Verified</span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="badge-yellow">Unverified</span>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => otpMutation.mutate('EMAIL_VERIFICATION')}
                    disabled={otpMutation.isPending}
                  >
                    Send OTP
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <span className="text-gray-700">Phone verification</span>
              {user?.phoneVerifiedAt ? (
                <span className="badge-green">Verified</span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="badge-yellow">Unverified</span>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => otpMutation.mutate('PHONE_VERIFICATION')}
                    disabled={otpMutation.isPending}
                  >
                    Send OTP
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <span className="text-gray-700">Two-factor authentication</span>
              {user?.isTwoFactorEnabled ? (
                <span className="badge-green">Enabled</span>
              ) : (
                <span className="badge-gray">Disabled</span>
              )}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
