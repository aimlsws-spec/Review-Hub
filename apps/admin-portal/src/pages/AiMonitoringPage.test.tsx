import { useQuery } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AiMonitoringPage from './AiMonitoringPage'

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQuery: vi.fn(),
}))
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) => (
      <actual.ResponsiveContainer width={600} height={200}>
        {children}
      </actual.ResponsiveContainer>
    ),
  }
})

const monitoring = {
  days: [{ day: '2026-10-03', calls: 20, failed: 2, fallback: 3, tokens: 4000, cost: 1.5 }],
  features: [
    { feature: 'CAPTIONS', calls: 20, failed: 2, fallback: 3, tokens: 4000, cost: 1.5, errorRate: 10, fallbackRate: 15, p95LatencyMs: 2400 },
  ],
  totals: { calls: 20, failed: 2, fallback: 3, tokens: 4000, cost: 1.5, errorRate: 10, fallbackRate: 15 },
}

const withData = (value: unknown) =>
  vi.mocked(useQuery).mockReturnValue({ data: { data: { data: value } }, isLoading: false, isError: false, refetch: vi.fn() } as never)

describe('AiMonitoringPage', () => {
  beforeEach(() => vi.mocked(useQuery).mockReset())

  it('shows the totals and a row per feature', () => {
    withData(monitoring)
    render(<AiMonitoringPage />)

    expect(screen.getByText('Errors', { selector: 'p' }).nextSibling).toHaveTextContent('10%')
    const row = within(screen.getByText('Captions and stories').closest('tr') as HTMLElement)
    expect(row.getByText('2.4 s')).toBeInTheDocument()
    expect(row.getByText('15%')).toBeInTheDocument()
  })

  it('changes the range', async () => {
    withData(monitoring)
    render(<AiMonitoringPage />)

    await userEvent.click(screen.getByRole('button', { name: '7 days' }))

    expect(vi.mocked(useQuery).mock.lastCall?.[0]).toEqual(expect.objectContaining({ queryKey: ['ai-monitoring', 7] }))
  })

  it('says when there were no calls', () => {
    withData({ ...monitoring, features: [], totals: { ...monitoring.totals, calls: 0 } })
    render(<AiMonitoringPage />)

    expect(screen.getByText('No AI calls yet')).toBeInTheDocument()
  })
})
