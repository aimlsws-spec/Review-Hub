import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useDismissSuggestionMutation, useSuggestionsQuery } from '@/hooks/useInsights'

import { SuggestionsPanel } from './SuggestionsPanel'

vi.mock('@/hooks/useInsights', () => ({ useSuggestionsQuery: vi.fn(), useDismissSuggestionMutation: vi.fn() }))

const mutate = vi.fn()

describe('SuggestionsPanel', () => {
  beforeEach(() => {
    mutate.mockReset()
    vi.mocked(useDismissSuggestionMutation).mockReturnValue({ mutate, isPending: false } as never)
  })

  it('lists open suggestions and dismisses one', async () => {
    vi.mocked(useSuggestionsQuery).mockReturnValue({
      data: [{ id: 's-1', campaignId: 'c-1', code: 'LOW_COMPLETION', severity: 'WARNING', title: 'Few people finish', detail: 'Shorten the task.', createdAt: '2026-10-03T00:30:00Z' }],
    } as never)
    render(<SuggestionsPanel merchantId="m-1" />)

    expect(screen.getByText('Few people finish')).toBeInTheDocument()
    expect(screen.getByText('Needs attention')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(mutate).toHaveBeenCalledWith('s-1')
  })

  it('shows nothing when there is nothing open', () => {
    vi.mocked(useSuggestionsQuery).mockReturnValue({ data: [] } as never)
    const { container } = render(<SuggestionsPanel merchantId="m-1" />)

    expect(container).toBeEmptyDOMElement()
  })
})
