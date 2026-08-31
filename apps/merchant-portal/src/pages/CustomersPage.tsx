import { EmptyState, PageHeader, Pagination, Skeleton } from '@reviewhub/shared-ui'
import { useMemo, useState } from 'react'

import { CustomerStatusBadge, CustomerTypeBadge } from '@/components/CustomerBadges'
import { CustomerDetailsDrawer } from '@/components/CustomerDetailsDrawer'
import { useCustomersQuery, useCustomerStatsQuery } from '@/hooks/useCustomers'
import { useAuthStore } from '@/stores/auth.store'
import type { Customer, CustomerStatus, CustomerType } from '@/types/customer'
import { cn, formatCurrency, formatDate } from '@/utils'

interface MetricTrend {
  value: number
  direction: 'up' | 'down'
  comparisonLabel: string
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  trend?: MetricTrend
  helperText: string
}

function formatCompactCurrency(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

function MetricCard({ icon, label, value, trend, helperText }: MetricCardProps) {
  return (
    <div className="card group p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700">{icon}</div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
        </div>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
              trend.direction === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
            )}
          >
            {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
          </span>
        )}
      </div>

      <div className="mt-5">
        <p className="text-3xl font-semibold tracking-tight text-gray-900">{value}</p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-sm text-gray-600">
        <span>{helperText}</span>
        {trend && <span className="text-gray-500">{trend.comparisonLabel}</span>}
      </div>
    </div>
  )
}

function MetricCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-4 w-26" />
        </div>
      </div>
      <Skeleton className="mt-6 h-9 w-24" />
      <div className="mt-4 flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  )
}

function CustomersListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="card p-4 md:p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="ml-auto h-7 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Avatar helpers (presentational only — real data is name/email/phone) ─────

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700', 'bg-sky-100 text-sky-700', 'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700', 'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700', 'bg-indigo-100 text-indigo-700', 'bg-teal-100 text-teal-700',
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

// ─── Sorting (within the currently loaded page — the backend paginates) ──────

type SortField = 'name' | 'lastVisit' | 'totalVisits' | 'lifetimeSpend'
type SortDirection = 'asc' | 'desc'

interface SortState {
  field: SortField
  direction: SortDirection
}

const DEFAULT_SORT_DIRECTION: Record<SortField, SortDirection> = {
  name: 'asc',
  lastVisit: 'desc',
  totalVisits: 'desc',
  lifetimeSpend: 'desc',
}

function compareCustomers(a: Customer, b: Customer, field: SortField): number {
  switch (field) {
    case 'name':
      return a.name.localeCompare(b.name)
    case 'lastVisit':
      return new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime()
    case 'totalVisits':
      return a.totalVisits - b.totalVisits
    case 'lifetimeSpend':
      return a.lifetimeSpend - b.lifetimeSpend
  }
}

interface SortableColumnHeaderProps {
  field: SortField
  label: string
  sortState: SortState | null
  onSort: (field: SortField) => void
}

