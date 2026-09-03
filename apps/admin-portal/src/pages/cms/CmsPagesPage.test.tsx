import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCmsPagesQuery, useDeleteCmsPageMutation, useSaveCmsPageMutation } from '@/hooks/useCmsPages'

import CmsPagesPage from './CmsPagesPage'

vi.mock('@/hooks/useCmsPages', () => ({
  useCmsPagesQuery: vi.fn(),
  useSaveCmsPageMutation: vi.fn(),
  useDeleteCmsPageMutation: vi.fn(),
}))

const cmsPage = {
  id: 'page-1',
  title: 'Terms of Service',
  slug: 'terms-of-service',
  content: 'These are the terms.',
  metaTitle: null,
  metaDescription: null,
  status: 'PUBLISHED',
  publishedAt: '2026-01-01T00:00:00Z',
  createdBy: null,
  updatedBy: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const saveMock = vi.fn()
const removeMock = vi.fn()

function renderPage() {
  return render(<CmsPagesPage />)
}

describe('CmsPagesPage', () => {
  beforeEach(() => {
    vi.mocked(useCmsPagesQuery).mockReturnValue({
      data: { data: { data: { data: [cmsPage], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useSaveCmsPageMutation).mockReturnValue({ mutate: saveMock, isPending: false } as never)
    vi.mocked(useDeleteCmsPageMutation).mockReturnValue({ mutate: removeMock, isPending: false } as never)
    saveMock.mockReset()
    removeMock.mockReset()
  })

  it('shows an empty state when there are no pages', () => {
    vi.mocked(useCmsPagesQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()
    expect(screen.getByText(/no pages yet/i)).toBeInTheDocument()
  })

  it('renders a page row with title, slug, and status', () => {
    renderPage()

    expect(screen.getByText('Terms of Service')).toBeInTheDocument()
    expect(screen.getByText('/terms-of-service')).toBeInTheDocument()
  })

  it('creates a new page, auto-generating the slug from the title', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new page/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/^title/i), 'Refund Policy')
    await user.type(dialog.getByLabelText(/content/i), 'This explains our refund policy in detail.')

    expect(dialog.getByLabelText(/slug/i)).toHaveValue('refund-policy')

    await user.click(dialog.getByRole('button', { name: /create page/i }))

    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith({
        editingId: null,
        form: expect.objectContaining({ title: 'Refund Policy', slug: 'refund-policy', content: 'This explains our refund policy in detail.' }),
      }),
    )
  })

  it('edits an existing page without changing its slug', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /edit/i }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByLabelText(/slug/i)).toBeDisabled()

    await user.click(dialog.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith({ editingId: 'page-1', form: expect.objectContaining({ title: 'Terms of Service' }) }),
    )
  })

  it('deletes a page after confirming', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /delete/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => expect(removeMock).toHaveBeenCalledWith('page-1'))
  })
})
