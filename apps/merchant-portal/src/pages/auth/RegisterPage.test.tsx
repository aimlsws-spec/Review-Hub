import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import toast from 'react-hot-toast'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useRegisterMutation } from '@/hooks/useAuthMutations'
import { useAuthStore } from '@/stores/auth.store'

import RegisterPage from './RegisterPage'

vi.mock('@/hooks/useAuthMutations', () => ({ useRegisterMutation: vi.fn() }))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const mutateMock = vi.fn()
const setAuthMock = vi.fn()

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<div>Dashboard Landing</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RegisterPage', () => {
  beforeEach(() => {
    mutateMock.mockReset()
    setAuthMock.mockReset()
    vi.mocked(useRegisterMutation).mockReturnValue({ mutate: mutateMock, isPending: false } as never)
    vi.mocked(useAuthStore).mockReturnValue({ setAuth: setAuthMock } as never)
  })

  it('shows validation errors when submitted empty', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findAllByText(/required/i)).not.toHaveLength(0)
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('rejects mismatched passwords', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/first name/i), 'Jane')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.type(screen.getByLabelText(/email address/i), 'jane@shop.com')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'different123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('registers, stores the session, and redirects on success', async () => {
    mutateMock.mockImplementation((_data, { onSuccess }: { onSuccess: (res: unknown) => void }) =>
      onSuccess({
        data: { data: { user: { id: 'u1' }, tokens: { accessToken: 'access', refreshToken: 'refresh' } } },
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/first name/i), 'Jane')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.type(screen.getByLabelText(/email address/i), 'jane@shop.com')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(setAuthMock).toHaveBeenCalledWith({ id: 'u1' }, null, 'access', 'refresh'))
    await waitFor(() => expect(screen.getByText('Dashboard Landing')).toBeInTheDocument())
  })

  it('shows an error toast when registration fails', async () => {
    mutateMock.mockImplementation((_data, { onError }: { onError: (e: unknown) => void }) =>
      onError({ response: { data: { message: 'Email already registered' } } }),
    )
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/first name/i), 'Jane')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.type(screen.getByLabelText(/email address/i), 'jane@shop.com')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Email already registered'))
  })
})
