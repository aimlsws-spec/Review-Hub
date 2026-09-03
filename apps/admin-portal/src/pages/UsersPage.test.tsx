import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUserActionMutation, useUserDetailQuery, useUsersQuery } from '@/hooks/useUsers'

import UsersPage from './UsersPage'

vi.mock('@/hooks/useUsers', () => ({
  useUsersQuery: vi.fn(),
  useUserDetailQuery: vi.fn(),
  useUserActionMutation: vi.fn(),
}))

const activeUser = {
  id: 'user-1',
  firstName: 'Sam',
  lastName: 'Lee',
  email: 'sam@example.com',
  phone: null,
  avatarUrl: null,
  status: 'ACTIVE',
  emailVerifiedAt: '2026-01-01T00:00:00Z',
  phoneVerifiedAt: null,
  lastLoginAt: null,
  referralCode: 'SAM123',
  createdAt: '2026-01-01T00:00:00Z',
  deletedAt: null,
}

const applyActionMock = vi.fn()

function renderPage() {
  return render(<UsersPage />)
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.mocked(useUsersQuery).mockReturnValue({
      data: { data: { data: { data: [activeUser], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useUserDetailQuery).mockReturnValue({ data: undefined, isLoading: false } as never)
    vi.mocked(useUserActionMutation).mockReturnValue({ mutate: applyActionMock, isPending: false } as never)
    applyActionMock.mockReset()
  })

  it('shows an empty state when no users match', () => {
    vi.mocked(useUsersQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()
    expect(screen.getByText(/no users found/i)).toBeInTheDocument()
  })

  it('renders a user row with contact and status', () => {
    renderPage()

    expect(screen.getByText('Sam Lee')).toBeInTheDocument()
    expect(screen.getByText('sam@example.com')).toBeInTheDocument()
  })

  it('applies the search filter when Enter is pressed', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/search/i), 'sam{Enter}')

    await waitFor(() =>
      expect(useUsersQuery).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: 'sam' })),
    )
  })

  it('suspends a user after confirming', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /suspend/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /^suspend$/i }))

    await waitFor(() => expect(applyActionMock).toHaveBeenCalledWith({ user: activeUser, action: 'suspend' }))
  })

  it('bans a user after confirming', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^ban$/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /^ban$/i }))

    await waitFor(() => expect(applyActionMock).toHaveBeenCalledWith({ user: activeUser, action: 'ban' }))
  })

  it('opens the user detail modal on row click', async () => {
    vi.mocked(useUserDetailQuery).mockReturnValue({ data: { data: { data: activeUser } }, isLoading: false } as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByText('Sam Lee'))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('SAM123')).toBeInTheDocument()
    expect(dialog.getByText('Not verified')).toBeInTheDocument()
  })

  it('shows a reactivate action for a suspended user', async () => {
    const suspendedUser = { ...activeUser, status: 'SUSPENDED' }
    vi.mocked(useUsersQuery).mockReturnValue({
      data: { data: { data: { data: [suspendedUser], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /reactivate/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /^reactivate$/i }))

    await waitFor(() => expect(applyActionMock).toHaveBeenCalledWith({ user: suspendedUser, action: 'reactivate' }))
  })
})
