import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useCancelInvitationMutation,
  useInvitationsQuery,
  useInviteMemberMutation,
  useRemoveMemberMutation,
  useTeamQuery,
  useUpdateMemberRoleMutation,
} from '@/hooks/useTeam'
import { useAuthStore } from '@/stores/auth.store'

import TeamPage from './TeamPage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/hooks/useTeam', () => ({
  useTeamQuery: vi.fn(),
  useInvitationsQuery: vi.fn(),
  useInviteMemberMutation: vi.fn(),
  useRemoveMemberMutation: vi.fn(),
  useUpdateMemberRoleMutation: vi.fn(),
  useCancelInvitationMutation: vi.fn(),
}))

const member = {
  id: 'member-1',
  role: 'MANAGER',
  status: 'ACTIVE',
  joinedAt: '2026-01-01T00:00:00Z',
  user: { firstName: 'Sam', lastName: 'Lee', email: 'sam@shop.com', avatarUrl: null },
}

const invitation = {
  id: 'inv-1',
  email: 'new@shop.com',
  role: 'ANALYST',
  status: 'PENDING',
  expiresAt: '2026-02-01T00:00:00Z',
}

const inviteMutateMock = vi.fn()
const removeMutateMock = vi.fn()
const updateRoleMutateMock = vi.fn()
const cancelMutateMock = vi.fn()

function mockAuthState(merchantId: string | undefined) {
  vi.mocked(useAuthStore).mockImplementation(
    ((selector: (s: { merchant: { id: string } | null }) => unknown) => selector({ merchant: merchantId ? { id: merchantId } : null })) as unknown as typeof useAuthStore,
  )
}

function renderPage() {
  return render(<TeamPage />)
}

describe('TeamPage', () => {
  beforeEach(() => {
    mockAuthState('merchant-1')
    vi.mocked(useTeamQuery).mockReturnValue({ data: { data: { data: [member] } }, isLoading: false, isError: false, refetch: vi.fn() } as never)
    vi.mocked(useInvitationsQuery).mockReturnValue({ data: { data: { data: [invitation] } }, isLoading: false } as never)
    vi.mocked(useInviteMemberMutation).mockReturnValue({ mutate: inviteMutateMock, isPending: false } as never)
    vi.mocked(useRemoveMemberMutation).mockReturnValue({ mutate: removeMutateMock, isPending: false } as never)
    vi.mocked(useUpdateMemberRoleMutation).mockReturnValue({ mutate: updateRoleMutateMock, isPending: false } as never)
    vi.mocked(useCancelInvitationMutation).mockReturnValue({ mutate: cancelMutateMock, isPending: false } as never)
    inviteMutateMock.mockReset()
    removeMutateMock.mockReset()
    updateRoleMutateMock.mockReset()
    cancelMutateMock.mockReset()
  })

  it('shows an empty state when there are no team members', () => {
    vi.mocked(useTeamQuery).mockReturnValue({ data: { data: { data: [] } }, isLoading: false, isError: false, refetch: vi.fn() } as never)
    vi.mocked(useInvitationsQuery).mockReturnValue({ data: { data: { data: [] } }, isLoading: false } as never)
    renderPage()
    expect(screen.getByText(/no team members yet/i)).toBeInTheDocument()
  })

  it('renders a team member row and a pending invitation', () => {
    renderPage()

    expect(screen.getByText('Sam Lee')).toBeInTheDocument()
    expect(screen.getByText('sam@shop.com')).toBeInTheDocument()
    expect(screen.getByText('Manager')).toBeInTheDocument()
    expect(screen.getByText('new@shop.com')).toBeInTheDocument()
  })

  it('sends an invitation with the entered email and role', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /invite member/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/email address/i), 'new-hire@shop.com')
    await user.selectOptions(dialog.getByLabelText(/role/i), 'VIEWER')
    await user.click(dialog.getByRole('button', { name: /send invitation/i }))

    await waitFor(() => expect(inviteMutateMock).toHaveBeenCalledWith({ email: 'new-hire@shop.com', role: 'VIEWER' }))
  })

  it('removes a team member after confirming', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /remove/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /^remove$/i }))

    await waitFor(() => expect(removeMutateMock).toHaveBeenCalledWith('member-1'))
  })

  it('changes a member role', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /change role/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.selectOptions(dialog.getByLabelText(/role/i), 'ADMIN')
    await user.click(dialog.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(updateRoleMutateMock).toHaveBeenCalledWith({ memberId: 'member-1', role: 'ADMIN' }))
  })

  it('cancels a pending invitation after confirming', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /cancel invitation/i }))

    await waitFor(() => expect(cancelMutateMock).toHaveBeenCalledWith('inv-1'))
  })
})
