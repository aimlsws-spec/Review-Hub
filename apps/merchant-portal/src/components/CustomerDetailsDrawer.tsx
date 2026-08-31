import { useEffect, useRef } from 'react'

import { CustomerStatusBadge, CustomerTypeBadge } from '@/components/CustomerBadges'
import { StarRating } from '@/components/ReviewCard'
import type { Customer } from '@/types/customer'
import { cn, formatCurrency, formatDate } from '@/utils'

// ─── Section / InfoRow / StatTile ────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">{title}</h3>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5">
      <span className="flex-shrink-0 text-xs text-gray-500">{label}</span>
      <span className="text-right text-xs font-medium text-gray-900">{value}</span>
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-gray-900">{value}</p>
    </div>
  )
}

// ─── Avatar helpers (presentational only) ────────────────────────────────────

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700', 'bg-sky-100 text-sky-700', 'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700', 'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700',
]

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

function colorFor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

interface CustomerDetailsDrawerProps {
  customerId: string | null
  customer: Customer | null
  onClose: () => void
}

export function CustomerDetailsDrawer({ customerId, customer, onClose }: CustomerDetailsDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const isOpen = customerId !== null

  useEffect(() => {
    if (!isOpen) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    const focusTimeout = window.setTimeout(() => closeRef.current?.focus(), 50)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      window.clearTimeout(focusTimeout)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen || !panelRef.current) return
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      if (event.shiftKey) {
        if (document.activeElement === first) { event.preventDefault(); last?.focus() }
      } else if (document.activeElement === last) {
        event.preventDefault(); first?.focus()
      }
    }
    document.addEventListener('keydown', trap)
    return () => document.removeEventListener('keydown', trap)
  }, [isOpen])

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-[250ms]',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-details-title"
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-float-card',
          'sm:w-[480px] lg:w-[520px]',
          'transition-transform duration-[250ms] ease-out motion-reduce:transition-none',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {!isOpen ? null : !customer ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p id="customer-details-title" className="text-sm font-semibold text-gray-900">Loading…</p>
            <button ref={closeRef} type="button" onClick={onClose} className="btn-secondary btn-sm mt-2" aria-label="Close customer details">
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex-shrink-0 border-b border-gray-100 px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={cn(
                      'flex h-11 w-11 flex-shrink-0 select-none items-center justify-center rounded-full text-sm font-semibold',
                      colorFor(customer.id),
                    )}
                    aria-hidden="true"
                  >
                    {initialsOf(customer.name)}
                  </div>
                  <div className="min-w-0">
                    <h2 id="customer-details-title" className="truncate text-sm font-semibold text-gray-900">
                      {customer.name}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <CustomerTypeBadge type={customer.type} />
                      <CustomerStatusBadge status={customer.status} />
                    </div>
                  </div>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={onClose}
                  className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
                  aria-label="Close customer details"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              <Section title="Contact Information">
                <div className="card divide-y divide-gray-50 px-4">
                  <InfoRow label="Full Name" value={customer.name} />
                  <InfoRow
                    label="Email"
                    value={
                      customer.email ? (
                        <a href={`mailto:${customer.email}`} className="text-primary-600 hover:underline">{customer.email}</a>
                      ) : '—'
                    }
                  />
                  <InfoRow
                    label="Phone"
                    value={
                      customer.phone ? (
                        <a href={`tel:${customer.phone}`} className="text-primary-600 hover:underline">{customer.phone}</a>
                      ) : '—'
                    }
                  />
                  <InfoRow label="First Joined a Campaign" value={formatDate(customer.joinedAt)} />
                </div>
              </Section>

              <Section title="Customer Value">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="Rewards Earned" value={formatCurrency(customer.lifetimeSpend)} />
                  <StatTile label="Tasks Completed" value={customer.totalVisits.toLocaleString('en-IN')} />
                  <StatTile label="Avg. Reward / Task" value={formatCurrency(customer.averageOrderValue)} />
                  <StatTile label="Last Active" value={customer.lastVisit ? formatDate(customer.lastVisit) : '—'} />
                </div>
              </Section>

              {customer.reviewCount > 0 && (
                <Section title="Reviews From This Customer">
                  <div className="card divide-y divide-gray-50 px-4">
                    <InfoRow label="Total Reviews" value={customer.reviewCount.toLocaleString('en-IN')} />
                    <InfoRow
                      label="Average Rating"
                      value={
                        <span className="flex items-center gap-1.5">
                          <StarRating rating={Math.round(customer.rating)} size="sm" />
                          <span className="text-xs text-gray-500">{customer.rating.toFixed(1)}</span>
                        </span>
                      }
                    />
                  </div>
                </Section>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
