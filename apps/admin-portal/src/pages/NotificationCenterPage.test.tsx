import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useAudienceLocationsQuery,
  useAudiencePreviewQuery,
  useBroadcastQuery,
  useBroadcastsQuery,
  useCancelBroadcastMutation,
  useCreateBroadcastMutation,
  useCreateTemplateMutation,
  useDeleteTemplateMutation,
  useNotificationTemplatesQuery,
  useUpdateTemplateMutation,
} from '@/hooks/useNotificationCenter'

import NotificationCenterPage from './NotificationCenterPage'

vi.mock('@/hooks/useNotificationCenter', () => ({
  useBroadcastsQuery: vi.fn(),
  useBroadcastQuery: vi.fn(),
  useAudienceLocationsQuery: vi.fn(),
  useAudiencePreviewQuery: vi.fn(),
  useCreateBroadcastMutation: vi.fn(),
  useCancelBroadcastMutation: vi.fn(),
  useNotificationTemplatesQuery: vi.fn(),
  useCreateTemplateMutation: vi.fn(),
  useUpdateTemplateMutation: vi.fn(),
  useDeleteTemplateMutation: vi.fn(),
}))
vi.mock('@/hooks/useDebouncedValue', () => ({ useDebouncedValue: <T,>(value: T) => value }))

const broadcast = {
  id: 'b1',
  title: 'Happy hour!',
  message: 'Tasks are live.',
  type: 'PROMOTIONAL',
  channels: ['IN_APP', 'PUSH'],
  audience: { gender: 'FEMALE' },
  status: 'SENT',
  scheduledAt: '2026-09-19T10:00:00Z',
  startedAt: null,
  completedAt: null,
  recipientCount: 1240,
  failureReason: null,
  createdAt: '2026-09-19T09:00:00Z',
  createdBy: { id: 'admin-1', name: 'Asha Rao' },
}
const template = {
  id: 't1',
  name: 'Weekend bonus',
  slug: 'weekend-bonus',
  subject: null,
  title: 'Weekend!',
  body: 'Hi {{firstName}}',
  channel: 'PUSH',
  isActive: true,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-02T00:00:00Z',
}

const listOf = (rows: unknown[]) =>
  ({ data: { data: { data: { data: rows, total: rows.length, page: 1, limit: 20 } } }, isLoading: false, isError: false, refetch: vi.fn() }) as never
const templatesOf = (rows: unknown[]) => ({ data: { data: { data: rows } }, isLoading: false, isError: false, refetch: vi.fn() }) as never

const deleteMock = vi.fn()

