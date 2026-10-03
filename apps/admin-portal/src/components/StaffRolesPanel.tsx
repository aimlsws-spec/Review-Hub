import { Skeleton } from '@reviewhub/shared-ui'

import { useUserRoleMutation, useUserRolesQuery } from '@/hooks/useUsers'
import type { StaffRole } from '@/types'

const STAFF_ROLES: Array<{ role: StaffRole; label: string; description: string }> = [
  { role: 'ADMIN', label: 'Admin', description: 'Can use the admin portal: moderation, support, users and campaigns.' },
  {
    role: 'FINANCE_TEAM',
    label: 'Finance team',
    description: 'Can approve and pay withdrawals, refunds and top-ups, claw back rewards, and see the TDS register.',
  },
]

/**
 * Lets a super admin give or take away staff roles. Only rendered for super admins; the server refuses anyone else.
 * Taking a role away signs the person out everywhere, so it stops working straight away.
 */
export function StaffRolesPanel({ userId }: { userId: string }) {
  const { data, isLoading, isError } = useUserRolesQuery(userId)
  const mutation = useUserRoleMutation(userId)
  const roles = data?.data.data.roles ?? []

  return (
    <section className="space-y-3 border-t border-gray-100 pt-4" aria-label="Staff roles">
      <h3 className="text-sm font-semibold text-gray-900">Staff roles</h3>

      {isLoading ? (
        <Skeleton className="h-4 w-48" />
      ) : isError ? (
        <p className="text-sm text-gray-500">The roles could not be loaded.</p>
      ) : roles.includes('SUPER_ADMIN') ? (
        <p className="text-sm text-gray-500">This is a super admin, who can do everything. That is not changed here.</p>
      ) : (
        <ul className="space-y-2">
          {STAFF_ROLES.map(({ role, label, description }) => {
            const has = roles.includes(role)
            return (
              <li key={role} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{label}</p>
                  <p className="text-gray-500">{description}</p>
                </div>
                <button
                  type="button"
                  className={has ? 'btn-secondary text-red-600' : 'btn-secondary'}
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ role, grant: !has })}
                >
                  {has ? `Remove ${label.toLowerCase()}` : `Make ${label.toLowerCase()}`}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
