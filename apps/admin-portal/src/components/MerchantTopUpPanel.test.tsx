import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMerchantTopUpsQuery, useRecordTopUpMutation, useTopUpDecisionMutation } from '@/hooks/useMerchants'
import { useAuthStore } from '@/stores/auth.store'

import { MerchantTopUpPanel } from './MerchantTopUpPanel'

vi.mock('@/hooks/useMerchants', () => ({
  useMerchantTopUpsQuery: vi.fn(),
  useRecordTopUpMutation: vi.fn(),
  useTopUpDecisionMutation: vi.fn(),
}))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))

const recordMock = vi.fn()
let onSuccess: (() => void) | undefined

const topUp = { id: 't1', status: 'COMPLETED', amount: '5000.00', bankReference: 'UTR111222333', receivedOn: '2026-09-15', note: null, recordedBy: 'a1', createdAt: '2026-09-15T10:00:00Z' }

function renderPanel() {
  return render(<MerchantTopUpPanel merchantId="m1" businessName="Brew Bar" />)
}

async function fill(user: ReturnType<typeof userEvent.setup>, values: { amount?: string; reference?: string }) {
  if (values.amount !== undefined) await user.type(screen.getByLabelText(/amount received/i), values.amount)
  if (values.reference !== undefined) await user.type(screen.getByLabelText(/bank reference/i), values.reference)
}

describe('MerchantTopUpPanel', () => {
  beforeEach(() => {
    recordMock.mockReset()
    vi.mocked(useAuthStore).mockImplementation(((selector: (s: unknown) => unknown) => selector({ user: { id: 'admin-1' } })) as never)
    vi.mocked(useTopUpDecisionMutation).mockReturnValue({ mutate: vi.fn(), isPending: false } as never)
    vi.mocked(useMerchantTopUpsQuery).mockReturnValue({ data: { data: { data: { data: [topUp], total: 1 } } }, isLoading: false } as never)
    vi.mocked(useRecordTopUpMutation).mockImplementation(((_id: string, done?: () => void) => {
      onSuccess = done
      return { mutate: recordMock, isPending: false }
    }) as never)
  })

  it('shows the recent top-ups with their bank references', () => {
    renderPanel()

    expect(screen.getByText('UTR111222333')).toBeInTheDocument()
    expect(screen.getByText(/5,000\.00/)).toBeInTheDocument()
  })

  it('says when nothing has been recorded yet', () => {
    vi.mocked(useMerchantTopUpsQuery).mockReturnValue({ data: { data: { data: { data: [], total: 0 } } }, isLoading: false } as never)
    renderPanel()

    expect(screen.getByText(/no bank-transfer top-ups recorded yet/i)).toBeInTheDocument()
  })

  it('explains that each reference works once', () => {
    renderPanel()
    expect(screen.getByText(/can not be added twice/i)).toBeInTheDocument()
  })

  it('does not add anything on the first click: it asks the admin to confirm, showing what will happen', async () => {
    const user = userEvent.setup()
    renderPanel()

    await fill(user, { amount: '25000', reference: 'UTR987654321' })
    await user.click(screen.getByRole('button', { name: /^review$/i }))

    const dialog = within(await screen.findByRole('alertdialog'))
    expect(dialog.getByText(/25,000\.00/)).toBeInTheDocument()
    expect(dialog.getByText('UTR987654321')).toBeInTheDocument()
    expect(dialog.getByText(/can not be undone/i)).toBeInTheDocument()
    expect(recordMock).not.toHaveBeenCalled()
  })

  it('sends the amount as a number, the trimmed reference, and the date once confirmed', async () => {
    const user = userEvent.setup()
    renderPanel()

    await fill(user, { amount: '1234.5', reference: '  UTR987654321 ' })
    await user.click(screen.getByRole('button', { name: /^review$/i }))
    await user.click(await screen.findByRole('button', { name: /confirm and add money/i }))

    expect(recordMock).toHaveBeenCalledWith({
      amount: 1234.5,
      bankReference: 'UTR987654321',
      receivedOn: new Date().toISOString().slice(0, 10),
      note: undefined,
    })
  })

  it('lets the admin go back and change something without sending anything', async () => {
    const user = userEvent.setup()
    renderPanel()

    await fill(user, { amount: '500', reference: 'UTR987654321' })
    await user.click(screen.getByRole('button', { name: /^review$/i }))
    await user.click(await screen.findByRole('button', { name: /^back$/i }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/amount received/i)).toHaveValue(500)
    expect(recordMock).not.toHaveBeenCalled()
  })

  it('clears the form and the confirmation once the money has been added', async () => {
    const user = userEvent.setup()
    renderPanel()

    await fill(user, { amount: '500', reference: 'UTR987654321' })
    await user.click(screen.getByRole('button', { name: /^review$/i }))
    await screen.findByRole('alertdialog')
    onSuccess?.()

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByLabelText(/amount received/i)).toHaveValue(null))
    expect(screen.getByLabelText(/bank reference/i)).toHaveValue('')
  })

  describe('checks what it can before asking the server', () => {
    it.each([
      ['no amount', { reference: 'UTR987654321' }, /enter the amount/i],
      ['an amount of zero', { amount: '0', reference: 'UTR987654321' }, /at least/i],
      ['an amount above the limit', { amount: '1000001', reference: 'UTR987654321' }, /at most/i],
      ['an amount with three decimals', { amount: '10.123', reference: 'UTR987654321' }, /2 decimal places/i],
      ['no reference', { amount: '500' }, /enter the bank reference/i],
      ['a reference that is too short', { amount: '500', reference: 'AB1' }, /6 to 40/i],
      ['a reference with spaces inside', { amount: '500', reference: 'UTR 123 456' }, /no spaces/i],
    ])('refuses %s', async (_label, values, message) => {
      const user = userEvent.setup()
      renderPanel()

      await fill(user, values)
      await user.click(screen.getByRole('button', { name: /^review$/i }))

      expect(await screen.findByText(message)).toBeInTheDocument()
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(recordMock).not.toHaveBeenCalled()
    })
  })
})
