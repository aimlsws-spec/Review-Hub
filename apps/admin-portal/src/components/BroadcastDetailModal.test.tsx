import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAudienceLocationsQuery, useBroadcastQuery, useCancelBroadcastMutation } from '@/hooks/useNotificationCenter'

import { BroadcastDetailModal } from './BroadcastDetailModal'

vi.mock('@/hooks/useNotificationCenter', () => ({
  useBroadcastQuery: vi.fn(),
  useAudienceLocationsQuery: vi.fn(),
  useCancelBroadcastMutation: vi.fn(),
}))

const broadcast = {
  id: 'b1',
  title: 'Happy hour!',
  message: 'Hi {{firstName}}, tasks are live.',
  type: 'PROMOTIONAL',
  channels: ['IN_APP', 'PUSH', 'EMAIL'],
  audience: { stateIds: ['s1'], gender: 'FEMALE' },
  status: 'SENT',
  scheduledAt: '2026-09-19T10:00:00Z',
  startedAt: '2026-09-19T10:00:05Z',
  completedAt: '2026-09-19T10:01:00Z',
  recipientCount: 1240,
  smartTiming: false,
  failureReason: null,
  createdAt: '2026-09-19T09:00:00Z',
  createdBy: { id: 'admin-1', name: 'Asha Rao' },
  deliveries: [
    { channel: 'IN_APP', status: 'SENT', count: 30 },
    { channel: 'IN_APP', status: 'READ', count: 10 },
    { channel: 'PUSH', status: 'SENT', count: 900 },
    { channel: 'EMAIL', status: 'SENT', count: 700 },
    { channel: 'EMAIL', status: 'FAILED', count: 20 },
    { channel: 'EMAIL', status: 'QUEUED', count: 5 },
  ],
}

const cancelMock = vi.fn()
const onClose = vi.fn()

const withBroadcast = (overrides: Record<string, unknown> = {}) =>
  vi.mocked(useBroadcastQuery).mockReturnValue({ data: { data: { data: { ...broadcast, ...overrides } } }, isLoading: false, isError: false } as never)

const renderModal = () => render(<BroadcastDetailModal broadcastId="b1" onClose={onClose} />)

const rowFor = (channel: string) => within(screen.getByRole('row', { name: new RegExp(`^${channel}`) }))

describe('BroadcastDetailModal', () => {
  beforeEach(() => {
    withBroadcast()
    vi.mocked(useAudienceLocationsQuery).mockReturnValue({ data: { data: { data: [{ id: 's1', name: 'Gujarat', cities: [] }] } } } as never)
    vi.mocked(useCancelBroadcastMutation).mockReturnValue({ mutate: cancelMock, isPending: false } as never)
    cancelMock.mockReset()
    onClose.mockReset()
  })

  it('shows what was sent and to whom', () => {
    renderModal()

    expect(screen.getByText('Happy hour!')).toBeInTheDocument()
    // "Sent" is also a column header in the delivery table, so target the status badge.
    expect(screen.getByText('Sent', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('Gujarat · Female')).toBeInTheDocument()
    expect(screen.getByText('In-app, Push, Email')).toBeInTheDocument()
    expect(screen.getByText('1,240')).toBeInTheDocument()
    expect(screen.getByText(/Asha Rao on/)).toBeInTheDocument()
  })

  it("says whether messages went out all at once or each at that person's best time", () => {
    const { unmount } = renderModal()
    expect(screen.getByText('All at once')).toBeInTheDocument()
    unmount()

    withBroadcast({ smartTiming: true })
    renderModal()
    expect(screen.getByText("Each person's best time")).toBeInTheDocument()
  })

  describe('delivery numbers', () => {
    it('adds up each channel’s statuses into one row', () => {
      renderModal()

      // Columns: Channel, Messages, Sent, Read, Failed, Waiting
      const cells = (channel: string) => rowFor(channel).getAllByRole('cell').map((cell) => cell.textContent)
      expect(cells('In-app')).toEqual(['In-app', '40', '40', '10', '0', '0'])
      expect(cells('Push')).toEqual(['Push', '900', '900', '0', '0', '0'])
      expect(cells('Email')).toEqual(['Email', '725', '700', '0', '20', '5'])
    })

    it('shows zeros for a channel that produced nothing, rather than hiding it', () => {
      withBroadcast({ deliveries: [] })
      renderModal()

      expect(rowFor('Push').getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['Push', '0', '0', '0', '0', '0'])
    })

    it('explains why a channel can show fewer messages than recipients', () => {
      renderModal()

      expect(screen.getByText(/turned off a channel are skipped/i)).toBeInTheDocument()
    })
  })

  describe('status-specific details', () => {
    it('tells the admin numbers are still moving while it is sending', () => {
      withBroadcast({ status: 'SENDING', completedAt: null })
      renderModal()

      expect(screen.getByText(/still sending/i)).toBeInTheDocument()
    })

    it('shows why a broadcast failed', () => {
      withBroadcast({ status: 'FAILED', failureReason: 'Redis connection lost' })
      renderModal()

      expect(screen.getByText('Redis connection lost')).toBeInTheDocument()
    })

    it('offers no cancel once a broadcast has started or finished', () => {
      for (const status of ['SENDING', 'SENT', 'FAILED', 'CANCELLED']) {
        withBroadcast({ status })
        const { unmount } = renderModal()

        expect(screen.queryByRole('button', { name: 'Cancel broadcast' })).not.toBeInTheDocument()
        unmount()
      }
    })
  })

  describe('cancelling a scheduled broadcast', () => {
    beforeEach(() => withBroadcast({ status: 'SCHEDULED', startedAt: null, completedAt: null, recipientCount: 0 }))

    it('asks first, and only then cancels', async () => {
      const user = userEvent.setup()
      renderModal()

      await user.click(screen.getByRole('button', { name: 'Cancel broadcast' }))
      expect(cancelMock).not.toHaveBeenCalled()
      expect(screen.getByText(/nobody will receive it/i)).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Yes, cancel broadcast' }))
      expect(cancelMock).toHaveBeenCalledWith('b1')
    })

    it('lets the admin change their mind', async () => {
      const user = userEvent.setup()
      renderModal()

      await user.click(screen.getByRole('button', { name: 'Cancel broadcast' }))
      await user.click(screen.getByRole('button', { name: 'Keep it' }))

      expect(cancelMock).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Cancel broadcast' })).toBeInTheDocument()
    })

    it('disables the buttons while cancelling', async () => {
      const user = userEvent.setup()
      vi.mocked(useCancelBroadcastMutation).mockReturnValue({ mutate: cancelMock, isPending: true } as never)
      renderModal()
      await user.click(screen.getByRole('button', { name: 'Cancel broadcast' }))

      expect(screen.getByRole('button', { name: 'Yes, cancel broadcast' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Keep it' })).toBeDisabled()
    })
  })

  it('shows a loading state, then an error if the broadcast cannot be loaded', () => {
    vi.mocked(useBroadcastQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false } as never)
    const { unmount } = renderModal()
    expect(screen.queryByText('Happy hour!')).not.toBeInTheDocument()
    unmount()

    vi.mocked(useBroadcastQuery).mockReturnValue({ data: undefined, isLoading: false, isError: true } as never)
    renderModal()
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument()
  })

  it('closes from the footer', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalled()
  })
})
