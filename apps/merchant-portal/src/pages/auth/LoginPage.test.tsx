import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'react-hot-toast'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuth } from '@/contexts/AuthContext'
import { useLoginMutation } from '@/hooks/useAuthMutations'

import LoginPage from './LoginPage'

vi.mock('@/hooks/useAuthMutations', () => ({ useLoginMutation: vi.fn() }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('react-hot-toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mutateMock = vi.fn()
const verifyDeviceMock = vi.fn()
const resendDeviceCodeMock = vi.fn()

const challenge = { requiresVerification: true, challengeToken: 'c'.repeat(64), expiresIn: 300, sentTo: ['o****r@shop.com'] }

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<div>Dashboard Landing</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    mutateMock.mockReset()
    verifyDeviceMock.mockReset()
    resendDeviceCodeMock.mockReset()
    vi.mocked(useLoginMutation).mockReturnValue({ mutate: mutateMock, isPending: false } as never)
    vi.mocked(useAuth).mockReturnValue({ verifyDevice: verifyDeviceMock, resendDeviceCode: resendDeviceCodeMock } as never)
  })

  it('shows validation errors when submitted empty', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('submits credentials and redirects on success', async () => {
    mutateMock.mockImplementation((_data, { onSuccess }: { onSuccess: () => void }) => onSuccess())
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/email address/i), 'owner@shop.com')
    await user.type(screen.getByLabelText(/^password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(mutateMock).toHaveBeenCalledWith(
      { email: 'owner@shop.com', password: 'secret123', rememberMe: false },
      expect.any(Object),
    )
    await waitFor(() => expect(screen.getByText('Dashboard Landing')).toBeInTheDocument())
  })

  it('shows an error toast when login fails', async () => {
    mutateMock.mockImplementation((_data, { onError }: { onError: (e: unknown) => void }) =>
      onError({ response: { data: { message: 'Invalid credentials' } } }),
    )
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/email address/i), 'owner@shop.com')
    await user.type(screen.getByLabelText(/^password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Invalid credentials'))
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    renderPage()

    const passwordInput = screen.getByLabelText(/^password/i)
    expect(passwordInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: /show password/i }))
    expect(passwordInput).toHaveAttribute('type', 'text')
  })

  describe('from a new browser', () => {
    async function signInToChallenge() {
      mutateMock.mockImplementation((_data, { onSuccess }: { onSuccess: (c: unknown) => void }) => onSuccess(challenge))
      const user = userEvent.setup()
      renderPage()
      await user.type(screen.getByLabelText(/email address/i), 'owner@shop.com')
      await user.type(screen.getByLabelText(/^password/i), 'secret123')
      await user.click(screen.getByRole('checkbox', { name: /remember me/i }))
      await user.click(screen.getByRole('button', { name: /sign in/i }))
      return user
    }

    it('asks for the code that was sent instead of signing in', async () => {
      await signInToChallenge()

      expect(await screen.findByText(/enter the code we sent to o\*\*\*\*r@shop.com/i)).toBeInTheDocument()
      expect(screen.queryByText('Dashboard Landing')).not.toBeInTheDocument()
    })

    it('finishes the sign-in with the code, keeping "remember me"', async () => {
      verifyDeviceMock.mockResolvedValue(undefined)
      const user = await signInToChallenge()

      await user.type(await screen.findByLabelText(/verification code/i), '123456')
      await user.click(screen.getByRole('button', { name: /verify and sign in/i }))

      await waitFor(() => expect(verifyDeviceMock).toHaveBeenCalledWith(challenge, '123456', true))
      await waitFor(() => expect(screen.getByText('Dashboard Landing')).toBeInTheDocument())
    })

    it('shows why a code was refused and stays on the step', async () => {
      verifyDeviceMock.mockRejectedValue({ response: { data: { message: 'That code is not right. Please check it and try again.' } } })
      const user = await signInToChallenge()

      await user.type(await screen.findByLabelText(/verification code/i), '000000')
      await user.click(screen.getByRole('button', { name: /verify and sign in/i }))

      expect(await screen.findByText('That code is not right. Please check it and try again.')).toBeInTheDocument()
      expect(screen.queryByText('Dashboard Landing')).not.toBeInTheDocument()
    })

    it('goes back to the sign-in form', async () => {
      const user = await signInToChallenge()

      await user.click(await screen.findByRole('button', { name: /back/i }))

      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })
  })
})
