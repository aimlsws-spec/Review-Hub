import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAwaitingPayoutQuery, useMarkWithdrawalFailedMutation, useMarkWithdrawalPaidMutation } from '@/hooks/useWithdrawalQueue'

import { AwaitingPayoutPanel } from './AwaitingPayoutPanel'

vi.mock('@/hooks/useWithdrawalQueue', () => ({
  useAwaitingPayoutQuery: vi.fn(),
  useMarkWithdrawalPaidMutation: vi.fn(),
  useMarkWithdrawalFailedMutation: vi.fn(),
}))

const manual = {
  id: 'wd-1',
  walletId: 'w1',
  bankAccountId: 'b1',
  amount: '2500',
  finalAmount: '2500',
  status: 'APPROVED',
  payoutMode: 'MANUAL',
  rejectionReason: null,
  processedBy: 'a1',
  processedAt: '2026-09-20T10:00:00Z',
  createdAt: '2026-09-19T10:00:00Z',
  bankAccount: { bankName: 'ICICI Bank', accountNumber: '9876543210', accountHolderName: 'Demo User', ifscCode: 'ICIC0000001' },
}
const gatewayFailed = { ...manual, id: 'wd-2', payoutMode: 'GATEWAY', finalAmount: '1200', bankAccount: { ...manual.bankAccount, accountHolderName: 'Other Person', accountNumber: '1122334455' } }

const paidMock = vi.fn()
const failedMock = vi.fn()

function queue(rows: unknown[]) {
  vi.mocked(useAwaitingPayoutQuery).mockReturnValue({
    data: { data: { data: { data: rows, total: rows.length, page: 1, limit: 20 } } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never)
}

describe('AwaitingPayoutPanel', () => {
  beforeEach(() => {
    paidMock.mockReset()
    failedMock.mockReset()
    queue([manual, gatewayFailed])
    vi.mocked(useMarkWithdrawalPaidMutation).mockReturnValue({ mutate: paidMock, isPending: false } as never)
    vi.mocked(useMarkWithdrawalFailedMutation).mockReturnValue({ mutate: failedMock, isPending: false } as never)
  })

  it('shows what to send and where: the holder, the full account number and the IFSC', () => {
    render(<AwaitingPayoutPanel />)

    expect(screen.getByText('Demo User')).toBeInTheDocument()
    expect(screen.getByText(/9876543210 · ICIC0000001/)).toBeInTheDocument()
    expect(screen.getByText(/2,500\.00/)).toBeInTheDocument()
  })

  it('says why each one is here', () => {
    render(<AwaitingPayoutPanel />)

    expect(screen.getByText(/payouts are set to manual/i)).toBeInTheDocument()
    expect(screen.getByText(/gateway could not start this payout/i)).toBeInTheDocument()
  })

  it('says when there is nothing to pay', () => {
    queue([])
    render(<AwaitingPayoutPanel />)

    expect(screen.getByText(/nothing waiting to be paid/i)).toBeInTheDocument()
  })

  describe('recording that the money was sent', () => {
    it('asks for the bank reference, and does not let the admin confirm without a good one', async () => {
      const user = userEvent.setup()
      render(<AwaitingPayoutPanel />)

      await user.click(screen.getAllByRole('button', { name: /mark paid/i })[0])
      const dialog = within(screen.getByRole('dialog'))
      const confirm = dialog.getByRole('button', { name: /confirm it was sent/i })
      expect(confirm).toBeDisabled()

      await user.type(dialog.getByLabelText(/bank reference/i), 'AB1')
      expect(dialog.getByText(/6 to 40 letters/i)).toBeInTheDocument()
      expect(confirm).toBeDisabled()

      await user.clear(dialog.getByLabelText(/bank reference/i))
      await user.type(dialog.getByLabelText(/bank reference/i), 'UTR 123 456')
      expect(confirm).toBeDisabled()
    })

    it('sends the trimmed reference and the note for the right withdrawal', async () => {
      const user = userEvent.setup()
      render(<AwaitingPayoutPanel />)

      await user.click(screen.getAllByRole('button', { name: /mark paid/i })[1])
      const dialog = within(screen.getByRole('dialog'))
      await user.type(dialog.getByLabelText(/bank reference/i), '  UTR123456789 ')
      await user.type(dialog.getByLabelText(/note/i), 'Sent by NEFT')
      await user.click(dialog.getByRole('button', { name: /confirm it was sent/i }))

      expect(paidMock).toHaveBeenCalledWith({ id: 'wd-2', reference: 'UTR123456789', note: 'Sent by NEFT' })
    })

    it('says plainly that it can not be undone and each reference works once', async () => {
      const user = userEvent.setup()
      render(<AwaitingPayoutPanel />)

      await user.click(screen.getAllByRole('button', { name: /mark paid/i })[0])

      expect(within(screen.getByRole('dialog')).getByText(/can not be\s+undone/i)).toBeInTheDocument()
    })
  })

  describe('recording that the money could not be sent', () => {
    it('needs a reason, and says the money goes back to the user', async () => {
      const user = userEvent.setup()
      render(<AwaitingPayoutPanel />)

      await user.click(screen.getAllByRole('button', { name: /could not send/i })[0])
      const dialog = within(screen.getByRole('dialog'))
      const confirm = dialog.getByRole('button', { name: /return the money/i })

      expect(dialog.getByText(/goes back to the user/i)).toBeInTheDocument()
      expect(confirm).toBeDisabled()

      await user.type(dialog.getByLabelText(/reason/i), 'no')
      expect(confirm).toBeDisabled()
      await user.type(dialog.getByLabelText(/reason/i), ' good reason')
      await user.click(confirm)

      expect(failedMock).toHaveBeenCalledWith({ id: 'wd-1', reason: 'no good reason' })
    })
  })
})
