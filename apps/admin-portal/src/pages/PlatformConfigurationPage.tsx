import { CardSkeleton, ErrorState, Input, PageHeader, Spinner } from '@reviewhub/shared-ui'
import { useEffect, useState } from 'react'

import { usePlatformConfigurationQuery, useUpdatePlatformConfigurationMutation } from '@/hooks/usePlatformConfiguration'

interface FormState {
  platformName: string
  supportEmail: string
  supportPhone: string
  commissionPercentage: string
  minimumWithdrawal: string
  maximumWithdrawal: string
  maintenanceMode: boolean
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
        maintenanceMode: config.maintenanceMode,
      })
    }
  }, [config])

  const { mutate: save, isPending: saving } = useUpdatePlatformConfigurationMutation()

  if (isLoading || !form) return <CardSkeleton />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    save({
      platformName: form.platformName,
      supportEmail: form.supportEmail || undefined,
      supportPhone: form.supportPhone || undefined,
      commissionPercentage: Number(form.commissionPercentage),
      minimumWithdrawal: Number(form.minimumWithdrawal),
      maximumWithdrawal: Number(form.maximumWithdrawal),
      maintenanceMode: form.maintenanceMode,
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
        <Input
          label="Minimum withdrawal"
          type="number"
          min={0}
          value={form.minimumWithdrawal}
          onChange={(e) => setForm((f) => f && { ...f, minimumWithdrawal: e.target.value })}
        />
        <Input
          label="Maximum withdrawal"
          type="number"
          min={0}
          value={form.maximumWithdrawal}
          onChange={(e) => setForm((f) => f && { ...f, maximumWithdrawal: e.target.value })}
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.maintenanceMode}
            onChange={(e) => setForm((f) => f && { ...f, maintenanceMode: e.target.checked })}
          />
          Maintenance mode
        </label>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Spinner size="sm" className="text-white" />}
          Save changes
        </button>
      </form>
    </div>
  )
}
