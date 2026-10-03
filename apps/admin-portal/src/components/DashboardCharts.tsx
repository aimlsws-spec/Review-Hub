import { Skeleton } from '@reviewhub/shared-ui'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { useDashboardSeries } from '@/hooks/useDashboardStats'
import type { DashboardDay } from '@/types'

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
]

const rupees = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

/** "2026-09-21" → "21 Sep", for the axis. */
function shortDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`)
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

interface ChartCardProps {
  title: string
  total: string
  children: React.ReactElement
}

function ChartCard({ title, total, children }: ChartCardProps) {
  return (
    <section className="card p-5" aria-label={title}>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <span className="text-sm text-gray-500">{total}</span>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  )
}

function SingleBar({ data, dataKey, color, money }: { data: DashboardDay[]; dataKey: keyof DashboardDay; color: string; money?: boolean }) {
  return (
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="day" tickFormatter={shortDay} fontSize={11} />
      <YAxis fontSize={11} allowDecimals={!!money} />
      <Tooltip labelFormatter={(day) => shortDay(String(day))} formatter={(value) => (money ? rupees(Number(value)) : value)} />
      <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} />
    </BarChart>
  )
}

/**
 * Platform activity per India day: commission earned, new users, campaigns created, withdrawals asked for and paid,
 * and fraud flags raised. Figures come straight from the database (GET /admin/dashboard/series).
 */
export function DashboardCharts() {
  const [days, setDays] = useState(30)
  const { data, isLoading, isError, refetch } = useDashboardSeries(days)
  const series = data?.data.data

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title">Platform activity</h2>
        <div className="flex gap-1" role="group" aria-label="Range">
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              aria-pressed={days === range.days}
              className={days === range.days ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setDays(range.days)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-60 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      ) : isError || !series ? (
        <div className="card p-5 text-sm text-gray-500">
          The charts could not be loaded.{' '}
          <button type="button" className="font-medium text-primary-600" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      ) : series.days.every((day) => Object.values({ ...day, day: 0 }).every((value) => value === 0)) ? (
        <div className="card p-5 text-sm text-gray-500">No activity in the last {days} days.</div>
      ) : (
        <>
          <p className="text-sm text-gray-500">{series.activeCampaigns} campaigns are running now.</p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Commission earned" total={rupees(series.totals.commission)}>
              <SingleBar data={series.days} dataKey="commission" color="#2563EB" money />
            </ChartCard>
            <ChartCard title="New users" total={String(series.totals.newUsers)}>
              <LineChart data={series.days}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickFormatter={shortDay} fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip labelFormatter={(day) => shortDay(String(day))} />
                <Line type="monotone" dataKey="newUsers" name="New users" stroke="#7C3AED" dot={false} />
              </LineChart>
            </ChartCard>
            <ChartCard title="Campaigns created" total={String(series.totals.campaignsCreated)}>
              <SingleBar data={series.days} dataKey="campaignsCreated" color="#F18E31" />
            </ChartCard>
            <ChartCard
              title="Withdrawals"
              total={`${rupees(series.totals.withdrawalsRequested)} asked · ${rupees(series.totals.withdrawalsPaid)} paid`}
            >
              <LineChart data={series.days}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickFormatter={shortDay} fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip labelFormatter={(day) => shortDay(String(day))} formatter={(value) => rupees(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="withdrawalsRequested" name="Asked for" stroke="#EAB308" dot={false} />
                <Line type="monotone" dataKey="withdrawalsPaid" name="Paid" stroke="#16A34A" dot={false} />
              </LineChart>
            </ChartCard>
            <ChartCard title="Fraud flags raised" total={String(series.totals.fraudFlags)}>
              <SingleBar data={series.days} dataKey="fraudFlags" color="#DC2626" />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}
