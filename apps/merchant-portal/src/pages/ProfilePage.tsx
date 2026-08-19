import { useEffect, useState } from 'react'
import { PageHeader, Badge, StatusBadge, Skeleton } from '@reviewhub/shared-ui'
import { useMerchantProfileQuery, useUpdateMerchantProfileMutation } from '@/hooks/useMerchantProfile'
import type { Merchant } from '@/types'
import { cn } from '@/utils'

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="card p-6 transition-shadow duration-200 hover:shadow-md">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="section-title">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="min-w-[140px] text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 sm:text-right">{value ?? <span className="text-gray-400">—</span>}</dd>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  )
}

function BusinessLogo({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return (
    <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-2xl font-bold text-white shadow-md ring-4 ring-white">
      {logoUrl ? <img src={logoUrl} alt={`${name} logo`} className="h-20 w-20 rounded-2xl object-cover" /> : initials}
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="card p-6"><Skeleton className="mx-auto h-20 w-20 rounded-2xl" /><Skeleton className="mx-auto mt-4 h-5 w-32" /></div>
      <div className="space-y-6 lg:col-span-2">
        <div className="card p-6 space-y-3"><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></div>
        <div className="card p-6 space-y-3"><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-full" /></div>
      </div>
    </div>
  )
}

// ─── Profile Completion (computed from real fields) ────────────────────────────

function computeCompletion(m: Merchant) {
  const items = [
    { label: 'Business Name', done: !!m.businessName },
    { label: 'Business Description', done: !!m.description },
    { label: 'Contact Email', done: !!m.email },
    { label: 'Contact Phone', done: !!m.phone },
    { label: 'Website', done: !!m.website },
    { label: 'Business Address', done: !!m.addressLine1 },
    { label: 'Logo Uploaded', done: !!m.logoUrl },
    { label: 'GST Number', done: !!m.gstNumber },
    { label: 'KYC Completed', done: !!m.kycCompletedAt },
  ]
  const done = items.filter((i) => i.done).length
  return { items, done, total: items.length, pct: Math.round((done / items.length) * 100) }
}

function ProfileCompletionCard({ merchant }: { merchant: Merchant }) {
  const { items, done, total, pct } = computeCompletion(merchant)
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  const textColor = pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="card p-6 transition-shadow duration-200 hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="section-title">Profile Completion</h2>
        <span className={cn('text-2xl font-bold', textColor)}>{pct}%</span>
      </div>
      <div className="mb-5 h-2.5 w-full overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Profile ${pct}% complete`}>
        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5">
            {item.done ? (
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100" aria-hidden="true">
                <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </span>
            ) : (
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-100" aria-hidden="true">
                <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              </span>
            )}
            <span className={cn('text-sm', item.done ? 'text-gray-700' : 'text-gray-400')}>{item.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-gray-400">{done} of {total} items completed</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface FormState {
  businessName: string
  description: string
  email: string
  phone: string
  website: string
  addressLine1: string
  addressLine2: string
  postalCode: string
}

function toFormState(m: Merchant): FormState {
  return {
    businessName: m.businessName ?? '',
    description: m.description ?? '',
    email: m.email ?? '',
    phone: m.phone ?? '',
    website: m.website ?? '',
    addressLine1: m.addressLine1 ?? '',
    addressLine2: m.addressLine2 ?? '',
    postalCode: m.postalCode ?? '',
  }
}

export default function ProfilePage() {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<FormState | null>(null)

  const { data, isLoading } = useMerchantProfileQuery()
  const merchant = data?.data?.data

  useEffect(() => {
    if (merchant && !editing) setForm(toFormState(merchant))
  }, [merchant, editing])

  const updateMutation = useUpdateMerchantProfileMutation(() => setEditing(false))

  function handleSave() {
    if (!form) return
    updateMutation.mutate(form)
  }

  function handleCancel() {
    if (merchant) setForm(toFormState(merchant))
    setEditing(false)
  }

  if (isLoading || !merchant || !form) {
    return (
      <div>
        <PageHeader title="Merchant Profile" subtitle="View and edit your business information." />
        <ProfileSkeleton />
      </div>
    )
  }

  const inputCls = 'input mt-1 w-full'

  return (
    <div className="animate-fade-in">
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.35s ease-out both; }
      `}</style>

      <PageHeader
        title="Merchant Profile"
        subtitle="View and edit your business information."
        badge={<StatusBadge status={merchant.verificationStatus} />}
        primaryAction={
          editing ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleCancel} className="btn-ghost btn-sm" disabled={updateMutation.isPending}>Cancel</button>
              <button type="button" onClick={handleSave} className="btn-primary btn-sm" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="btn-primary btn-sm">Edit Profile</button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* LEFT COLUMN */}
        <div className="space-y-6">
          <div className="card p-6 transition-shadow duration-200 hover:shadow-md">
            <div className="flex flex-col items-center text-center">
              <BusinessLogo name={merchant.businessName} logoUrl={merchant.logoUrl} />
              <h1 className="mt-4 text-lg font-bold text-gray-900">{merchant.businessName}</h1>
              {merchant.legalBusinessName && <p className="text-sm text-gray-500">{merchant.legalBusinessName}</p>}

              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <StatusBadge status={merchant.status} />
                <StatusBadge status={merchant.verificationStatus} />
              </div>

              <div className="mt-4 w-full border-t border-gray-100 pt-4">
                <dl className="space-y-2 text-left">
                  <InfoRow label="Merchant ID" value={<span className="font-mono text-xs">{merchant.id}</span>} />
                  <InfoRow label="Business Type" value={merchant.businessType} />
                  <InfoRow label="Registered" value={new Date(merchant.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
                </dl>
              </div>
            </div>
          </div>

          <ProfileCompletionCard merchant={merchant} />
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6 lg:col-span-2">

          <SectionCard title="Business Information">
            {editing ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Business Name">
                  <input className={inputCls} value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
                </FormField>
                <FormField label="Website">
                  <input className={inputCls} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label="Description">
                    <textarea className={inputCls} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </FormField>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoRow label="Business Name" value={merchant.businessName} />
                <InfoRow label="Legal Name" value={merchant.legalBusinessName} />
                <InfoRow label="Business Type" value={merchant.businessType} />
                <InfoRow label="Category" value={merchant.businessCategory} />
                <InfoRow label="GST Number" value={merchant.gstNumber && <span className="font-mono text-xs">{merchant.gstNumber}</span>} />
                <InfoRow label="PAN Number" value={merchant.panNumber && <span className="font-mono text-xs">{merchant.panNumber}</span>} />
                <InfoRow label="Reg. Number" value={merchant.registrationNumber && <span className="font-mono text-xs">{merchant.registrationNumber}</span>} />
                <InfoRow label="Verification" value={<StatusBadge status={merchant.verificationStatus} />} />
                {merchant.description && (
                  <div className="sm:col-span-2 border-t border-gray-100 pt-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Description</p>
                    <p className="text-sm leading-relaxed text-gray-700">{merchant.description}</p>
                  </div>
                )}
              </dl>
            )}
            {!editing && merchant.businessCategory && (
              <div className="mt-4"><Badge variant="blue">{merchant.businessCategory}</Badge></div>
            )}
          </SectionCard>

          <SectionCard title="Contact Information">
            {editing ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Email">
                  <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </FormField>
                <FormField label="Phone">
                  <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </FormField>
              </div>
            ) : (
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoRow label="Email" value={<a href={`mailto:${merchant.email}`} className="text-primary-600 hover:underline">{merchant.email}</a>} />
                <InfoRow label="Phone" value={<a href={`tel:${merchant.phone}`} className="text-primary-600 hover:underline">{merchant.phone}</a>} />
                {merchant.website && (
                  <InfoRow label="Website" value={<a href={merchant.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">{merchant.website.replace(/^https?:\/\//, '')}</a>} />
                )}
              </dl>
            )}
          </SectionCard>

          <SectionCard title="Business Address">
            {editing ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Address Line 1">
                  <input className={inputCls} value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} />
                </FormField>
                <FormField label="Address Line 2">
                  <input className={inputCls} value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} />
                </FormField>
                <FormField label="Postal Code">
                  <input className={inputCls} value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
                </FormField>
              </div>
            ) : merchant.addressLine1 ? (
              <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600" aria-label="Full address">
                📍 {[merchant.addressLine1, merchant.addressLine2, merchant.postalCode].filter(Boolean).join(', ')}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No address on file.</p>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
