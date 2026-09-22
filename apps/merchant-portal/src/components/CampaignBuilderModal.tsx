import { Input, Modal, Select, Spinner } from '@reviewhub/shared-ui'
import { useForm } from 'react-hook-form'

import type { RecommendCampaignInput } from '@/api/merchant.api'
import { CAMPAIGN_GOAL_LABELS, CAMPAIGN_TYPE_LABELS } from '@/constants'
import { useCampaignRecommendation } from '@/hooks/useCampaignBuilder'
import type { CampaignDraft } from '@/types'
import { formatCurrency } from '@/utils'

const goalOptions = Object.entries(CAMPAIGN_GOAL_LABELS).map(([value, label]) => ({ value, label }))

const DEFAULT_FORM: RecommendCampaignInput = { goal: 'MORE_REVIEWS', budget: 5000, durationDays: 7, highlight: '' }

interface CampaignBuilderModalProps {
  merchantId: string | undefined
  onClose: () => void
  /** Called with the suggested draft so the normal campaign form can open pre-filled for the merchant to review. */
  onUseDraft: (draft: CampaignDraft) => void
}

/**
 * Asks for a goal and a budget and shows a recommended campaign. It never creates anything: the merchant
 * reviews the draft in the normal campaign form and saves it themselves.
 */
export function CampaignBuilderModal({ merchantId, onClose, onUseDraft }: CampaignBuilderModalProps) {
  const recommendation = useCampaignRecommendation(merchantId)
  const result = recommendation.data

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecommendCampaignInput>({ defaultValues: DEFAULT_FORM })

  const submit = handleSubmit((values) =>
    recommendation.mutate({
      goal: values.goal,
      budget: Number(values.budget),
      durationDays: values.durationDays ? Number(values.durationDays) : undefined,
      highlight: values.highlight?.trim() || undefined,
    }),
  )

  return (
    <Modal
      open
      onClose={onClose}
      title="Build a campaign with a recommendation"
      size="xl"
      footer={
        result ? (
          <>
            <button className="btn-secondary" onClick={() => recommendation.reset()}>Change my answers</button>
            <button className="btn-primary" onClick={() => onUseDraft(result.draft)}>Use this draft</button>
          </>
        ) : (
          <>
            <button className="btn-secondary" onClick={onClose} disabled={recommendation.isPending}>Cancel</button>
            <button className="btn-primary" onClick={submit} disabled={recommendation.isPending || !merchantId}>
              {recommendation.isPending && <Spinner size="sm" className="text-white" />}
              Get recommendation
            </button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Suggested campaign</p>
            <p className="text-lg font-semibold text-gray-900">{result.draft.title}</p>
            <p className="text-sm text-gray-500">{result.draft.shortDescription}</p>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Detail label="Type" value={CAMPAIGN_TYPE_LABELS[result.draft.campaignType] ?? result.draft.campaignType} />
            <Detail label="Reward per person" value={formatCurrency(result.draft.rewardAmount)} />
            <Detail label="People it can pay" value={String(result.estimate.participants)} />
            <Detail label="Campaign budget" value={formatCurrency(result.draft.totalBudget)} />
            <Detail
              label={`Platform fee (${Math.round(result.estimate.platformFeeRate * 10000) / 100}%, estimate)`}
              value={formatCurrency(result.estimate.estimatedPlatformFee)}
            />
            <Detail label="Estimated total cost" value={formatCurrency(result.estimate.totalEstimatedCost)} />
          </dl>
          <p className="text-xs text-gray-400">
            The platform fee is billed separately when you settle, on what is actually spent. It is not taken out of the campaign budget.
          </p>

          {result.warnings.length > 0 && (
            <ul className="space-y-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-800" aria-label="Things to think about">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}

          <div>
            <p className="mb-1 text-sm font-medium text-gray-900">Why these choices</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
              {result.rationale.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-gray-400">
            This is only a suggestion. You can change everything on the next screen before the draft is saved.
          </p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void submit() }}>
          <Select label="What do you want to achieve?" required options={goalOptions} {...register('goal', { required: true })} />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Reward budget (₹)"
              type="number"
              required
              hint="What you want to spend on rewards"
              error={errors.budget?.message}
              {...register('budget', {
                required: 'Required',
                valueAsNumber: true,
                min: { value: 100, message: 'At least ₹100' },
                max: { value: 1000000, message: 'At most ₹10,00,000' },
              })}
            />
            <Input
              label="How many days?"
              type="number"
              error={errors.durationDays?.message}
              {...register('durationDays', {
                valueAsNumber: true,
                min: { value: 1, message: 'At least 1 day' },
                max: { value: 90, message: 'At most 90 days' },
              })}
            />
          </div>
          <Input
            label="Special offer (optional)"
            hint="Added to the description as you write it"
            error={errors.highlight?.message}
            {...register('highlight', { maxLength: { value: 200, message: 'At most 200 characters' } })}
          />
        </form>
      )}
    </Modal>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  )
}
