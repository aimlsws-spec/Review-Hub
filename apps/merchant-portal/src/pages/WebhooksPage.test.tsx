import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useCreateWebhookMutation,
  useDeleteWebhookMutation,
  useUpdateWebhookMutation,
  useWebhookDeliveriesQuery,
  useWebhooksQuery,
} from '@/hooks/useWebhooks'
import { useAuthStore } from '@/stores/auth.store'

import WebhooksPage from './WebhooksPage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/hooks/useWebhooks', () => ({
  useWebhooksQuery: vi.fn(),
  useWebhookDeliveriesQuery: vi.fn(),
  useCreateWebhookMutation: vi.fn(),
  useUpdateWebhookMutation: vi.fn(),
  useDeleteWebhookMutation: vi.fn(),
}))

const webhook = {
  id: 'webhook-1',
  merchantId: 'merchant-1',
  url: 'https://merchant.example.com/hooks',
  secret: 'shh',
  events: ['campaign.completed', 'submission.approved'],
  enabled: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const createMock = vi.fn()
const updateMock = vi.fn()
const removeMock = vi.fn()

function mockAuthState(merchantId: string | undefined) {
  vi.mocked(useAuthStore).mockImplementation(
    ((selector: (s: { merchant: { id: string } | null }) => unknown) => selector({ merchant: merchantId ? { id: merchantId } : null })) as unknown as typeof useAuthStore,
  )
}

function renderPage() {
  return render(<WebhooksPage />)
}

describe('WebhooksPage', () => {
  beforeEach(() => {
    mockAuthState('merchant-1')
    vi.mocked(useWebhooksQuery).mockReturnValue({
      data: { data: { data: [webhook] } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useWebhookDeliveriesQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 10 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useCreateWebhookMutation).mockReturnValue({ mutate: createMock, isPending: false } as never)
    vi.mocked(useUpdateWebhookMutation).mockReturnValue({ mutate: updateMock, isPending: false } as never)
    vi.mocked(useDeleteWebhookMutation).mockReturnValue({ mutate: removeMock, isPending: false } as never)
    createMock.mockReset()
    updateMock.mockReset()
    removeMock.mockReset()
  })

  it('shows an empty state when there are no webhooks', () => {
    vi.mocked(useWebhooksQuery).mockReturnValue({
      data: { data: { data: [] } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()
    expect(screen.getByText(/no webhooks yet/i)).toBeInTheDocument()
  })

  it('renders a webhook row with its url and events', () => {
    renderPage()

    expect(screen.getByText('https://merchant.example.com/hooks')).toBeInTheDocument()
    expect(screen.getByText('campaign.completed, submission.approved')).toBeInTheDocument()
  })

  it('creates a new webhook, parsing comma-separated events', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new webhook/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/endpoint url/i), 'https://myshop.com/hooks/viralkar')
    await user.type(dialog.getByLabelText(/events/i), 'campaign.completed, submission.approved')
    await user.click(dialog.getByRole('button', { name: /create webhook/i }))

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith({
        url: 'https://myshop.com/hooks/viralkar',
        events: ['campaign.completed', 'submission.approved'],
        enabled: true,
      }),
    )
  })

  it('edits an existing webhook', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /edit/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith({
        webhookId: 'webhook-1',
        data: { url: webhook.url, events: webhook.events, enabled: true },
      }),
    )
  })

  it('deletes a webhook after confirming', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /delete/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => expect(removeMock).toHaveBeenCalledWith('webhook-1'))
  })

  it('opens the deliveries modal', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /deliveries/i }))

    expect(screen.getByText(/no deliveries yet/i)).toBeInTheDocument()
  })
})