describe('NotificationCenterPage', () => {
  beforeEach(() => {
    vi.mocked(useBroadcastsQuery).mockReturnValue(listOf([broadcast]))
    vi.mocked(useBroadcastQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false } as never)
    vi.mocked(useAudienceLocationsQuery).mockReturnValue({ data: { data: { data: [] } } } as never)
    vi.mocked(useAudiencePreviewQuery).mockReturnValue({
      data: { data: { data: { total: 10, byChannel: { IN_APP: 10, PUSH: 8, EMAIL: 9 } } } },
      isFetching: false,
      isError: false,
    } as never)
    vi.mocked(useCreateBroadcastMutation).mockReturnValue({ mutate: vi.fn(), isPending: false } as never)
    vi.mocked(useCancelBroadcastMutation).mockReturnValue({ mutate: vi.fn(), isPending: false } as never)
    vi.mocked(useNotificationTemplatesQuery).mockReturnValue(templatesOf([template]))
    vi.mocked(useCreateTemplateMutation).mockReturnValue({ mutate: vi.fn(), isPending: false } as never)
    vi.mocked(useUpdateTemplateMutation).mockReturnValue({ mutate: vi.fn(), isPending: false } as never)
    vi.mocked(useDeleteTemplateMutation).mockReturnValue({ mutate: deleteMock, isPending: false } as never)
    deleteMock.mockReset()
  })

  describe('broadcasts tab', () => {
    it('lists broadcasts with their audience, channels, status and recipients', () => {
      render(<NotificationCenterPage />)

      const row = within(screen.getByRole('row', { name: /Happy hour!/ }))
      expect(row.getByText('Female')).toBeInTheDocument()
      expect(row.getByText('In-app, Push')).toBeInTheDocument()
      expect(row.getByText('Sent')).toBeInTheDocument()
      expect(row.getByText('1,240')).toBeInTheDocument()
      expect(row.getByRole('button', { name: 'View' })).toBeInTheDocument()
    })

    it('offers to cancel a scheduled broadcast and does not claim a recipient count yet', () => {
      vi.mocked(useBroadcastsQuery).mockReturnValue(listOf([{ ...broadcast, status: 'SCHEDULED', recipientCount: 0 }]))
      render(<NotificationCenterPage />)

      const row = within(screen.getByRole('row', { name: /Happy hour!/ }))
      expect(row.getByRole('button', { name: 'View or cancel' })).toBeInTheDocument()
      expect(row.getByText('—')).toBeInTheDocument()
    })

    it('starts on all statuses, and filtering goes back to page 1', async () => {
      const user = userEvent.setup()
      render(<NotificationCenterPage />)
      expect(useBroadcastsQuery).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, status: '' }))

      await user.selectOptions(screen.getByLabelText('Status'), 'Failed')

      expect(useBroadcastsQuery).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, status: 'FAILED' }))
    })

    it('shows an empty state, worded for whether a filter is on', async () => {
      const user = userEvent.setup()
      vi.mocked(useBroadcastsQuery).mockReturnValue(listOf([]))
      render(<NotificationCenterPage />)

      expect(screen.getByText('No broadcasts yet')).toBeInTheDocument()
      expect(screen.getByText(/send your first announcement/i)).toBeInTheDocument()

      await user.selectOptions(screen.getByLabelText('Status'), 'Sent')
      expect(screen.getByText(/no broadcasts have this status/i)).toBeInTheDocument()
    })

    it('shows an error state with a retry', async () => {
      const user = userEvent.setup()
      const refetch = vi.fn()
      vi.mocked(useBroadcastsQuery).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch } as never)
      render(<NotificationCenterPage />)

      await user.click(screen.getByRole('button', { name: /try again|retry/i }))

      expect(refetch).toHaveBeenCalled()
    })

    it('opens the details of a broadcast', async () => {
      const user = userEvent.setup()
      render(<NotificationCenterPage />)

      await user.click(screen.getByRole('button', { name: 'View' }))

      expect(within(screen.getByRole('dialog')).getByRole('heading', { name: 'Broadcast details' })).toBeInTheDocument()
      expect(useBroadcastQuery).toHaveBeenCalledWith('b1')
    })
  })

  describe('composing', () => {
    it('opens a blank broadcast from the header button', async () => {
      const user = userEvent.setup()
      render(<NotificationCenterPage />)

      await user.click(screen.getByRole('button', { name: 'New broadcast' }))

      const dialog = within(screen.getByRole('dialog'))
      expect(dialog.getByRole('heading', { name: 'New broadcast' })).toBeInTheDocument()
      expect(dialog.getByLabelText('Title')).toHaveValue('')
    })

    it('closes the composer without sending', async () => {
      const user = userEvent.setup()
      render(<NotificationCenterPage />)
      await user.click(screen.getByRole('button', { name: 'New broadcast' }))

      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('templates tab', () => {
    const openTemplates = async (user: ReturnType<typeof userEvent.setup>) => {
      render(<NotificationCenterPage />)
      await user.click(screen.getByRole('tab', { name: 'templates' }))
    }

    it('switches between tabs', async () => {
      const user = userEvent.setup()
      await openTemplates(user)

      expect(screen.getByRole('tab', { name: 'templates' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('Weekend bonus')).toBeInTheDocument()
      expect(screen.queryByText('Happy hour!')).not.toBeInTheDocument()
    })

    it('lists templates with their message and channel', async () => {
      const user = userEvent.setup()
      await openTemplates(user)

      const row = within(screen.getByRole('row', { name: /Weekend bonus/ }))
      expect(row.getByText('Weekend!')).toBeInTheDocument()
      expect(row.getByText('Hi {{firstName}}')).toBeInTheDocument()
      expect(row.getByText('Push')).toBeInTheDocument()
    })

    it('starts a broadcast from a template, already filled in', async () => {
      const user = userEvent.setup()
      await openTemplates(user)

      await user.click(screen.getByRole('button', { name: 'Use' }))

      const dialog = within(screen.getByRole('dialog'))
      expect(dialog.getByLabelText('Title')).toHaveValue('Weekend!')
      expect(dialog.getByLabelText('Message')).toHaveValue('Hi {{firstName}}')
    })

    it('will not start a broadcast from an inactive template', async () => {
      const user = userEvent.setup()
      vi.mocked(useNotificationTemplatesQuery).mockReturnValue(templatesOf([{ ...template, isActive: false }]))
      await openTemplates(user)

      expect(screen.getByRole('button', { name: 'Use' })).toBeDisabled()
    })

    it('opens the form to create and to edit', async () => {
      const user = userEvent.setup()
      await openTemplates(user)

      await user.click(screen.getByRole('button', { name: 'New template' }))
      expect(within(screen.getByRole('dialog')).getByRole('heading', { name: 'New template' })).toBeInTheDocument()
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))

      await user.click(screen.getByRole('button', { name: 'Edit' }))
      const dialog = within(screen.getByRole('dialog'))
      expect(dialog.getByRole('heading', { name: 'Edit template' })).toBeInTheDocument()
      expect(dialog.getByLabelText('Name')).toHaveValue('Weekend bonus')
    })

    it('asks before deleting, and reassures that sent broadcasts are unaffected', async () => {
      const user = userEvent.setup()
      await openTemplates(user)

      await user.click(screen.getByRole('button', { name: 'Delete' }))
      expect(deleteMock).not.toHaveBeenCalled()
      expect(screen.getByText(/already sent from it are not affected/i)).toBeInTheDocument()

      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
      expect(deleteMock).toHaveBeenCalledWith('t1')
    })

    it('shows an empty state and an error state', async () => {
      const user = userEvent.setup()
      vi.mocked(useNotificationTemplatesQuery).mockReturnValue(templatesOf([]))
      const { unmount } = render(<NotificationCenterPage />)
      await user.click(screen.getByRole('tab', { name: 'templates' }))
      expect(screen.getByText('No templates yet')).toBeInTheDocument()
      unmount()

      const refetch = vi.fn()
      vi.mocked(useNotificationTemplatesQuery).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch } as never)
      render(<NotificationCenterPage />)
      await user.click(screen.getByRole('tab', { name: 'templates' }))
      await user.click(screen.getByRole('button', { name: /try again|retry/i }))
      expect(refetch).toHaveBeenCalled()
    })
  })
})
