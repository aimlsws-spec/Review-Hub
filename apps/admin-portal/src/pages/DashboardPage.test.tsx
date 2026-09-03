import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useAuthStore } from '@/stores/auth.store'

import DashboardPage from './DashboardPage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/hooks/useDashboardStats', () => ({ useDashboardStats: vi.fn() }))

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(useAuthStore).mockReturnValue({ user: { firstName: 'Ava' } } as never)
    vi.mocked(useDashboardStats).mockReturnValue({
      campaigns: { total: 3, loading: false },
      withdrawals: { total: 7, loading: false },
      fraudFlags: { total: 2, loading: false },
      users: { total: 4200, loading: false },
    } as never)
  })

  it('greets the admin by first name', () => {
    renderPage()
    expect(screen.getByText(/welcome back, ava/i)).toBeInTheDocument()
  })

  it('renders the headline counters with links to their queues', () => {
    renderPage()

    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('4200')).toBeInTheDocument()

    expect(screen.getByText(/campaigns awaiting review/i).closest('a')).toHaveAttribute('href', '/campaigns')
    expect(screen.getByText(/withdrawals pending review/i).closest('a')).toHaveAttribute('href', '/withdrawals')
    expect(screen.getByText(/unresolved fraud flags/i).closest('a')).toHaveAttribute('href', '/fraud')
    expect(screen.getByText(/total platform users/i).closest('a')).toHaveAttribute('href', '/users')
  })

  it('links to CMS and audit log management', () => {
    renderPage()

    expect(screen.getByText(/manage content/i).closest('a')).toHaveAttribute('href', '/cms/pages')
    expect(screen.getByText(/review activity/i).closest('a')).toHaveAttribute('href', '/audit-logs')
  })
})
