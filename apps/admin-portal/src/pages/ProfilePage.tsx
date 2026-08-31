import { PageHeader } from '@reviewhub/shared-ui'
import { useState } from 'react'
import toast from 'react-hot-toast'

import { useChangePasswordMutation } from '@/hooks/useChangePassword'
import { useAuthStore } from '@/stores/auth.store'
import { getInitials } from '@/utils'

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,72}$/

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useChangePasswordMutation(
    () => {
      toast.success('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setError(null)
    },
    (message) => toast.error(message),
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (!PASSWORD_PATTERN.test(newPassword)) {
      setError('New password must be 8+ characters with uppercase, lowercase, a number, and a special character')
      return
    }
    setError(null)
    mutation.mutate({ currentPassword, newPassword })
  }

  return (
    <div className="card max-w-lg p-6">
      <h2 className="text-base font-semibold text-slate-900">Change Password</h2>
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="current-password" className="label">Current Password</label>
          <input
            id="current-password"
            type="password"
            className="input mt-1"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <div>
          <label htmlFor="new-password" className="label">New Password</label>
          <input
            id="new-password"
            type="password"
            className="input mt-1"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="label">Confirm New Password</label>
          <input
            id="confirm-password"
            type="password"
            className="input mt-1"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Changing…' : 'Change Password'}
        </button>
      </form>
    </div>
  )
}

export default function ProfilePage() {
  const { user } = useAuthStore()

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="Your administrator account details." />

      <div className="card max-w-lg p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-lg font-bold text-white">
            {user ? getInitials(user.firstName, user.lastName) : 'A'}
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-slate-500">{user?.email ?? user?.phone}</p>
          </div>
        </div>

        <div className="mt-6 divide-y divide-gray-200 border-t border-gray-200">
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-slate-500">Status</span>
            <span className="text-sm font-medium text-slate-900">{user?.status}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-slate-500">Two-factor authentication</span>
            <span className="text-sm font-medium text-slate-900">{user?.isTwoFactorEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-slate-500">Member since</span>
            <span className="text-sm font-medium text-slate-900">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
            </span>
          </div>
        </div>
      </div>

      <ChangePasswordCard />
    </div>
  )
}
