import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useTopUpDecisionMutation } from '@/hooks/useMerchants'
import { useAuthStore } from '@/stores/auth.store'

import { TopUpActions } from './TopUpActions'

vi.mock('@/hooks/useMerchants', () => ({ useTopUpDecisionMutation: vi.fn() }))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))

const decideMock = vi.fn()
let onSuccess: (() => void) | undefined

const topUp = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'top-1',
    status: 'PENDING_APPROVAL',
    amount: '150000.00',
    bankReference: 'UTR123456789',
    receivedOn: '2026-09-20',
    note: null,
    recordedBy: 'admin-1',
    createdAt: '2026-09-20T10:00:00Z',
    ...overrides,
  }) as never

function signedInAs(adminId: string) {
  vi.mocked(useAuthStore).mockImplementation(((selector: (s: unknown) => unknown) => selector({ user: { id: adminId } })) as never)
}

describe('TopUpActions', () => {
  beforeEach(() => {
    decideMock.mockReset()
    signedInAs('admin-2')
    vi.mocked(useTopUpDecisionMutation).mockImplementation(((done?: () => void) => {
      onSuccess = done
      return { mutate: decideMock, isPending: false }
    }) as never)
  })

  describe('a large top-up that is waiting', () => {
    it('lets a different admin approve it straight away', async () => {
      const user = userEvent.setup()
      render(<TopUpActions topUp={topUp()} />)

      await user.click(screen.getByRole('button', { name: /^approve$/i }))

      expect(decideMock).toHaveBeenCalledWith({ id: 'top-1', decision: 'approve' })
    })

    it('does not offer approve or reject to the admin who recorded it, and says why', () => {
      signedInAs('admin-1')
      render(<TopUpActions topUp={topUp()} />)

      expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument()
      expect(screen.getByText(/recorded by you.*another admin has to approve/i)).toBeInTheDocument()
    })

    it('asks for a reason before rejecting, and explains the bank reference is given back', async () => {
      const user = userEvent.setup()
      render(<TopUpActions topUp={topUp()} />)

      await user.click(screen.getByRole('button', { name: /^reject$/i }))
      const dialog = within(screen.getByRole('dialog'))
      const confirm = dialog.getByRole('button', { name: /^reject$/i })

      expect(dialog.getByText(/bank reference is given back/i)).toBeInTheDocument()
      expect(confirm).toBeDisabled()

      await user.type(dialog.getByLabelText(/reason/i), 'no')
      expect(confirm).toBeDisabled()
      await user.type(dialog.getByLabelText(/reason/i), ' good reason')
      await user.click(confirm)

      expect(decideMock).toHaveBeenCalledWith({ id: 'top-1', decision: 'reject', reason: 'no good reason' })
    })

    it('closes the reason box and forgets the reason once it is done', async () => {
      const user = userEvent.setup()
      render(<TopUpActions topUp={topUp()} />)
      await user.click(screen.getByRole('button', { name: /^reject$/i }))
      await user.type(within(screen.getByRole('dialog')).getByLabelText(/reason/i), 'A good reason')

      onSuccess?.()
      await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })
  })

  describe('a top-up that was credited', () => {
    it('can be reversed, with a reason, by any admin', async () => {
      signedInAs('admin-1')
      const user = userEvent.setup()
      render(<TopUpActions topUp={topUp({ status: 'COMPLETED', amount: '5000.00' })} />)

      await user.click(screen.getByRole('button', { name: /^reverse$/i }))
      const dialog = within(screen.getByRole('dialog'))
      expect(dialog.getByText(/taken back out of the wallet/i)).toBeInTheDocument()
      expect(dialog.getByText(/original stays in the history/i)).toBeInTheDocument()
      expect(dialog.getByRole('button', { name: /reverse it/i })).toBeDisabled()

      await user.type(dialog.getByLabelText(/reason/i), 'Recorded against the wrong merchant')
      await user.click(dialog.getByRole('button', { name: /reverse it/i }))

      expect(decideMock).toHaveBeenCalledWith({ id: 'top-1', decision: 'reverse', reason: 'Recorded against the wrong merchant' })
    })
  })

  it.each(['REJECTED', 'REVERSED'])('offers nothing for a top-up that is %s', (status) => {
    render(<TopUpActions topUp={topUp({ status })} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
