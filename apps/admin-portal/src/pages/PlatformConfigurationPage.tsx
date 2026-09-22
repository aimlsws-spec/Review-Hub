import { CardSkeleton, ErrorState, Input, PageHeader, Select, Spinner } from '@reviewhub/shared-ui'
import { useEffect, useState } from 'react'

import { usePlatformConfigurationQuery, useUpdatePlatformConfigurationMutation } from '@/hooks/usePlatformConfiguration'
import type { PayoutMode } from '@/types'

const PAYOUT_MODE_OPTIONS = [
  { value: 'GATEWAY', label: 'Through the payment gateway (automatic)' },
  { value: 'MANUAL', label: 'By hand (an admin sends the money and records the bank reference)' },
]

interface FormState {
  platformName: string
  supportEmail: string
  supportPhone: string
  commissionPercentage: string
  minimumWithdrawal: string
  maximumWithdrawal: string
  dailyWithdrawalLimit: string
  /** Empty means no monthly limit. */
  monthlyWithdrawalLimit: string
  bankCoolingHours: string
  payoutMode: PayoutMode
  manualTopUpApprovalThreshold: string
  /** Shown and typed as a percent (10 is 10%); the server takes a fraction. */
  tdsRatePercent: string
  tdsAnnualThreshold: string
  tdsSection: string
  maintenanceMode: boolean
  /** Empty uses the default message. */
  maintenanceMessage: string
  minimumAppVersion: string
  /** Empty means no link. */
  updateUrl: string
}

const APP_VERSION_PATTERN = /^\d{1,6}\.\d{1,6}\.\d{1,6}$/

/** The same checks the server makes, so a clash is explained before saving. The server still checks. */
function withdrawalRuleProblem(form: FormState): string | null {
  const min = Number(form.minimumWithdrawal)
  const max = Number(form.maximumWithdrawal)
  const daily = Number(form.dailyWithdrawalLimit)
  const monthly = form.monthlyWithdrawalLimit.trim() === '' ? null : Number(form.monthlyWithdrawalLimit)
  if (min > max) return 'The minimum withdrawal can not be more than the maximum.'
  if (min > daily) return 'The minimum withdrawal can not be more than the daily limit, or nobody could withdraw.'
  if (monthly !== null && monthly < daily) return 'The monthly limit can not be less than the daily limit.'
  if (Number(form.tdsRatePercent) > 0 && form.tdsSection.trim() === '') return 'Enter the income tax section before turning on TDS. The returns need it.'
  if (!APP_VERSION_PATTERN.test(form.minimumAppVersion.trim())) return 'The minimum app version must look like 1.4.0.'
  if (form.updateUrl.trim() !== '' && !form.updateUrl.trim().startsWith('https://')) return 'The update link must start with https://.'
  return null
}

