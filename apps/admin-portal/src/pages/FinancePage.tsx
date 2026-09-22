import { PageHeader } from '@reviewhub/shared-ui'
import { useState } from 'react'

import { InvoiceNotesPanel } from '@/components/InvoiceNotesPanel'
import { TdsPanel } from '@/components/TdsPanel'
import { TopUpApprovalsPanel } from '@/components/TopUpApprovalsPanel'
import { cn } from '@/utils'

type Tab = 'tds' | 'invoices' | 'topups'

const TABS: { value: Tab; label: string }[] = [
  { value: 'tds', label: 'TDS on payouts' },
  { value: 'invoices', label: 'Invoices and notes' },
  { value: 'topups', label: 'Top-ups awaiting approval' },
]

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>('tds')

  return (
    <div>
      <PageHeader title="Finance" subtitle="Tax kept back from user payouts, credit and debit notes on merchant invoices, and large bank-transfer top-ups waiting for a second admin." />

      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn('-mb-px border-b-2 px-4 py-2.5 text-sm font-medium', tab === value ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700')}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'tds' ? <TdsPanel /> : tab === 'invoices' ? <InvoiceNotesPanel /> : <TopUpApprovalsPanel />}
    </div>
  )
}
