import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUserRoleMutation, useUserRolesQuery } from '@/hooks/useUsers'

import { StaffRolesPanel } from './StaffRolesPanel'

vi.mock('@/hooks/useUsers', () => ({ useUserRolesQuery: vi.fn(), useUserRoleMutation: vi.fn() }))

const mutate = vi.fn()
const withRoles = (roles: string[]) =>
  vi.mocked(useUserRolesQuery).mockReturnValue({ data: { data: { data: { roles } } }, isLoading: false, isError: false } as never)

describe('StaffRolesPanel', () => {
  beforeEach(() => {
    mutate.mockReset()
    vi.mocked(useUserRoleMutation).mockReturnValue({ mutate, isPending: false } as never)
  })

  it('offers to give the finance role to an admin who does not have it', async () => {
    withRoles(['ADMIN'])
    render(<StaffRolesPanel userId="user-1" />)

    expect(screen.getByRole('button', { name: /remove admin/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /make finance team/i }))

    expect(mutate).toHaveBeenCalledWith({ role: 'FINANCE_TEAM', grant: true })
  })

  it('takes a role away', async () => {
    withRoles(['ADMIN', 'FINANCE_TEAM'])
    render(<StaffRolesPanel userId="user-1" />)

    await userEvent.click(screen.getByRole('button', { name: /remove finance team/i }))

    expect(mutate).toHaveBeenCalledWith({ role: 'FINANCE_TEAM', grant: false })
  })

  it('does not offer changes for a super admin', () => {
    withRoles(['SUPER_ADMIN'])
    render(<StaffRolesPanel userId="user-1" />)

    expect(screen.getByText(/this is a super admin/i)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('says so when the roles could not be loaded', () => {
    vi.mocked(useUserRolesQuery).mockReturnValue({ data: undefined, isLoading: false, isError: true } as never)
    render(<StaffRolesPanel userId="user-1" />)

    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument()
  })
})
