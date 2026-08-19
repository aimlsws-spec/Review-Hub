import { NavLink, useNavigate } from 'react-router-dom'
import { cn, getInitials } from '@/utils'
import { ROUTES } from '@/constants'
import { useAuthStore } from '@/stores/auth.store'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@reviewhub/shared-ui'
import { useState } from 'react'
import toast from 'react-hot-toast'

// ─── Nav structure ────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      {
        label: 'Dashboard',
        to: ROUTES.DASHBOARD,
        icon: (
          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Engagement',
    items: [
      {
        label: 'Reviews',
        to: ROUTES.REVIEWS,
        icon: (
          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        ),
      },
      {
        label: 'Customers',
        to: ROUTES.CUSTOMERS,
        icon: (
          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Campaigns',
    items: [
      {
        label: 'Campaigns',
        to: ROUTES.CAMPAIGNS,
        icon: (
          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
      {
        label: 'Rewards',
        to: ROUTES.REWARDS,
        icon: (
          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        ),
      },
      {
        label: 'Coupons',
        to: ROUTES.COUPONS,
        icon: (
          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Finance',
    items: [
      {
        label: 'Wallet',
        to: ROUTES.WALLET,
        icon: (
          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Account',
    items: [
      {
        label: 'Documents',
        to: ROUTES.DOCUMENTS,
        icon: (
          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        label: 'Team',
        to: ROUTES.TEAM,
        icon: (
          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
      },
      {
        label: 'Settings',
        to: ROUTES.SETTINGS,
        icon: (
          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        label: 'Support',
        to: ROUTES.SUPPORT,
        icon: (
          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
      },
    ],
  },
]

// ─── SidebarItem ──────────────────────────────────────────────────────────────

interface SidebarItemProps {
  item: NavItem
  collapsed: boolean
  onClick?: () => void
}

function SidebarItem({ item, collapsed, onClick }: SidebarItemProps) {
  return (
    <li>
      <NavLink
        to={item.to}
        onClick={onClick}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) =>
          cn(
            'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50',
            isActive
              ? 'bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 shadow-[inset_0_0_0_1px_rgba(251,146,60,0.15)]'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            collapsed && 'justify-center px-2',
          )
        }
      >
        {({ isActive }) => (
          <>
            {/* Active left bar */}
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-orange-500" aria-hidden="true" />
            )}
            <span className={cn('flex-shrink-0 transition-colors', isActive ? 'text-orange-600' : 'text-slate-400 group-hover:text-slate-600')}>
              {item.icon}
            </span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </>
        )}
      </NavLink>
    </li>
  )
}

// ─── Sidebar inner content ────────────────────────────────────────────────────

interface SidebarContentProps {
  collapsed: boolean
  onClose?: () => void
  onLogout: () => void
  loggingOut: boolean
}

function SidebarContent({ collapsed, onClose, onLogout, loggingOut }: SidebarContentProps) {
  const { user, merchant } = useAuthStore()
  const initials = user ? getInitials(user.firstName, user.lastName) : 'M'

  return (
    <div className="flex h-full flex-col">
      {/* ── Logo ── */}
      <div className={cn('flex h-14 flex-shrink-0 items-center border-b border-slate-100 px-4', collapsed ? 'justify-center' : 'gap-3')}>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-orange-400 to-orange-600 shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5 h-[18px] w-[18px]" aria-hidden="true">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" fill="white" />
          </svg>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[14px] font-extrabold tracking-tight text-slate-900 leading-none">ReviewHub</p>
            <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-widest mt-0.5">Merchant Portal</p>
          </div>
        )}
      </div>

      {/* ── Merchant badge ── */}
      {merchant && !collapsed && (
        <div className="mx-3 mt-3 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100/60 px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-slate-800">{merchant.businessName}</p>
              <p className="text-[10px] text-slate-400 capitalize">{merchant.status.toLowerCase().replace(/_/g, ' ')}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Nav ── */}
      <nav
        className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5"
        aria-label="Main navigation"
      >
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
            {group.label && !collapsed && (
              <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {group.label}
              </p>
            )}
            {group.label && collapsed && gi > 0 && (
              <div className="my-2 mx-3 h-px bg-slate-100" aria-hidden="true" />
            )}
            <ul className="space-y-0.5" role="list">
              {group.items.map((item) => (
                <SidebarItem key={item.to} item={item} collapsed={collapsed} onClick={onClose} />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── User footer ── */}
      <div className="flex-shrink-0 border-t border-slate-100 p-3">
        {collapsed ? (
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            title="Sign out"
            className="flex w-full items-center justify-center rounded-xl p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 disabled:opacity-50"
            aria-label="Sign out"
          >
            {loggingOut ? (
              <Spinner size="sm" className="text-red-500" />
            ) : (
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl p-2 hover:bg-slate-50 transition-colors">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-[11px] font-bold text-white ring-2 ring-white shadow-sm">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-slate-800">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-[11px] text-slate-400">{user?.email ?? user?.phone}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              disabled={loggingOut}
              className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 disabled:opacity-50"
              aria-label="Sign out"
              title="Sign out"
            >
              {loggingOut ? (
                <Spinner size="sm" className="text-red-500" />
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sidebar (exported) ───────────────────────────────────────────────────────

interface SidebarProps {
  /** Mobile drawer open state */
  mobileOpen: boolean
  onMobileClose: () => void
  /** Desktop collapsed state */
  collapsed: boolean
}

export function Sidebar({ mobileOpen, onMobileClose, collapsed }: SidebarProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      toast.success('Logged out successfully')
    } finally {
      navigate(ROUTES.LOGIN)
      setLoggingOut(false)
    }
  }

  return (
    <>
      {/* ── Mobile overlay ── */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      {/* ── Mobile drawer ── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl transition-transform duration-200 ease-out lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Mobile navigation"
        aria-hidden={!mobileOpen}
      >
        {/* Mobile close button */}
        <button
          type="button"
          onClick={onMobileClose}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50"
          aria-label="Close navigation"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <SidebarContent
          collapsed={false}
          onClose={onMobileClose}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          'hidden lg:flex flex-col flex-shrink-0 bg-white border-r border-slate-200 transition-all duration-200 ease-out overflow-hidden',
          collapsed ? 'w-[60px]' : 'w-60',
        )}
        aria-label="Main navigation"
      >
        <SidebarContent
          collapsed={collapsed}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
      </aside>
    </>
  )
}
