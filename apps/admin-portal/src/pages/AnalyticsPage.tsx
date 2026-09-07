import { CardSkeleton, EmptyState, ErrorState, Input, PageHeader, TableSkeleton, Pagination } from '@reviewhub/shared-ui'
import { useMemo, useState } from 'react'

import { ITEMS_PER_PAGE } from '@/constants'
import {
  useAnalyticsEventsQuery,
  useDailyAnalyticsQuery,
  useMerchantAnalyticsQuery,
  useUserAnalyticsQuery,
} from '@/hooks/useAnalytics'
import { formatCurrency, formatDate, formatDateTime } from '@/utils'

function isoDateDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function DailyTrendsSection() {
  const [from, setFrom] = useState(isoDateDaysAgo(30))
  const [to, setTo] = useState(isoDateDaysAgo(0))

  const { data, isLoading, isError, refetch } = useDailyAnalyticsQuery(from, to)
  const days = useMemo(() => data?.data.data ?? [], [data])

  const totals = useMemo(
    () =>
      days.reduce(
        (acc, d) => ({
          newUsers: acc.newUsers + d.newUsers,
          submissions: acc.submissions + d.submissions,
          rewardsPaid: acc.rewardsPaid + d.rewardsPaid,
          revenue: acc.revenue + d.revenue,
        }),
        { newUsers: 0, submissions: 0, rewardsPaid: 0, revenue: 0 },
      ),
    [days],
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {isLoading ? (
        <CardSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-4">
              <p className="text-xs text-gray-500">New users</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{totals.newUsers}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500">Submissions</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{totals.submissions}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500">Rewards paid</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(totals.rewardsPaid)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500">Revenue</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(totals.revenue)}</p>
            </div>
          </div>

          {days.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No daily analytics for this range" description="Rows are recorded as they're aggregated." />
            </div>
          ) : (
            <div className="table-container mt-4">
              <table className="table">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-th">Date</th>
                    <th className="table-th">New users</th>
                    <th className="table-th">Submissions</th>
                    <th className="table-th">Rewards paid</th>
                    <th className="table-th">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {days.map((d) => (
                    <tr key={d.id} className="table-tr">
                      <td className="table-td text-gray-900">{formatDate(d.date)}</td>
                      <td className="table-td text-gray-500">{d.newUsers}</td>
                      <td className="table-td text-gray-500">{d.submissions}</td>
                      <td className="table-td text-gray-500">{formatCurrency(d.rewardsPaid)}</td>
                      <td className="table-td text-gray-500">{formatCurrency(d.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function LookupSection() {
  const [merchantId, setMerchantId] = useState('')
  const [userId, setUserId] = useState('')

  const merchantQuery = useMerchantAnalyticsQuery(merchantId)
  const userQuery = useUserAnalyticsQuery(userId)

  const merchantAnalytics = merchantQuery.data?.data.data
  const userAnalytics = userQuery.data?.data.data

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900">Merchant lookup</h3>
        <Input className="mt-2" placeholder="Merchant ID" value={merchantId} onChange={(e) => setMerchantId(e.target.value)} />
        {merchantId && merchantQuery.isFetched && (
          merchantAnalytics ? (
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Total campaigns</dt><dd className="text-gray-900">{merchantAnalytics.totalCampaigns}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Total spent</dt><dd className="text-gray-900">{formatCurrency(merchantAnalytics.totalSpent)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Avg. completion rate</dt><dd className="text-gray-900">{(merchantAnalytics.averageCompletionRate * 100).toFixed(1)}%</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Revenue generated</dt><dd className="text-gray-900">{formatCurrency(merchantAnalytics.totalRevenueGenerated)}</dd></div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-gray-400">No analytics recorded for this merchant yet.</p>
          )
        )}
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900">User lookup</h3>
        <Input className="mt-2" placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
        {userId && userQuery.isFetched && (
          userAnalytics ? (
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Campaigns joined</dt><dd className="text-gray-900">{userAnalytics.campaignsJoined}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Rewards earned</dt><dd className="text-gray-900">{formatCurrency(userAnalytics.rewardsEarned)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Referrals</dt><dd className="text-gray-900">{userAnalytics.referrals}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Fraud flags</dt><dd className="text-gray-900">{userAnalytics.fraudFlags}</dd></div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-gray-400">No analytics recorded for this user yet.</p>
          )
        )}
      </div>
    </div>
  )
}

function EventsSection() {
  const [page, setPage] = useState(1)
  const [eventName, setEventName] = useState('')
  const [eventCategory, setEventCategory] = useState('')

  const { data, isLoading, isError, refetch } = useAnalyticsEventsQuery({
    page,
    limit: ITEMS_PER_PAGE,
    eventName: eventName || undefined,
    eventCategory: eventCategory || undefined,
  })

  const events = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <Input placeholder="Filter by event name" value={eventName} onChange={(e) => { setEventName(e.target.value); setPage(1) }} />
        <Input placeholder="Filter by category" value={eventCategory} onChange={(e) => { setEventCategory(e.target.value); setPage(1) }} />
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : events.length === 0 ? (
        <EmptyState title="No events found" description="Try adjusting the filters." />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Event</th>
                <th className="table-th">Category</th>
                <th className="table-th">Entity</th>
                <th className="table-th">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.map((event) => (
                <tr key={event.id} className="table-tr">
                  <td className="table-td font-medium text-gray-900">{event.eventName}</td>
                  <td className="table-td text-gray-500">{event.eventCategory}</td>
                  <td className="table-td text-gray-500">{event.entityType ? `${event.entityType}:${event.entityId}` : '—'}</td>
                  <td className="table-td text-gray-500">{formatDateTime(event.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Analytics" subtitle="Platform activity, trends, and per-account breakdowns." />

      <section>
        <h2 className="section-title mb-3">Daily trends</h2>
        <DailyTrendsSection />
      </section>

      <section>
        <h2 className="section-title mb-3">Lookup</h2>
        <LookupSection />
      </section>

      <section>
        <h2 className="section-title mb-3">Recent events</h2>
        <EventsSection />
      </section>
    </div>
  )
}
