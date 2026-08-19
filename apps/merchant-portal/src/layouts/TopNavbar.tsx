import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cn, getInitials } from '@/utils'
import { ROUTES } from '@/constants'
import { useAuthStore } from '@/stores/auth.store'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@reviewhub/shared-ui'
import toast from 'react-hot-toast'

// ─── Route label map for breadcrumbs ─────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  dashboard:  'Dashboard',
  profile:    'Profile',
  reviews:    'Reviews',
  customers:  'Customers',
  rewards:    'Rewards',
  coupons:    'Coupons',
  wallet:     'Wallet',
  documents:  'Documents',
  team:       'Team',
  settings:   'Settings',
  support:    'Support',
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb() {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)

  return (
    <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-sm">
      <Link
        to={ROUTES.DASHBOARD}
        className="text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="Home"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </Link>

      {segments.map((seg, i) => {
        const label = ROUTE_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1)
        const isLast = i === segments.length - 1
        const to = '/' + segments.slice(0, i + 1).join('/')

        return (
          <span key={to} className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {isLast ? (
              <span className="font-medium text-slate-700" aria-current="page">{label}</span>
            ) : (
              <Link to={to} className="text-slate-400 hover:text-slate-600 transition-colors">{label}</Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}

// ─── Notifications ────────────────────────────────────────────────────────────

function NotificationButton() {
  return (
    <button
      type="button"
      className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50"
      aria-label="Notifications"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {/* Unread dot placeholder */}
      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white" aria-hidden="true" />
    </button>
  )
}

// ─── User Menu ────────────────────────────────────────────────────────────────

function UserMenu() {
  const { user, merchant } = useAuthStore()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    setOpen(false)
    try {
      await logout()
      toast.success('Logged out successfully')
    } finally {
      navigate(ROUTES.LOGIN)
      setLoggingOut(false)
    }
  }

  const initials = user ? getInitials(user.firstName, user.lastName) : 'M'
  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Merchant'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="User menu"
      >
        {/* Avatar */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-xs font-bold text-white ring-2 ring-white shadow-sm">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={displayName} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-[13px] font-semibold text-slate-800 leading-tight">{displayName}</p>
          {merchant && (
            <p className="text-[11px] text-slate-400 leading-tight truncate max-w-[120px]">{merchant.businessName}</p>
          )}
        </div>
        <svg
          className={cn('hidden md:block h-4 w-4 text-slate-400 transition-transform duration-150', open && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-100 bg-white py-1.5 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.12),0_2px_8px_-2px_rgba(0,0,0,0.06)] z-50"
          role="menu"
          aria-label="User menu options"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-[13px] font-semibold text-slate-800">{displayName}</p>
            <p className="text-[12px] text-slate-400 truncate">{user?.email ?? user?.phone}</p>
          </div>

          <div className="py-1">
            <Link
              to={ROUTES.PROFILE}
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex items-center gap-3 px-4 py-2 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              My Profile
            </Link>
            <Link
              to={ROUTES.SETTINGS}
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex items-center gap-3 px-4 py-2 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </Link>
            <Link
              to={ROUTES.SUPPORT}
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex items-center gap-3 px-4 py-2 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Support
            </Link>
          </div>

          <div className="border-t border-slate-100 py-1">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {loggingOut ? (
                <Spinner size="sm" className="text-red-500" />
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              )}
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Search ───────────────────────────────────────────────────────────────────

function SearchBar() {
  return (
    <div className="hidden lg:flex items-center gap-2 h-9 w-56 xl:w-72 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 cursor-text hover:border-slate-300 transition-colors">
      <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <span className="text-[13px]">Search…</span>
      <kbd className="ml-auto hidden xl:inline-flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
        ⌘K
      </kbd>
    </div>
  )
}

// ─── TopNavbar ────────────────────────────────────────────────────────────────

interface TopNavbarProps {
  onMenuClick: () => void
  sidebarCollapsed: boolean
}

export function TopNavbar({ onMenuClick, sidebarCollapsed }: TopNavbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 backdrop-blur-sm px-4 lg:px-6">
      {/* Mobile hamburger / Desktop collapse toggle */}
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-1.5">
        <SearchBar />
        <NotificationButton />
        <div className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />
        <UserMenu />
      </div>
    </header>
  )
}
