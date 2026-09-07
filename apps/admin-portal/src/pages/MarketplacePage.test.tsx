import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useDeleteMarketplaceItemMutation,
  useMarketplaceItemsQuery,
  useRedemptionsQuery,
  useSaveMarketplaceItemMutation,
} from '@/hooks/useMarketplace'

import MarketplacePage from './MarketplacePage'

vi.mock('@/hooks/useMarketplace', () => ({
  useMarketplaceItemsQuery: vi.fn(),
  useRedemptionsQuery: vi.fn(),
  useSaveMarketplaceItemMutation: vi.fn(),
  useDeleteMarketplaceItemMutation: vi.fn(),
}))

const item = {
  id: 'item-1',
  title: '₹100 Amazon Gift Card',
  description: 'Redeemable against your next Amazon order.',
  thumbnailUrl: null,
  category: 'Gift Cards',
  costAmount: 100,
  stock: 50,
  isActive: true,
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const redemption = {
  id: 'redemption-1',
  userId: 'user-1',
  itemId: 'item-1',
  costAmount: 100,
  redemptionCode: 'RC-ABC123',
  createdAt: '2026-01-02T00:00:00Z',
  item,
}

const saveMock = vi.fn()
const removeMock = vi.fn()

function renderPage() {
  return render(<MarketplacePage />)
}

describe('MarketplacePage', () => {
  beforeEach(() => {
    vi.mocked(useMarketplaceItemsQuery).mockReturnValue({
      data: { data: { data: { data: [item], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useRedemptionsQuery).mockReturnValue({
      data: { data: { data: { data: [redemption], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useSaveMarketplaceItemMutation).mockReturnValue({ mutate: saveMock, isPending: false } as never)
    vi.mocked(useDeleteMarketplaceItemMutation).mockReturnValue({ mutate: removeMock, isPending: false } as never)
    saveMock.mockReset()
    removeMock.mockReset()
  })

  it('renders the catalogue tab by default', () => {
    renderPage()
    expect(screen.getByText('₹100 Amazon Gift Card')).toBeInTheDocument()
  })

  it('creates a new catalogue item', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new item/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/^title/i), 'Free Coffee Voucher')
    await user.type(dialog.getByLabelText(/description/i), 'One free coffee at partner cafes.')
    await user.type(dialog.getByLabelText(/cost/i), '20')

    await user.click(dialog.getByRole('button', { name: /create item/i }))

    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith({
        editingId: null,
        form: expect.objectContaining({ title: 'Free Coffee Voucher', costAmount: 20 }),
      }),
    )
  })

  it('deletes a catalogue item after confirming', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /delete/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => expect(removeMock).toHaveBeenCalledWith('item-1'))
  })

  it('switches to the redemptions tab and shows redemption history', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('tab', { name: /redemptions/i }))

    expect(screen.getByText('RC-ABC123')).toBeInTheDocument()
  })
})
