import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'react-hot-toast'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuth } from '@/contexts/AuthContext'

import LoginPage from './LoginPage'

vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('react-hot-toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const loginMock = vi.fn()
const verifyDeviceMock = vi.fn()
const resendDeviceCodeMock = vi.fn()

const challenge = { requiresVerification: true, challengeToken: 'c'.repeat(64), expiresIn: 300, sentTo: ['a****n@viralkar.com'] }

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
    loginMock.mockReset()
    verifyDeviceMock.mockReset()
    resendDeviceCodeMock.mockReset()
    vi.mocked(useAuth).mockReturnValue({
      login: loginMock,
      verifyDevice: verifyDeviceMock,
      resendDeviceCode: resendDeviceCodeMock,
    } as never)
  })

  it('shows validation errors when submitted empty', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    expect(loginMock).not.toHaveBeenCalled()
  })

  it('submits credentials and redirects on success', async () => {
    loginMock.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/email address/i), 'admin@viralkar.com')
    await user.type(screen.getByLabelText(/^password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(loginMock).toHaveBeenCalledWith({ email: 'admin@viralkar.com', password: 'secret123', rememberMe: false })
    await waitFor(() => expect(screen.getByText('Dashboard Landing')).toBeInTheDocument())
  })

  it('shows an error toast when login fails', async () => {
    loginMock.mockRejectedValue({ response: { data: { message: 'Invalid credentials' } } })
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/email address/i), 'admin@viralkar.com')
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
      loginMock.mockResolvedValue(challenge)
      const user = userEvent.setup()
      renderPage()
      await user.type(screen.getByLabelText(/email address/i), 'admin@viralkar.com')
      await user.type(screen.getByLabelText(/^password/i), 'secret123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))
      return user
    }

    it('asks for the code that was sent instead of signing in', async () => {
      await signInToChallenge()

      expect(await screen.findByLabelText(/verification code/i)).toBeInTheDocument()
      expect(screen.getByText(/a\*\*\*\*n@viralkar\.com/)).toBeInTheDocument()
      expect(screen.queryByText('Dashboard Landing')).not.toBeInTheDocument()
    })

    it('finishes the sign-in with the code', async () => {
      verifyDeviceMock.mockResolvedValue(undefined)
      const user = await signInToChallenge()

      await user.type(await screen.findByLabelText(/verification code/i), '123456')
      await user.click(screen.getByRole('button', { name: /verify and sign in/i }))

      await waitFor(() => expect(verifyDeviceMock).toHaveBeenCalledWith(challenge, '123456', false))
      await waitFor(() => expect(screen.getByText('Dashboard Landing')).toBeInTheDocument())
    })

    it('refuses a short code without calling the server', async () => {
      const user = await signInToChallenge()

      await user.type(await screen.findByLabelText(/verification code/i), '123')
      await user.click(screen.getByRole('button', { name: /verify and sign in/i }))

      expect(await screen.findByText(/enter the 6-digit code/i)).toBeInTheDocument()
      expect(verifyDeviceMock).not.toHaveBeenCalled()
    })
  })
})
