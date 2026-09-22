import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import FinancePage from './FinancePage'

vi.mock('@/components/TdsPanel', () => ({ TdsPanel: () => <p>TDS panel</p> }))
vi.mock('@/components/InvoiceNotesPanel', () => ({ InvoiceNotesPanel: () => <p>Invoice notes panel</p> }))

describe('FinancePage', () => {
  it('opens on the TDS tab', () => {
    render(<FinancePage />)

    expect(screen.getByText('TDS panel')).toBeInTheDocument()
    expect(screen.queryByText('Invoice notes panel')).not.toBeInTheDocument()
  })

  it('switches to invoices and notes, and back', async () => {
    const user = userEvent.setup()
    render(<FinancePage />)

    await user.click(screen.getByRole('button', { name: /invoices and notes/i }))
    expect(screen.getByText('Invoice notes panel')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /tds on payouts/i }))
    expect(screen.getByText('TDS panel')).toBeInTheDocument()
  })
})
