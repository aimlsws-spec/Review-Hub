import { Outlet } from 'react-router-dom'

/**
 * AuthLayout is a transparent shell.
 * Each auth page owns its own full-screen layout to support
 * different designs (e.g. two-column login vs. centered card for others).
 */
export function AuthLayout() {
  return <Outlet />
}
