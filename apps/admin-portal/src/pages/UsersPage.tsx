import { useState } from 'react'
import { ITEMS_PER_PAGE, USER_STATUS_LABELS } from '@/constants'
import {
  PageHeader,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Skeleton,
  Pagination,
  StatusBadge,
  ConfirmDialog,
  Modal,
  Select,
} from '@reviewhub/shared-ui'
import { formatDate, getInitials } from '@/utils'
import { useUserActionMutation, useUserDetailQuery, useUsersQuery } from '@/hooks/useUsers'
import type { AdminUser, UserStatus } from '@/types'

type ActionKind = 'suspend' | 'ban' | 'reactivate'

const STATUS_OPTIONS = Object.entries(USER_STATUS_LABELS).map(([value, label]) => ({ value, label }))

export default function UsersPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<UserStatus | ''>('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [confirmTarget, setConfirmTarget] = useState<{ user: AdminUser; action: ActionKind } | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useUsersQuery({ page, limit: ITEMS_PER_PAGE, status, search })

  const users = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const detailQuery = useUserDetailQuery(selectedUserId)

  const detail = detailQuery.data?.data.data

  const { mutate: applyAction, isPending } = useUserActionMutation(() => setConfirmTarget(null))

  const actionCopy: Record<ActionKind, { title: string; message: (name: string) => string; confirmLabel: string; variant: 'danger' | 'primary' }> = {
    suspend: {
      title: 'Suspend user',
      message: (name) => `Suspend ${name}? They will be unable to sign in until reactivated.`,
      confirmLabel: 'Suspend',
      variant: 'danger',
    },
    ban: {
      title: 'Ban user',
      message: (name) => `Permanently ban ${name}? This is a strong action reserved for confirmed policy violations.`,
      confirmLabel: 'Ban',
      variant: 'danger',
    },
    reactivate: {
      title: 'Reactivate user',
      message: (name) => `Restore ${name} to active status?`,
      confirmLabel: 'Reactivate',
      variant: 'primary',
    },
  }

  return (
    <div>
      <PageHeader title="Users" subtitle="Search, review, and moderate platform users." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="form-group flex-1 max-w-sm">
          <label className="label" htmlFor="search">Search</label>
          <input
            id="search"
            className="input"
            placeholder="Name, email, or phone"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1)
                setSearch(searchInput)
              }
            }}
          />
        </div>
        <div className="w-48">
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            placeholder="All statuses"
            value={status}
            onChange={(e) => {
              setPage(1)
              setStatus(e.target.value as UserStatus | '')
            }}
          />
        </div>
        <button
          className="btn-secondary"
          onClick={() => {
            setPage(1)
            setSearch(searchInput)
          }}
        >
          Apply
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : users.length === 0 ? (
        <EmptyState
          title="No users found"
          description="Try adjusting your search or status filter."
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">User</th>
                <th className="table-th">Contact</th>
                <th className="table-th">Status</th>
                <th className="table-th">Joined</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="table-tr cursor-pointer" onClick={() => setSelectedUserId(user.id)}>
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                        {getInitials(user.firstName, user.lastName)}
                      </div>
                      <span className="font-medium text-gray-900">{user.firstName} {user.lastName}</span>
                    </div>
                  </td>
                  <td className="table-td text-gray-500">{user.email ?? user.phone ?? '—'}</td>
                  <td className="table-td"><StatusBadge status={user.status} /></td>
                  <td className="table-td text-gray-500">{formatDate(user.createdAt)}</td>
                  <td className="table-td text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      {user.status !== 'SUSPENDED' && user.status !== 'BANNED' && (
                        <button className="btn-ghost btn-sm" onClick={() => setConfirmTarget({ user, action: 'suspend' })}>
                          Suspend
                        </button>
                      )}
                      {user.status !== 'BANNED' && (
                        <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => setConfirmTarget({ user, action: 'ban' })}>
                          Ban
                        </button>
                      )}
                      {(user.status === 'SUSPENDED' || user.status === 'BANNED') && (
                        <button className="btn-ghost btn-sm text-green-700 hover:bg-green-50" onClick={() => setConfirmTarget({ user, action: 'reactivate' })}>
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {confirmTarget && (
        <ConfirmDialog
          open
          onClose={() => setConfirmTarget(null)}
          onConfirm={() => applyAction(confirmTarget)}
          title={actionCopy[confirmTarget.action].title}
          message={actionCopy[confirmTarget.action].message(`${confirmTarget.user.firstName} ${confirmTarget.user.lastName}`)}
          confirmLabel={actionCopy[confirmTarget.action].confirmLabel}
          variant={actionCopy[confirmTarget.action].variant}
          loading={isPending}
        />
      )}

      {/* User detail modal */}
      <Modal open={!!selectedUserId} onClose={() => setSelectedUserId(null)} title="User Details" size="xl">
        {detailQuery.isLoading || !detail ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                  {getInitials(detail.firstName, detail.lastName)}
                </div>
                <p className="text-base font-semibold text-gray-900">{detail.firstName} {detail.lastName}</p>
              </div>
              <StatusBadge status={detail.status} />
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><span className="text-gray-400">Email</span><p className="text-gray-900">{detail.email ?? '—'}</p></div>
              <div><span className="text-gray-400">Phone</span><p className="text-gray-900">{detail.phone ?? '—'}</p></div>
              <div><span className="text-gray-400">Email Verified</span><p className="text-gray-900">{detail.emailVerifiedAt ? formatDate(detail.emailVerifiedAt) : 'Not verified'}</p></div>
              <div><span className="text-gray-400">Phone Verified</span><p className="text-gray-900">{detail.phoneVerifiedAt ? formatDate(detail.phoneVerifiedAt) : 'Not verified'}</p></div>
              <div><span className="text-gray-400">Referral Code</span><p className="text-gray-900 font-mono text-xs">{detail.referralCode}</p></div>
              <div><span className="text-gray-400">Last Login</span><p className="text-gray-900">{detail.lastLoginAt ? formatDate(detail.lastLoginAt) : 'Never'}</p></div>
              <div><span className="text-gray-400">Joined</span><p className="text-gray-900">{formatDate(detail.createdAt)}</p></div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              {detail.status !== 'SUSPENDED' && detail.status !== 'BANNED' && (
                <button className="btn-secondary" onClick={() => setConfirmTarget({ user: detail, action: 'suspend' })}>
                  Suspend
                </button>
              )}
              {detail.status !== 'BANNED' && (
                <button className="btn-secondary text-red-600" onClick={() => setConfirmTarget({ user: detail, action: 'ban' })}>
                  Ban
                </button>
              )}
              {(detail.status === 'SUSPENDED' || detail.status === 'BANNED') && (
                <button className="btn-primary" onClick={() => setConfirmTarget({ user: detail, action: 'reactivate' })}>
                  Reactivate
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
