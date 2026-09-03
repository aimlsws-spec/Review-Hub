import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import toast from 'react-hot-toast'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useLoginMutation } from '@/hooks/useAuthMutations'

import LoginPage from './LoginPage'

vi.mock('@/hooks/useAuthMutations', () => ({ useLoginMutation: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const mutateMock = vi.fn()

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
    vi.mocked(useLoginMutation).mockReturnValue({ mutate: mutateMock, isPending: false } as never)
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
})
