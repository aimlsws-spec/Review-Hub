import { useEffect, useRef, useState } from 'react'
import type { Customer, CustomerAction } from '@/types/customer'
import { cn } from '@/utils'

interface CustomerActionItem {
  action: CustomerAction
  label: string
  icon: React.ReactNode
  destructive?: boolean
  dividerBefore?: boolean
}

export const CUSTOMER_ACTION_ITEMS: CustomerActionItem[] = [
  {
    action: 'view',
    label: 'View Customer',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    action: 'edit',
    label: 'Edit Customer',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    action: 'message',
    label: 'Send Message',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path
          d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    action: 'reviews',
    label: 'View Reviews',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M12 2.5 14.7 8l5.8.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.8-.9L12 2.5Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    action: 'remove',
    label: 'Remove Customer',
    destructive: true,
    dividerBefore: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-8 0 1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

interface CustomerActionsMenuProps {
  customer: Customer
  onAction: (action: CustomerAction, customer: Customer) => void
}

export function CustomerActionsMenu({ customer, onAction }: CustomerActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div ref={ref} className="relative inline-block text-left" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="btn-ghost btn-sm px-2"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Actions for ${customer.name}`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={`Actions for ${customer.name}`}
          className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          {CUSTOMER_ACTION_ITEMS.map((item) => (
            <div key={item.action}>
              {item.dividerBefore && <div className="my-1 border-t border-gray-100" role="separator" />}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onAction(item.action, customer)
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                  item.destructive ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                <span className={item.destructive ? 'text-red-400' : 'text-gray-400'}>{item.icon}</span>
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
