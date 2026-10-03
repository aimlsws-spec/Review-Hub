import { EmptyState, ErrorState, Input, Modal, PageHeader, Spinner, TableSkeleton, Textarea } from '@reviewhub/shared-ui'
import { useState } from 'react'

import { useSaveSubscriptionPlanMutation, useSubscriptionPlansQuery } from '@/hooks/useSubscriptionPlans'
import type { SubscriptionPlan } from '@/types'

interface FormState {
  code: string
  name: string
  description: string
  monthlyPrice: string
  /** Empty means no limit. */
  maxActiveCampaigns: string
  featuredSlots: string
  isPremium: boolean
  isActive: boolean
  sortOrder: string
}

const EMPTY_FORM: FormState = {
  code: '',
  name: '',
  description: '',
  monthlyPrice: '0',
  maxActiveCampaigns: '',
  featuredSlots: '0',
  isPremium: false,
  isActive: false,
  sortOrder: '0',
}

const rupees = (value: number) => `₹${value.toLocaleString('en-IN')}`

/**
 * Subscription plans merchants pay for from their wallet. Seeded switched off: set the real names, prices and
 * benefits here, then switch a plan on. Only the finance team and super admins can save (the server checks).
 */
export default function SubscriptionPlansPage() {
  const { data, isLoading, isError, refetch } = useSubscriptionPlansQuery()
  const plans = data?.data.data ?? []
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const { mutate: save, isPending: saving } = useSaveSubscriptionPlanMutation(() => setOpen(false))

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  const openEdit = (plan: SubscriptionPlan) => {
    setEditing(plan)
    setForm({
      code: plan.code,
      name: plan.name,
      description: plan.description ?? '',
      monthlyPrice: String(plan.monthlyPrice),
      maxActiveCampaigns: plan.maxActiveCampaigns === null ? '' : String(plan.maxActiveCampaigns),
      featuredSlots: String(plan.featuredSlots),
      isPremium: plan.isPremium,
      isActive: plan.isActive,
      sortOrder: String(plan.sortOrder),
    })
    setOpen(true)
  }

  const price = Number(form.monthlyPrice)
  const canSave = /^[A-Z0-9_]{2,40}$/.test(form.code) && form.name.trim().length > 0 && Number.isFinite(price) && price >= 0

  const handleSave = () =>
    save({
      planId: editing?.id ?? null,
      form: {
        code: form.code,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        monthlyPrice: price,
        maxActiveCampaigns: form.maxActiveCampaigns.trim() === '' ? null : Number(form.maxActiveCampaigns),
        featuredSlots: Number(form.featuredSlots),
        isPremium: form.isPremium,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder),
      },
    })

  return (
    <div>
      <PageHeader
        title="Subscription plans"
        subtitle="Plans merchants pay for monthly from their wallet. GST is added on top of the price."
        primaryAction={<button className="btn-primary" onClick={openCreate}>New plan</button>}
      />

      {isLoading ? (
        <TableSkeleton rows={3} cols={6} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : plans.length === 0 ? (
        <EmptyState title="No plans yet" description="Create a plan, then switch it on." />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Plan</th>
                <th className="table-th">Price / month</th>
                <th className="table-th">Campaigns at once</th>
                <th className="table-th">Featured included</th>
                <th className="table-th">Merchants</th>
                <th className="table-th">Offered</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {plans.map((plan) => (
                <tr key={plan.id} className="table-tr">
                  <td className="table-td">
                    <p className="font-medium text-gray-900">
                      {plan.name}
                      {plan.isPremium && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">Premium</span>}
                    </p>
                    <p className="font-mono text-xs text-gray-500">{plan.code}</p>
                  </td>
                  <td className="table-td text-gray-900">{rupees(Number(plan.monthlyPrice))}</td>
                  <td className="table-td text-gray-500">{plan.maxActiveCampaigns ?? 'No limit'}</td>
                  <td className="table-td text-gray-500">{plan.featuredSlots}</td>
                  <td className="table-td text-gray-500">{plan.subscribers}</td>
                  <td className="table-td text-gray-500">{plan.isActive ? 'Yes' : 'No (switched off)'}</td>
                  <td className="table-td text-right">
                    <button className="btn-ghost btn-sm" onClick={() => openEdit(plan)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <Modal
          open
          onClose={() => setOpen(false)}
          title={editing ? `Edit ${editing.name}` : 'New plan'}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setOpen(false)} disabled={saving}>Cancel</button>
              <button className="btn-primary" disabled={!canSave || saving} onClick={handleSave}>
                {saving && <Spinner size="sm" className="text-white" />}
                {editing ? 'Save changes' : 'Create plan'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Code"
              required
              placeholder="GROWTH"
              value={form.code}
              disabled={!!editing}
              hint={editing ? 'The code can not change.' : 'Capital letters, digits and underscores.'}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            />
            <Input label="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Textarea
              label="What the merchant gets"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Price per month (₹, before GST)"
                type="number"
                min={0}
                value={form.monthlyPrice}
                hint={editing ? 'A new price applies from each merchant’s next renewal.' : undefined}
                onChange={(e) => setForm((f) => ({ ...f, monthlyPrice: e.target.value }))}
              />
              <Input
                label="Campaigns at once"
                type="number"
                min={1}
                placeholder="No limit"
                value={form.maxActiveCampaigns}
                hint="Shown to merchants; not enforced yet."
                onChange={(e) => setForm((f) => ({ ...f, maxActiveCampaigns: e.target.value }))}
              />
              <Input
                label="Featured campaigns included"
                type="number"
                min={0}
                value={form.featuredSlots}
                onChange={(e) => setForm((f) => ({ ...f, featuredSlots: e.target.value }))}
              />
              <Input
                label="Order on the page"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.isPremium} onChange={(e) => setForm((f) => ({ ...f, isPremium: e.target.checked }))} />
              Premium (gives the merchant verification level L4)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
              Offered to merchants
            </label>
          </div>
        </Modal>
      )}
    </div>
  )
}
