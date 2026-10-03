import { ConfirmDialog, EmptyState, ErrorState, PageHeader, Spinner, TableSkeleton } from '@reviewhub/shared-ui'
import { useState } from 'react'

import { useSubscriptionMutations, useSubscriptionQuery } from '@/hooks/useSubscription'
import type { MerchantPlan } from '@/types'
import { formatCurrency, formatDate } from '@/utils'

/** What a plan gives, in plain words. */
function benefits(plan: MerchantPlan): string[] {
  return [
    plan.maxActiveCampaigns === null ? 'Unlimited campaigns at once' : `Up to ${plan.maxActiveCampaigns} campaigns at once`,
    plan.featuredSlots > 0 ? `${plan.featuredSlots} featured campaign${plan.featuredSlots === 1 ? '' : 's'} included` : 'Feature campaigns as you go',
    ...(plan.isPremium ? ['Premium badge (verification level L4)'] : []),
  ]
}

/**
 * The merchant's plan. Plans are paid monthly from the wallet, GST included, and renew on their own until cancelled.
 * A cancelled plan keeps working until the month already paid for ends.
 */
export default function SubscriptionPage() {
  const { data, isLoading, isError, refetch } = useSubscriptionQuery()
  const { subscribe, cancel, resume } = useSubscriptionMutations()
  const [choice, setChoice] = useState<MerchantPlan | null>(null)
  const overview = data?.data.data
  const current = overview?.current ?? null

  return (
    <div>
      <PageHeader title="Plan" subtitle="Plans are paid monthly from your wallet. Prices include GST." />

      {isLoading ? (
        <TableSkeleton rows={3} cols={3} />
      ) : isError || !overview ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <div className="space-y-6">
          {current && (
            <section className="card p-5" aria-label="Your plan">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500">Your plan</p>
                  <p className="text-lg font-semibold text-gray-900">{current.plan.name}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {current.status === 'PAST_DUE'
                      ? `The renewal could not be paid. Top up your wallet to keep this plan.`
                      : current.autoRenew
                        ? `Renews on ${formatDate(current.periodEnd)}.`
                        : `Ends on ${formatDate(current.periodEnd)} and will not renew.`}
                  </p>
                </div>
                {current.autoRenew ? (
                  <button className="btn-secondary" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
                    {cancel.isPending && <Spinner size="sm" />}
                    Cancel plan
                  </button>
                ) : (
                  <button className="btn-primary" disabled={resume.isPending} onClick={() => resume.mutate()}>
                    {resume.isPending && <Spinner size="sm" className="text-white" />}
                    Keep my plan
                  </button>
                )}
              </div>
            </section>
          )}

          {overview.plans.length === 0 ? (
            <EmptyState title="No plans on offer yet" description="Plans will appear here once they are available." />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {overview.plans.map((plan) => (
                <section key={plan.id} className="card flex flex-col p-5" aria-label={plan.name}>
                  <p className="text-lg font-semibold text-gray-900">{plan.name}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {Number(plan.monthlyPrice) === 0 ? 'Free' : formatCurrency(plan.priceWithGst)}
                    {Number(plan.monthlyPrice) > 0 && <span className="text-sm font-normal text-gray-500"> / month</span>}
                  </p>
                  {plan.description && <p className="mt-2 text-sm text-gray-600">{plan.description}</p>}
                  <ul className="mt-3 flex-1 space-y-1 text-sm text-gray-700">
                    {benefits(plan).map((line) => (
                      <li key={line}>• {line}</li>
                    ))}
                  </ul>
                  {current?.plan.id === plan.id ? (
                    <p className="mt-4 text-sm font-medium text-primary-700">Your current plan</p>
                  ) : (
                    <button className="btn-primary mt-4" disabled={!!current} onClick={() => setChoice(plan)}>
                      Choose {plan.name}
                    </button>
                  )}
                </section>
              ))}
            </div>
          )}

          {current && overview.plans.length > 0 && (
            <p className="text-sm text-gray-500">To change plan, cancel this one and choose another once it ends.</p>
          )}

          <p className="text-sm text-gray-500">
            Featuring a campaign puts it at the top of the listings for {overview.featured.days} days for{' '}
            {formatCurrency(overview.featured.priceWithGst)}, or free while your plan has a featured slot. Use Feature on the Campaigns page.
          </p>
        </div>
      )}

      <ConfirmDialog
        open={!!choice}
        onClose={() => setChoice(null)}
        onConfirm={() => choice && subscribe.mutate(choice.id, { onSuccess: () => setChoice(null) })}
        title={`Choose ${choice?.name ?? ''}`}
        message={
          choice && Number(choice.monthlyPrice) > 0
            ? `${formatCurrency(choice.priceWithGst)} (GST included) is taken from your wallet now, and again each month until you cancel.`
            : 'This plan is free.'
        }
        confirmLabel="Subscribe"
        loading={subscribe.isPending}
      />
    </div>
  )
}