function SortableColumnHeader({ field, label, sortState, onSort }: SortableColumnHeaderProps) {
  const isActive = sortState !== null && sortState.field === field
  const direction = isActive ? sortState.direction : null

  return (
    <th className="table-th" aria-sort={direction ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 rounded transition-colors hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
      >
        {label}
        <span className={cn('text-gray-400', isActive && 'text-gray-700')} aria-hidden="true">
          {direction === 'asc' ? '↑' : direction === 'desc' ? '↓' : '↕'}
        </span>
      </button>
    </th>
  )
}

const PAGE_SIZE = 20

export default function CustomersPage() {
  const merchantId = useAuthStore((s) => s.merchant?.id)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | CustomerStatus>('All')
  const [typeFilter, setTypeFilter] = useState<'All' | CustomerType>('All')
  const [sortState, setSortState] = useState<SortState | null>(null)
  const [page, setPage] = useState(1)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  const queryParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: search.trim() || undefined,
      status: statusFilter !== 'All' ? statusFilter : undefined,
      type: typeFilter !== 'All' ? typeFilter : undefined,
    }),
    [page, search, statusFilter, typeFilter],
  )

  const { data: customersRes, isLoading } = useCustomersQuery(merchantId, queryParams)

  const { data: statsRes, isLoading: statsLoading } = useCustomerStatsQuery(merchantId)

  const customers: Customer[] = customersRes?.data?.data?.data ?? []
  const total = customersRes?.data?.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const stats = statsRes?.data?.data

  const sortedCustomers = useMemo(() => {
    if (!sortState) return customers
    return [...customers].sort((a, b) => {
      const result = compareCustomers(a, b, sortState.field)
      return sortState.direction === 'asc' ? result : -result
    })
  }, [customers, sortState])

  function handleSort(field: SortField) {
    setSortState((previous) => {
      if (previous?.field === field) {
        return { field, direction: previous.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { field, direction: DEFAULT_SORT_DIRECTION[field] }
    })
  }

  function resetFilters() {
    setSearch('')
    setStatusFilter('All')
    setTypeFilter('All')
    setPage(1)
  }

  const hasActiveFilters = search !== '' || statusFilter !== 'All' || typeFilter !== 'All'

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  )

  const primaryMetrics: MetricCardProps[] = [
    {
      label: 'Total Customers',
      value: (stats?.total ?? 0).toLocaleString('en-IN'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="10" cy="7" r="3" />
        </svg>
      ),
      helperText: 'People who have taken part in your campaigns',
    },
    {
      label: 'New Customers',
      value: (stats?.newThisPeriod ?? 0).toLocaleString('en-IN'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      ),
      helperText: 'One campaign completed so far',
    },
    {
      label: 'Returning Customers',
      value: (stats?.returning ?? 0).toLocaleString('en-IN'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <path d="M3 12a9 9 0 1 0 3-6.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 4v6h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      helperText: `${stats ? (stats.retentionRate * 100).toFixed(1) : '0.0'}% of your customer base`,
    },
    {
      label: 'VIP Customers',
      value: (stats?.vip ?? 0).toLocaleString('en-IN'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <path d="M12 2.5 14.7 8l5.8.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.8-.9L12 2.5Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      helperText: 'High-visit or high-reward customers',
    },
  ]

  const secondaryMetrics: MetricCardProps[] = [
    {
      label: 'Average Customer Value',
      value: formatCurrency(stats?.averageLifetimeValue ?? 0),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      helperText: 'Average rewards paid per customer',
    },
    {
      label: 'Customer Retention',
      value: `${stats ? (stats.retentionRate * 100).toFixed(1) : '0.0'}%`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <path d="M4 12h3l2-6 5 12 2-6h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      helperText: 'Repeat customer rate',
    },
    {
      label: 'Total Customer Value',
      value: formatCompactCurrency(stats?.totalLifetimeValue ?? 0),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <path d="M3 12h18M12 3v18" strokeLinecap="round" />
          <circle cx="12" cy="12" r="8" />
        </svg>
      ),
      helperText: 'Total rewards paid across all customers',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle="People who've taken part in your campaigns, derived from real participation data."
      />

      {statsLoading ? (
        <section aria-label="Customer statistics loading" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <MetricCardSkeleton key={index} />
          ))}
        </section>
      ) : (
        <section aria-label="Customer statistics" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {primaryMetrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </section>
      )}

      <section aria-label="Secondary customer metrics" className="grid gap-4 md:grid-cols-3">
        {statsLoading
          ? Array.from({ length: 3 }).map((_, index) => <MetricCardSkeleton key={`secondary-${index}`} />)
          : secondaryMetrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <section className="card p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <label htmlFor="customer-search" className="label">Search customers</label>
            <input
              id="customer-search"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1) }}
              placeholder="Search customers by name or email..."
              className="input mt-1"
              aria-label="Search customers"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={resetFilters}>Clear Filters</button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="form-group">
            <label htmlFor="status-filter" className="label">Customer Status</label>
            <select
              id="status-filter"
              className="input mt-1"
              value={statusFilter}
              onChange={(event) => { setStatusFilter(event.target.value as 'All' | CustomerStatus); setPage(1) }}
            >
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="type-filter" className="label">Customer Type</label>
            <select
              id="type-filter"
              className="input mt-1"
              value={typeFilter}
              onChange={(event) => { setTypeFilter(event.target.value as 'All' | CustomerType); setPage(1) }}
            >
              <option value="All">All</option>
              <option value="New">New</option>
              <option value="Returning">Returning</option>
              <option value="VIP">VIP</option>
            </select>
          </div>
        </div>
      </section>

      <section aria-labelledby="customer-list-heading" className="card overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="customer-list-heading" className="text-lg font-semibold text-gray-900">Customer Directory</h2>
              <p className="text-sm text-gray-500">{total} customer{total === 1 ? '' : 's'}</p>
            </div>
            {hasActiveFilters && <span className="badge-gray">Filtered view</span>}
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 sm:p-6">
            <CustomersListSkeleton />
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            title="No customers found"
            description={hasActiveFilters ? 'Try adjusting your search or filters.' : 'Nobody has taken part in your campaigns yet.'}
            action={hasActiveFilters ? <button type="button" className="btn-primary" onClick={resetFilters}>Clear Filters</button> : undefined}
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <SortableColumnHeader field="name" label="Customer" sortState={sortState} onSort={handleSort} />
                    <th className="table-th">Contact</th>
                    <th className="table-th">Type</th>
                    <SortableColumnHeader field="lastVisit" label="Last Active" sortState={sortState} onSort={handleSort} />
                    <SortableColumnHeader field="totalVisits" label="Tasks Completed" sortState={sortState} onSort={handleSort} />
                    <SortableColumnHeader field="lifetimeSpend" label="Rewards Earned" sortState={sortState} onSort={handleSort} />
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {sortedCustomers.map((customer) => {
                    const isSelected = selectedCustomerId === customer.id
                    return (
                      <tr
                        key={customer.id}
                        className={cn('table-tr cursor-pointer', isSelected && 'bg-primary-50/60')}
                        tabIndex={0}
                        aria-selected={isSelected}
                        onClick={() => setSelectedCustomerId(customer.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setSelectedCustomerId(customer.id)
                          }
                        }}
                      >
                        <td className="table-td">
                          <div className="flex items-center gap-3">
                            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold', colorFor(customer.id))}>
                              {initialsOf(customer.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900">{customer.name}</p>
                              <p className="truncate text-sm text-gray-500">{customer.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="table-td text-sm text-gray-700">{customer.phone ?? '—'}</td>
                        <td className="table-td"><CustomerTypeBadge type={customer.type} /></td>
                        <td className="table-td">{customer.lastVisit ? formatDate(customer.lastVisit) : '—'}</td>
                        <td className="table-td">{customer.totalVisits}</td>
                        <td className="table-td font-medium text-gray-900">{formatCurrency(customer.lifetimeSpend)}</td>
                        <td className="table-td"><CustomerStatusBadge status={customer.status} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 sm:p-6 lg:hidden">
              {sortedCustomers.map((customer) => {
                const isSelected = selectedCustomerId === customer.id
                return (
                  <div
                    key={customer.id}
                    className={cn(
                      'cursor-pointer rounded-xl border border-gray-200 bg-gray-50 p-4 transition-colors',
                      isSelected && 'border-primary-300 bg-primary-50/60',
                    )}
                    role="button"
                    tabIndex={0}
                    aria-selected={isSelected}
                    onClick={() => setSelectedCustomerId(customer.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedCustomerId(customer.id)
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold', colorFor(customer.id))}>
                          {initialsOf(customer.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{customer.name}</p>
                          <p className="truncate text-sm text-gray-500">{customer.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <CustomerTypeBadge type={customer.type} />
                      <CustomerStatusBadge status={customer.status} />
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Rewards Earned</p>
                        <p className="mt-1 font-medium text-gray-900">{formatCurrency(customer.lifetimeSpend)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Last Active</p>
                        <p className="mt-1">{customer.lastVisit ? formatDate(customer.lastVisit) : '—'}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="p-4 sm:p-6">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </section>

      <CustomerDetailsDrawer
        customerId={selectedCustomerId}
        customer={selectedCustomer}
        onClose={() => setSelectedCustomerId(null)}
      />
    </div>
  )
}
