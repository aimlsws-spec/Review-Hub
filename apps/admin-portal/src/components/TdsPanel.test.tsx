import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useExportTdsMutation, useTdsQuery } from '@/hooks/useFinance'

import { TdsPanel } from './TdsPanel'

vi.mock('@/hooks/useFinance', () => ({ useTdsQuery: vi.fn(), useExportTdsMutation: vi.fn() }))

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 't1',
  withdrawalId: 'wd-1',
  userId: 'u1',
  userName: 'Asha Patel',
  financialYear: '2026-27',
  panNumber: 'ABCDE1234F',
  section: '194R',
  grossAmount: '5000.00',
  rate: '0.1000',
  tdsAmount: '500.00',
  netAmount: '4500.00',
  status: 'DEDUCTED',
  createdAt: '2026-09-21T10:00:00Z',
  ...overrides,
})

const exportMock = vi.fn()

function report(rows: unknown[], summary = { deductions: rows.length, grossPaid: 5000, tdsKeptBack: 500 }) {
  vi.mocked(useTdsQuery).mockReturnValue({
    data: { data: { data: { data: rows, total: rows.length, page: 1, limit: 20, financialYear: '2026-27', summary } } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never)
}

describe('TdsPanel', () => {
  beforeEach(() => {
    exportMock.mockReset()
    vi.mocked(useTdsQuery).mockReset()
    report([row()])
    vi.mocked(useExportTdsMutation).mockReturnValue({ mutate: exportMock, isPending: false } as never)
  })

  it('shows the totals for the year', () => {
    render(<TdsPanel />)

    const totals = within(screen.getByLabelText('Totals'))
    expect(totals.getByText('1')).toBeInTheDocument()
    expect(totals.getByText(/5,000\.00/)).toBeInTheDocument()
    expect(totals.getByText(/500\.00/)).toBeInTheDocument()
  })

  it('shows each deduction with the person, their PAN, the rate and the section', () => {
    render(<TdsPanel />)

    expect(screen.getByText('Asha Patel')).toBeInTheDocument()
    expect(screen.getByText('ABCDE1234F')).toBeInTheDocument()
    expect(screen.getByText(/10\.00%, 194R/)).toBeInTheDocument()
  })

  it('says so when a person has no PAN on file', () => {
    report([row({ panNumber: null })])
    render(<TdsPanel />)

    expect(screen.getByText('Not on file')).toBeInTheDocument()
  })

  it('shows a reversed deduction as reversed', () => {
    report([row({ status: 'REVERSED' })], { deductions: 0, grossPaid: 0, tdsKeptBack: 0 })
    render(<TdsPanel />)

    expect(screen.getByText(/reversed/i, { selector: 'span' })).toBeInTheDocument()
  })

  it('says when nothing has been kept back', () => {
    report([], { deductions: 0, grossPaid: 0, tdsKeptBack: 0 })
    render(<TdsPanel />)

    expect(screen.getByText(/nothing has been kept back/i)).toBeInTheDocument()
  })

  it('starts on the current financial year and offers the years before it', () => {
    render(<TdsPanel />)

    const select = screen.getByLabelText(/financial year/i) as HTMLSelectElement
    expect([...select.options]).toHaveLength(5)
    expect(select.value).toBe(select.options[0].value)
    expect(select.value).toMatch(/^\d{4}-\d{2}$/)
  })

  it('asks for a different year, and for reversed ones only, when chosen', async () => {
    const user = userEvent.setup()
    render(<TdsPanel />)
    const select = screen.getByLabelText(/financial year/i) as HTMLSelectElement

    await user.selectOptions(select, select.options[2].value)
    await user.selectOptions(screen.getByLabelText(/^show$/i), 'REVERSED')

    expect(vi.mocked(useTdsQuery)).toHaveBeenLastCalledWith(expect.objectContaining({ financialYear: select.options[2].value, status: 'REVERSED', page: 1 }))
  })

  it('downloads the CSV for the year that is showing', async () => {
    const user = userEvent.setup()
    render(<TdsPanel />)
    const select = screen.getByLabelText(/financial year/i) as HTMLSelectElement

    await user.click(screen.getByRole('button', { name: /download csv/i }))

    expect(exportMock).toHaveBeenCalledWith(select.value)
  })
})
