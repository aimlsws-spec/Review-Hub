import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useChangePasswordMutation, useSendOtpMutation, useUpdateAccountProfileMutation } from '@/hooks/useAccountSettings'
import { useAuthStore } from '@/stores/auth.store'

import SettingsPage from './SettingsPage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/hooks/useAccountSettings', () => ({
  useUpdateAccountProfileMutation: vi.fn(),
  useChangePasswordMutation: vi.fn(),
  useSendOtpMutation: vi.fn(),
}))

const profileMutateMock = vi.fn()
const passwordMutateMock = vi.fn()
const otpMutateMock = vi.fn()

const baseUser = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'owner@shop.com',
  emailVerifiedAt: null as string | null,
  phoneVerifiedAt: '2026-01-01T00:00:00Z' as string | null,
  isTwoFactorEnabled: false,
}

function renderPage() {
  return render(<SettingsPage />)
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.mocked(useAuthStore).mockReturnValue({ user: baseUser } as never)
    vi.mocked(useUpdateAccountProfileMutation).mockReturnValue({ mutate: profileMutateMock, isPending: false } as never)
    vi.mocked(useChangePasswordMutation).mockReturnValue({ mutate: passwordMutateMock, isPending: false } as never)
    vi.mocked(useSendOtpMutation).mockReturnValue({ mutate: otpMutateMock, isPending: false } as never)
    profileMutateMock.mockReset()
    passwordMutateMock.mockReset()
    otpMutateMock.mockReset()
  })

  it('shows unverified email with a verify action and verified phone', () => {
    renderPage()

    expect(screen.getByText('Unverified')).toBeInTheDocument()
    expect(screen.getByText('Verified')).toBeInTheDocument()
  })

  it('sends an email verification OTP', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^verify$/i }))
    expect(otpMutateMock).toHaveBeenCalledWith('EMAIL_VERIFICATION')
  })

  it('keeps the save button disabled until the profile form is edited', async () => {
    const user = userEvent.setup()
    renderPage()

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    expect(saveButton).toBeDisabled()

    await user.clear(screen.getByLabelText(/first name/i))
    await user.type(screen.getByLabelText(/first name/i), 'Janet')
    expect(saveButton).toBeEnabled()

    await user.click(saveButton)
    await waitFor(() => expect(profileMutateMock).toHaveBeenCalledWith({ firstName: 'Janet', lastName: 'Doe' }))
  })

  it('rejects mismatched new passwords', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/current password/i), 'oldpass1')
    await user.type(screen.getByLabelText(/^new password/i), 'newpassword1')
    await user.type(screen.getByLabelText(/confirm new password/i), 'different1')
    await user.click(screen.getByRole('button', { name: /change password/i }))

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
    expect(passwordMutateMock).not.toHaveBeenCalled()
  })

  it('submits a valid password change', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/current password/i), 'oldpass1')
    await user.type(screen.getByLabelText(/^new password/i), 'newpassword1')
    await user.type(screen.getByLabelText(/confirm new password/i), 'newpassword1')
    await user.click(screen.getByRole('button', { name: /change password/i }))

    await waitFor(() =>
      expect(passwordMutateMock).toHaveBeenCalledWith({
        currentPassword: 'oldpass1',
        newPassword: 'newpassword1',
        confirmPassword: 'newpassword1',
      }),
    )
  })
})
