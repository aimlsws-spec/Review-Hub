import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useDeleteFaqMutation, useFaqsQuery, useSaveFaqMutation } from '@/hooks/useFaqs'

import FaqsPage from './FaqsPage'

vi.mock('@/hooks/useFaqs', () => ({
  useFaqsQuery: vi.fn(),
  useSaveFaqMutation: vi.fn(),
  useDeleteFaqMutation: vi.fn(),
}))

const faq = {
  id: 'faq-1',
  category: 'Payments',
  question: 'How long do withdrawals take?',
  answer: 'Withdrawals are typically processed within 3-5 business days.',
  sortOrder: 1,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const saveMock = vi.fn()
const removeMock = vi.fn()

function renderPage() {
  return render(<FaqsPage />)
}

describe('FaqsPage', () => {
  beforeEach(() => {
    vi.mocked(useFaqsQuery).mockReturnValue({
      data: { data: { data: { data: [faq], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useSaveFaqMutation).mockReturnValue({ mutate: saveMock, isPending: false } as never)
    vi.mocked(useDeleteFaqMutation).mockReturnValue({ mutate: removeMock, isPending: false } as never)
    saveMock.mockReset()
    removeMock.mockReset()
  })

  it('shows an empty state when there are no FAQs', () => {
    vi.mocked(useFaqsQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()
    expect(screen.getByText(/no faqs yet/i)).toBeInTheDocument()
  })

  it('renders a FAQ row with category, question, and active status', () => {
    renderPage()

    expect(screen.getByText('Payments')).toBeInTheDocument()
    expect(screen.getByText('How long do withdrawals take?')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('requires a category, question, and answer before creating', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new faq/i }))
    const dialog = within(screen.getByRole('dialog'))
    const createButton = dialog.getByRole('button', { name: /create faq/i })
    expect(createButton).toBeDisabled()

    await user.type(dialog.getByLabelText(/category/i), 'Wallet')
    await user.type(dialog.getByLabelText(/question/i), 'Why was my recharge declined?')
    await user.type(dialog.getByLabelText(/answer/i), 'Recharges can fail due to bank-side declines.')
    expect(createButton).toBeEnabled()

    await user.click(createButton)
    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith({
        editingId: null,
        form: expect.objectContaining({ category: 'Wallet', question: 'Why was my recharge declined?', isActive: true }),
      }),
    )
  })

  it('edits an existing FAQ and can deactivate it', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /edit/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('checkbox'))
    await user.click(dialog.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith({ editingId: 'faq-1', form: expect.objectContaining({ isActive: false }) }),
    )
  })

  it('deletes a FAQ after confirming', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /delete/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => expect(removeMock).toHaveBeenCalledWith('faq-1'))
  })
})
