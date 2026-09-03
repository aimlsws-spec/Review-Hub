import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import toast from 'react-hot-toast'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useResetPasswordMutation } from '@/hooks/useAuthMutations'

import ResetPasswordPage from './ResetPasswordPage'

vi.mock('@/hooks/useAuthMutations', () => ({ useResetPasswordMutation: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const mutateMock = vi.fn()

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/reset-password']}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/login" element={<div>Login Landing</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fillForm(user: ReturnType<typeof userEvent.setup>, overrides: Partial<Record<'email' | 'code' | 'password' | 'confirmPassword', string>> = {}) {
  await user.type(screen.getByLabelText(/email address/i), overrides.email ?? 'owner@shop.com')
  await user.type(screen.getByLabelText(/otp code/i), overrides.code ?? '123456')
  await user.type(screen.getByLabelText(/^new password/i), overrides.password ?? 'newpassword1')
  await user.type(screen.getByLabelText(/confirm new password/i), overrides.confirmPassword ?? 'newpassword1')
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    mutateMock.mockReset()
    vi.mocked(useResetPasswordMutation).mockReturnValue({ mutate: mutateMock, isPending: false } as never)
  })

  it('requires all fields before submitting', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /reset password/i }))

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('rejects mismatched passwords', async () => {
    const user = userEvent.setup()
    renderPage()

    await fillForm(user, { confirmPassword: 'somethingelse1' })
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('submits the reset and redirects to login on success', async () => {
    mutateMock.mockImplementation((_data, { onSuccess }: { onSuccess: () => void }) => onSuccess())
    const user = userEvent.setup()
    renderPage()

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    expect(mutateMock).toHaveBeenCalledWith(
      { email: 'owner@shop.com', code: '123456', password: 'newpassword1', confirmPassword: 'newpassword1' },
      expect.any(Object),
    )
    await waitFor(() => expect(screen.getByText('Login Landing')).toBeInTheDocument())
  })

  it('shows an error toast when the reset fails', async () => {
    mutateMock.mockImplementation((_data, { onError }: { onError: (e: unknown) => void }) =>
      onError({ response: { data: { message: 'OTP expired' } } }),
    )
    const user = userEvent.setup()
    renderPage()

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    await waitFor(() => expect(vi.mocked(toast.error)).toHaveBeenCalledWith('OTP expired'))
  })
})
