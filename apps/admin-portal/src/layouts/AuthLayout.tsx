import { Outlet } from 'react-router-dom'

/**
 * AuthLayout is a transparent shell — the login page owns its own
 * full-screen layout.
 */
export function AuthLayout() {
  return <Outlet />
}