export default function PlatformConfigurationPage() {
  const { data, isLoading, isError, refetch } = usePlatformConfigurationQuery()
  const config = data?.data.data

  const [form, setForm] = useState<FormState | null>(null)

  useEffect(() => {
    if (config) {
      setForm({
        platformName: config.platformName,
        supportEmail: config.supportEmail ?? '',
        supportPhone: config.supportPhone ?? '',
        commissionPercentage: String(config.commissionPercentage),
        minimumWithdrawal: String(config.minimumWithdrawal),
        maximumWithdrawal: String(config.maximumWithdrawal),
        dailyWithdrawalLimit: String(config.dailyWithdrawalLimit),
        monthlyWithdrawalLimit: config.monthlyWithdrawalLimit === null || config.monthlyWithdrawalLimit === undefined ? '' : String(config.monthlyWithdrawalLimit),
        bankCoolingHours: String(config.bankCoolingHours),
        payoutMode: config.payoutMode,
        manualTopUpApprovalThreshold: String(config.manualTopUpApprovalThreshold),
        tdsRatePercent: String(Math.round(Number(config.tdsRate) * 10000) / 100),
        tdsAnnualThreshold: String(config.tdsAnnualThreshold),
        tdsSection: config.tdsSection ?? '',
        maintenanceMode: config.maintenanceMode,
        maintenanceMessage: config.maintenanceMessage ?? '',
        minimumAppVersion: config.minimumAppVersion,
        updateUrl: config.updateUrl ?? '',
      })
    }
  }, [config])

  const { mutate: save, isPending: saving } = useUpdatePlatformConfigurationMutation()

  if (isLoading || !form) return <CardSkeleton />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const problem = withdrawalRuleProblem(form)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (problem) return
    save({
      platformName: form.platformName,
      supportEmail: form.supportEmail || undefined,
      supportPhone: form.supportPhone || undefined,
      commissionPercentage: Number(form.commissionPercentage),
      minimumWithdrawal: Number(form.minimumWithdrawal),
      maximumWithdrawal: Number(form.maximumWithdrawal),
      dailyWithdrawalLimit: Number(form.dailyWithdrawalLimit),
      monthlyWithdrawalLimit: form.monthlyWithdrawalLimit.trim() === '' ? null : Number(form.monthlyWithdrawalLimit),
      bankCoolingHours: Number(form.bankCoolingHours),
      payoutMode: form.payoutMode,
      manualTopUpApprovalThreshold: Number(form.manualTopUpApprovalThreshold),
      tdsRate: Math.round(Number(form.tdsRatePercent) * 100) / 10000,
      tdsAnnualThreshold: Number(form.tdsAnnualThreshold),
      tdsSection: form.tdsSection.trim() === '' ? null : form.tdsSection.trim(),
      maintenanceMode: form.maintenanceMode,
      maintenanceMessage: form.maintenanceMessage.trim() === '' ? null : form.maintenanceMessage.trim(),
      minimumAppVersion: form.minimumAppVersion.trim(),
      updateUrl: form.updateUrl.trim() === '' ? null : form.updateUrl.trim(),
    })
  }

  return (
    <div>
      <PageHeader
        title="Platform Configuration"
        subtitle={`App v${config?.appVersion} · API ${config?.apiVersion}`}
      />

      <form className="card max-w-2xl space-y-4 p-6" onSubmit={handleSubmit}>
        <Input
          label="Platform name"
          required
          value={form.platformName}
          onChange={(e) => setForm((f) => f && { ...f, platformName: e.target.value })}
        />
        <Input
          label="Support email"
          type="email"
          value={form.supportEmail}
          onChange={(e) => setForm((f) => f && { ...f, supportEmail: e.target.value })}
        />
        <Input
          label="Support phone"
          value={form.supportPhone}
          onChange={(e) => setForm((f) => f && { ...f, supportPhone: e.target.value })}
        />
        <Input
          label="Commission percentage"
          type="number"
          step="0.0001"
          min={0}
          hint="Stored as a fraction, e.g. 0.1 = 10%."
          value={form.commissionPercentage}
          onChange={(e) => setForm((f) => f && { ...f, commissionPercentage: e.target.value })}
        />
        <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
          <legend className="px-1 text-sm font-semibold text-gray-900">Withdrawals</legend>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Minimum withdrawal (₹)"
              type="number"
              min={1}
              value={form.minimumWithdrawal}
              onChange={(e) => setForm((f) => f && { ...f, minimumWithdrawal: e.target.value })}
            />
            <Input
              label="Maximum withdrawal (₹)"
              type="number"
              min={1}
              hint="For one request."
              value={form.maximumWithdrawal}
              onChange={(e) => setForm((f) => f && { ...f, maximumWithdrawal: e.target.value })}
            />
            <Input
              label="Daily limit (₹)"
              type="number"
              min={1}
              hint="Per user, per calendar day (India time)."
              value={form.dailyWithdrawalLimit}
              onChange={(e) => setForm((f) => f && { ...f, dailyWithdrawalLimit: e.target.value })}
            />
            <Input
              label="Monthly limit (₹)"
              type="number"
              min={1}
              hint="Per user. Leave empty for no monthly limit."
              value={form.monthlyWithdrawalLimit}
              onChange={(e) => setForm((f) => f && { ...f, monthlyWithdrawalLimit: e.target.value })}
            />
          </div>
          <Input
            label="Bank account waiting time (hours)"
            type="number"
            min={0}
            max={720}
            hint="A new bank account, or one whose bank, IFSC or holder name changed, can not receive a withdrawal until this long after. 0 turns it off."
            value={form.bankCoolingHours}
            onChange={(e) => setForm((f) => f && { ...f, bankCoolingHours: e.target.value })}
          />
          <Select
            label="How approved withdrawals are paid"
            options={PAYOUT_MODE_OPTIONS}
            value={form.payoutMode}
            onChange={(e) => setForm((f) => f && { ...f, payoutMode: e.target.value as PayoutMode })}
          />
          {problem && (
            <p role="alert" className="text-sm text-red-600">
              {problem}
            </p>
          )}
        </fieldset>
        <Input
          label="Second admin needed above (₹)"
          type="number"
          min={0}
          hint="A bank-transfer top-up for a merchant above this amount is only credited once a different admin approves it. 0 credits every top-up straight away."
          value={form.manualTopUpApprovalThreshold}
          onChange={(e) => setForm((f) => f && { ...f, manualTopUpApprovalThreshold: e.target.value })}
        />
        <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
          <legend className="px-1 text-sm font-semibold text-gray-900">Tax kept back from payouts (TDS)</legend>
          <p className="text-xs text-gray-500">
            The rate, section and threshold are a tax matter: set them only as your tax adviser tells you. A rate of 0 keeps no tax back.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="TDS rate (%)"
              type="number"
              min={0}
              max={50}
              step="0.01"
              value={form.tdsRatePercent}
              onChange={(e) => setForm((f) => f && { ...f, tdsRatePercent: e.target.value })}
            />
            <Input
              label="Income tax section"
              hint="Needed before a rate can be set."
              value={form.tdsSection}
              onChange={(e) => setForm((f) => f && { ...f, tdsSection: e.target.value })}
            />
          </div>
          <Input
            label="Yearly threshold (₹)"
            type="number"
            min={0}
            hint="Tax is kept back once a user's payouts in a financial year (1 April to 31 March) go above this."
            value={form.tdsAnnualThreshold}
            onChange={(e) => setForm((f) => f && { ...f, tdsAnnualThreshold: e.target.value })}
          />
        </fieldset>
        <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
          <legend className="px-1 text-sm font-semibold text-gray-900">App availability</legend>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.maintenanceMode}
              onChange={(e) => setForm((f) => f && { ...f, maintenanceMode: e.target.checked })}
            />
            Maintenance mode
          </label>
          {form.maintenanceMode && (
            <p role="alert" className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
              Saving with this on turns away every user and merchant straight away. Administrators can still sign in to switch it off.
            </p>
          )}
          <Input
            label="Message shown during maintenance"
            hint="Leave empty to use the standard message."
            maxLength={300}
            value={form.maintenanceMessage}
            onChange={(e) => setForm((f) => f && { ...f, maintenanceMessage: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Minimum app version"
              hint="Older apps are asked to update, such as 1.4.0."
              value={form.minimumAppVersion}
              onChange={(e) => setForm((f) => f && { ...f, minimumAppVersion: e.target.value })}
            />
            <Input
              label="Update link"
              hint="Where the update prompt sends people, such as the store page."
              value={form.updateUrl}
              onChange={(e) => setForm((f) => f && { ...f, updateUrl: e.target.value })}
            />
          </div>
        </fieldset>

        <button type="submit" className="btn-primary" disabled={saving || !!problem}>
          {saving && <Spinner size="sm" className="text-white" />}
          Save changes
        </button>
      </form>
    </div>
  )
}
