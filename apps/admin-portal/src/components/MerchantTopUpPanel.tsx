import { Input, Skeleton, Spinner, Textarea } from '@reviewhub/shared-ui'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { TopUpActions } from '@/components/TopUpActions'
import { useMerchantTopUpsQuery, useRecordTopUpMutation } from '@/hooks/useMerchants'
import type { ManualTopUpStatus } from '@/types'
import { formatCurrency, formatDate } from '@/utils'

/** Mirrors the limits the server enforces (MANUAL_TOP_UP in the backend); the server still checks every one. */
const MIN_AMOUNT = 1
const MAX_AMOUNT = 1_000_000
const REFERENCE_PATTERN = /^[A-Za-z0-9/-]{6,40}$/

interface TopUpForm {
  amount: string
  bankReference: string
  receivedOn: string
  note: string
}

const today = () => new Date().toISOString().slice(0, 10)

const STATUS_LABEL: Record<ManualTopUpStatus, { text: string; className: string }> = {
  PENDING_APPROVAL: { text: 'Waiting for a second admin', className: 'bg-amber-50 text-amber-800' },
  COMPLETED: { text: 'Added', className: 'bg-green-50 text-green-700' },
  REJECTED: { text: 'Rejected', className: 'bg-gray-100 text-gray-600' },
  REVERSED: { text: 'Reversed', className: 'bg-red-50 text-red-700' },
}

/**
 * Adds money to a merchant's wallet after they paid the platform by bank transfer. The admin checks the transfer in
 * the bank account first, then records the amount and the bank's reference here. It asks twice before anything is
 * added, because the credit can not be taken back from this screen.
 */
export function MerchantTopUpPanel({ merchantId, businessName }: { merchantId: string; businessName: string }) {
  const [pending, setPending] = useState<TopUpForm | null>(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TopUpForm>({
    defaultValues: { amount: '', bankReference: '', receivedOn: today(), note: '' },
  })

  const { data, isLoading } = useMerchantTopUpsQuery(merchantId)
  const recent = data?.data.data.data ?? []

  const { mutate: record, isPending: saving } = useRecordTopUpMutation(merchantId, () => {
    setPending(null)
    reset({ amount: '', bankReference: '', receivedOn: today(), note: '' })
  })

  const confirm = () => {
    if (!pending) return
    record({
      amount: Number(pending.amount),
      bankReference: pending.bankReference.trim(),
      receivedOn: pending.receivedOn,
      note: pending.note.trim() || undefined,
    })
  }

  return (
    <section className="space-y-3 border-t border-gray-100 pt-4" aria-label="Wallet top-up">
      <h3 className="text-sm font-semibold text-gray-900">Add money to wallet</h3>
      <p className="text-xs text-gray-500">
        Use this after {businessName} has paid by bank transfer or UPI. Check the money in the bank account first. Each bank
        reference can be used once, so the same transfer can not be added twice.
      </p>

      {pending ? (
        <div role="alertdialog" aria-label="Confirm top-up" className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="text-gray-900">
            Add <strong>{formatCurrency(Number(pending.amount))}</strong> to the wallet of <strong>{businessName}</strong>?
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-700">
            <dt className="text-gray-500">Bank reference</dt>
            <dd className="font-mono text-xs">{pending.bankReference.trim()}</dd>
            <dt className="text-gray-500">Received on</dt>
            <dd>{formatDate(pending.receivedOn)}</dd>
            {pending.note.trim() && (
              <>
                <dt className="text-gray-500">Note</dt>
                <dd>{pending.note.trim()}</dd>
              </>
            )}
          </dl>
          <p className="text-xs text-amber-800">This is recorded with your name and can not be undone from this screen.</p>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setPending(null)} disabled={saving}>
              Back
            </button>
            <button type="button" className="btn-primary" onClick={confirm} disabled={saving}>
              {saving && <Spinner size="sm" className="text-white" />}
              Confirm and add money
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit((values) => setPending(values))} className="space-y-3" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount received (₹)"
              type="number"
              step="0.01"
              inputMode="decimal"
              error={errors.amount?.message}
              {...register('amount', {
                required: 'Enter the amount',
                validate: (value) => {
                  const amount = Number(value)
                  if (!Number.isFinite(amount) || amount < MIN_AMOUNT) return `At least ₹${MIN_AMOUNT}`
                  if (amount > MAX_AMOUNT) return `At most ₹${MAX_AMOUNT.toLocaleString('en-IN')} at a time`
                  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return 'At most 2 decimal places'
                  return true
                },
              })}
            />
            <Input
              label="Date received"
              type="date"
              max={today()}
              error={errors.receivedOn?.message}
              {...register('receivedOn', {
                required: 'Enter the date',
                validate: (value) => value <= today() || 'It can not be in the future',
              })}
            />
          </div>
          <Input
            label="Bank reference (UTR)"
            hint="From the bank statement. 6 to 40 letters and numbers, no spaces."
            error={errors.bankReference?.message}
            {...register('bankReference', {
              required: 'Enter the bank reference',
              validate: (value) => REFERENCE_PATTERN.test(value.trim()) || '6 to 40 letters, numbers, dashes or slashes, no spaces',
            })}
          />
          <Textarea label="Note (optional)" rows={2} maxLength={500} {...register('note')} />
          <div className="flex justify-end">
            <button type="submit" className="btn-primary">
              Review
            </button>
          </div>
        </form>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Recent top-ups</p>
        {isLoading ? (
          <Skeleton className="h-4 w-full" />
        ) : recent.length === 0 ? (
          <p className="text-sm text-gray-400">No bank-transfer top-ups recorded yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {recent.map((topUp) => (
              <li key={topUp.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{formatCurrency(topUp.amount)}</p>
                  <p className="font-mono text-xs text-gray-400">{topUp.bankReference ?? topUp.rejectedReference}</p>
                  <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_LABEL[topUp.status].className}`}>{STATUS_LABEL[topUp.status].text}</span>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-gray-500">{formatDate(topUp.receivedOn)}</p>
                  <TopUpActions topUp={topUp} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
