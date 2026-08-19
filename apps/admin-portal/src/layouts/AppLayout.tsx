import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNavbar } from './TopNavbar'
import { PageLoader } from '@reviewhub/shared-ui'

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const toggleSidebar = () => {
    // On mobile: toggle drawer. On desktop: toggle collapse.
    if (window.innerWidth < 1024) {
      setMobileOpen((v) => !v)
    } else {
      setCollapsed((v) => !v)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopNavbar onMenuClick={toggleSidebar} sidebarCollapsed={collapsed} />

        <main className="flex-1 overflow-y-auto" id="main-content">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
