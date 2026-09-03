import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuditLogsQuery } from '@/hooks/useAuditLogs'

import AuditLogsPage from './AuditLogsPage'

vi.mock('@/hooks/useAuditLogs', () => ({ useAuditLogsQuery: vi.fn() }))

const log = {
  id: 'log-1',
  actorId: 'admin-12345678',
  actorType: 'ADMIN',
  entity: 'Campaign',
  entityId: 'campaign-12345678',
  action: 'APPROVE',
  before: null,
  after: null,
  ipAddress: '127.0.0.1',
  createdAt: '2026-01-01T00:00:00Z',
}

function renderPage() {
  return render(<AuditLogsPage />)
}

describe('AuditLogsPage', () => {
  beforeEach(() => {
    vi.mocked(useAuditLogsQuery).mockReturnValue({
      data: { data: { data: { data: [log], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
  })

  it('shows an empty state when there are no log entries', () => {
    vi.mocked(useAuditLogsQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()
    expect(screen.getByText(/no audit log entries/i)).toBeInTheDocument()
  })

  it('shows an error state with a retry action', async () => {
    const refetch = vi.fn()
    vi.mocked(useAuditLogsQuery).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch } as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it('renders a log entry with action, entity, and actor', () => {
    renderPage()

    expect(screen.getByText('APPROVE')).toBeInTheDocument()
    expect(screen.getByText('Campaign')).toBeInTheDocument()
    expect(screen.getByText('(ADMIN)')).toBeInTheDocument()
  })

  it('filters by entity when Enter is pressed', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/entity/i), 'User{Enter}')

    await waitFor(() =>
      expect(useAuditLogsQuery).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, entity: 'User' })),
    )
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('clears the entity filter', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/entity/i), 'User{Enter}')
    await user.click(screen.getByRole('button', { name: /clear/i }))

    await waitFor(() =>
      expect(useAuditLogsQuery).toHaveBeenLastCalledWith(expect.objectContaining({ entity: '' })),
    )
  })
})
