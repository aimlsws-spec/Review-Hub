import type { ReactNode } from 'react'

/** A titled block in a read-only detail view (a campaign, a merchant...). */
export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      {children}
    </section>
  )
}

/** Label and value pairs, two to a row on wider screens. */
export function FactList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 border-b border-gray-100 pb-1.5">
          <dt className="text-gray-500">{label}</dt>
          <dd className="text-right font-medium text-gray-900">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
