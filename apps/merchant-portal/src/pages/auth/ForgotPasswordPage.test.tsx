import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useForgotPasswordMutation } from '@/hooks/useAuthMutations'

import ForgotPasswordPage from './ForgotPasswordPage'

vi.mock('@/hooks/useAuthMutations', () => ({ useForgotPasswordMutation: vi.fn() }))

const mutateMock = vi.fn()

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    mutateMock.mockReset()
    vi.mocked(useForgotPasswordMutation).mockReturnValue({ mutate: mutateMock, isPending: false, isSuccess: false } as never)
  })

  it('requires an email before submitting', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /send reset otp/i }))

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('submits the email', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/email address/i), 'owner@shop.com')
    await user.click(screen.getByRole('button', { name: /send reset otp/i }))

    expect(mutateMock).toHaveBeenCalledWith({ email: 'owner@shop.com' }, expect.any(Object))
  })

  it('shows a confirmation screen once the request succeeds', () => {
    vi.mocked(useForgotPasswordMutation).mockReturnValue({ mutate: mutateMock, isPending: false, isSuccess: true } as never)
    renderPage()

    expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /enter otp/i })).toBeInTheDocument()
  })
})
