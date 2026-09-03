import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import toast from 'react-hot-toast'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useChangePasswordMutation } from '@/hooks/useChangePassword'
import { useAuthStore } from '@/stores/auth.store'

import ProfilePage from './ProfilePage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/hooks/useChangePassword', () => ({ useChangePasswordMutation: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const user = {
  firstName: 'Ava',
  lastName: 'Admin',
  email: 'ava@viralkar.com',
  status: 'ACTIVE',
  isTwoFactorEnabled: true,
  createdAt: '2026-01-01T00:00:00Z',
}

const mutateMock = vi.fn()

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfilePage />
    </QueryClientProvider>,
  )
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.mocked(useAuthStore).mockReturnValue({ user } as never)
    vi.mocked(useChangePasswordMutation).mockImplementation((onSuccessCb) => ({
      mutate: (vars: unknown) => {
        mutateMock(vars)
        onSuccessCb?.()
      },
      isPending: false,
    }) as never)
    mutateMock.mockReset()
  })

  it('renders the admin account details', () => {
    renderPage()

    expect(screen.getByText('Ava Admin')).toBeInTheDocument()
    expect(screen.getByText('ava@viralkar.com')).toBeInTheDocument()
    expect(screen.getByText('ACTIVE')).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
  })

  it('rejects mismatched new passwords without calling the mutation', async () => {
    const testUser = userEvent.setup()
    renderPage()

    await testUser.type(screen.getByLabelText(/current password/i), 'oldpassword1')
    await testUser.type(screen.getByLabelText(/^new password/i), 'NewPass1!')
    await testUser.type(screen.getByLabelText(/confirm new password/i), 'Different1!')
    await testUser.click(screen.getByRole('button', { name: /change password/i }))

    expect(await screen.findByText(/new passwords do not match/i)).toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('rejects a weak new password', async () => {
    const testUser = userEvent.setup()
    renderPage()

    await testUser.type(screen.getByLabelText(/current password/i), 'oldpassword1')
    await testUser.type(screen.getByLabelText(/^new password/i), 'weak')
    await testUser.type(screen.getByLabelText(/confirm new password/i), 'weak')
    await testUser.click(screen.getByRole('button', { name: /change password/i }))

    expect(await screen.findByText(/must be 8\+ characters/i)).toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('submits a valid password change', async () => {
    const testUser = userEvent.setup()
    renderPage()

    await testUser.type(screen.getByLabelText(/current password/i), 'oldpassword1')
    await testUser.type(screen.getByLabelText(/^new password/i), 'NewPass1!')
    await testUser.type(screen.getByLabelText(/confirm new password/i), 'NewPass1!')
    await testUser.click(screen.getByRole('button', { name: /change password/i }))

    await waitFor(() =>
      expect(mutateMock).toHaveBeenCalledWith({ currentPassword: 'oldpassword1', newPassword: 'NewPass1!' }),
    )
    await waitFor(() => expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Password changed successfully'))
  })
})
