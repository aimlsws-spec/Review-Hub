import { Modal, Spinner, Textarea } from '@reviewhub/shared-ui'
import { useState } from 'react'

import { useTopUpDecisionMutation, type TopUpDecision } from '@/hooks/useMerchants'
import { useAuthStore } from '@/stores/auth.store'
import type { MerchantManualTopUp } from '@/types'
import { formatCurrency } from '@/utils'

const REASON_COPY: Record<Exclude<TopUpDecision, 'approve'>, { title: string; confirm: string; body: (amount: string) => string; placeholder: string }> = {
  reject: {
    title: 'Reject this top-up',
    confirm: 'Reject',
    body: (amount) => `Nothing is added to the wallet. The bank reference is given back, so ${amount} can be recorded again if the transfer is real.`,
    placeholder: 'For example: the amount does not match the bank statement.',
  },
  reverse: {
    title: 'Reverse this top-up',
    confirm: 'Reverse it',
    body: (amount) => `${amount} is taken back out of the wallet, with a new entry: the original stays in the history. This only works while the merchant still has the money.`,
    placeholder: 'For example: it was recorded against the wrong merchant.',
  },
}

/**
 * What an admin can do with one bank-transfer top-up. A large one that is waiting can be approved or rejected, but not by
 * the admin who recorded it: the second admin has to be someone else. One that was credited can be reversed.
 */
export function TopUpActions({ topUp }: { topUp: MerchantManualTopUp }) {
  const adminId = useAuthStore((s) => s.user?.id)
  const [asking, setAsking] = useState<'reject' | 'reverse' | null>(null)
  const [reason, setReason] = useState('')

  const { mutate: decide, isPending } = useTopUpDecisionMutation(() => {
    setAsking(null)
    setReason('')
  })

  const recordedByMe = topUp.recordedBy === adminId
  const amount = formatCurrency(topUp.amount)

  if (topUp.status === 'PENDING_APPROVAL') {
    return (
      <>
        {recordedByMe ? (
          <span className="text-xs text-gray-400">Recorded by you. Another admin has to approve it.</span>
        ) : (
          <div className="flex gap-2">
            <button className="btn-ghost btn-sm text-green-700 hover:bg-green-50" disabled={isPending} onClick={() => decide({ id: topUp.id, decision: 'approve' })}>
              Approve
            </button>
            <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" disabled={isPending} onClick={() => setAsking('reject')}>
              Reject
            </button>
          </div>
        )}
        {asking === 'reject' && renderModal()}
      </>
    )
  }

  if (topUp.status === 'COMPLETED') {
    return (
      <>
        <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => setAsking('reverse')}>
          Reverse
        </button>
        {asking === 'reverse' && renderModal()}
      </>
    )
  }

  return null

  function renderModal() {
    if (!asking) return null
    const copy = REASON_COPY[asking]
    return (
      <Modal
        open
        onClose={() => setAsking(null)}
        title={copy.title}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setAsking(null)} disabled={isPending}>
              Cancel
            </button>
            <button className="btn-danger" disabled={reason.trim().length < 5 || isPending} onClick={() => decide({ id: topUp.id, decision: asking, reason: reason.trim() })}>
              {isPending && <Spinner size="sm" className="text-white" />}
              {copy.confirm}
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-gray-600">{copy.body(amount)}</p>
        <Textarea label="Reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={copy.placeholder} />
      </Modal>
    )
  }
}
