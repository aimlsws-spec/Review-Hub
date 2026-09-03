import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth.store'

import NotFoundPage from './NotFoundPage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))

const navigateMock = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

function renderPage() {
  return render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>,
  )
}

describe('NotFoundPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
  })

  it('links to the dashboard when authenticated', () => {
    vi.mocked(useAuthStore).mockReturnValue({ isAuthenticated: true } as never)
    renderPage()
    expect(screen.getByRole('link', { name: /go to dashboard/i })).toHaveAttribute('href', '/dashboard')
  })

  it('links to login when not authenticated', () => {
    vi.mocked(useAuthStore).mockReturnValue({ isAuthenticated: false } as never)
    renderPage()
    expect(screen.getByRole('link', { name: /go to login/i })).toHaveAttribute('href', '/login')
  })

  it('navigates back when "Go back" is clicked', async () => {
    vi.mocked(useAuthStore).mockReturnValue({ isAuthenticated: false } as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /go back/i }))
    expect(navigateMock).toHaveBeenCalledWith(-1)
  })
})
