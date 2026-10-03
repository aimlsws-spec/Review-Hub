import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useDailySummary } from '@/hooks/useDashboardStats'

import { DailySummaryCard } from './DailySummaryCard'

vi.mock('@/hooks/useDashboardStats', () => ({ useDailySummary: vi.fn() }))

describe('DailySummaryCard', () => {
  it('shows each line of the latest summary', () => {
    vi.mocked(useDailySummary).mockReturnValue({
      data: { data: { data: { day: '2026-10-02', text: 'Platform summary for 2026-10-02.\nPeople: 40 signed up.' } } },
    } as never)
    render(<DailySummaryCard />)

    expect(screen.getByText('People: 40 signed up.')).toBeInTheDocument()
  })

  it('shows nothing before the first summary', () => {
    vi.mocked(useDailySummary).mockReturnValue({ data: { data: { data: null } } } as never)
    const { container } = render(<DailySummaryCard />)

    expect(container).toBeEmptyDOMElement()
  })
})
