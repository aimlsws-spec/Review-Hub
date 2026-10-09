import { FactList, Modal, Spinner } from '@viralkar/shared-ui'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/constants'
import { useWalletQuery } from '@/hooks/useWallet'
import { useAuthStore } from '@/stores/auth.store'
import type { Campaign } from '@/types'
import { formatCurrency } from '@/utils'

/** What happens to the merchant's money, said the same way wherever a budget is set or submitted. */
export const BUDGET_SAFETY_NOTE =
  'Your money stays in your wallet while we review the campaign. It is set aside for rewards only when the campaign is approved and you activate it, and whatever is not paid out comes back to your wallet when the campaign ends.'

/**
 * The last step before a campaign goes to review: its budget against what the wallet holds. A campaign the wallet can
 * not pay for is not sent (the server refuses it too), and the merchant is shown exactly how much to add.
 */
export function SubmitCampaignDialog({
  campaign,
  submitting,
  onSubmit,
  onClose,
}: {
  campaign: Campaign
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
}) {
  const merchantId = useAuthStore((s) => s.merchant?.id)
  const { data, isLoading, isError } = useWalletQuery(merchantId)
  const available = Number(data?.data?.data?.availableBalance ?? 0)
  const required = Number(campaign.totalBudget)
  const shortfall = Math.max(0, Math.round((required - available) * 100) / 100)
  const covered = !isLoading && !isError && shortfall === 0

  return (
    <Modal
      open
      onClose={onClose}
      title="Submit for review"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          {!isLoading && !covered ? (
            <Link className="btn-primary" to={ROUTES.WALLET}>Add funds</Link>
          ) : (
            <button className="btn-primary" onClick={onSubmit} disabled={!covered || submitting}>
              {submitting && <Spinner size="sm" className="text-white" />}
              Submit for review
            </button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          <span className="font-medium text-gray-900">{campaign.title}</span> will be checked by the Viralkar team before
          it can go live.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : isError ? (
          <p className="text-sm text-red-600">Could not check your wallet balance. Please try again.</p>
        ) : (
          <>
            <FactList
              items={[
                ['Campaign budget', formatCurrency(required)],
                ['Your wallet balance', formatCurrency(available)],
              ]}
            />
            {covered ? (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">Your wallet covers this campaign&apos;s budget.</p>
            ) : (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                Your wallet has {formatCurrency(available)}, but this campaign needs {formatCurrency(required)}. Add{' '}
                <span className="font-semibold">{formatCurrency(shortfall)}</span> to your wallet, then submit it again.
              </p>
            )}
          </>
        )}

        <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
          <span className="font-medium text-gray-800">Your money is safe with us.</span> {BUDGET_SAFETY_NOTE}
        </p>
      </div>
    </Modal>
  )
}
