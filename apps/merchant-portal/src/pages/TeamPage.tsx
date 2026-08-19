import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/stores/auth.store'
import {
  useTeamQuery,
  useInvitationsQuery,
  useInviteMemberMutation,
  useRemoveMemberMutation,
  useUpdateMemberRoleMutation,
  useCancelInvitationMutation,
} from '@/hooks/useTeam'
import { TEAM_ROLE_LABELS } from '@/constants'
import { Input, Select, Spinner, StatusBadge, EmptyState, ErrorState, Modal, ConfirmDialog, TableSkeleton } from '@reviewhub/shared-ui'
import { formatDate, getInitials } from '@/utils'
import type { TeamMember, MerchantInvitation } from '@/types'

const roleOptions = Object.entries(TEAM_ROLE_LABELS)
  .filter(([v]) => v !== 'OWNER')
  .map(([value, label]) => ({ value, label }))

export default function TeamPage() {
  const merchantId = useAuthStore((s) => s.merchant?.id)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null)
  const [roleEditTarget, setRoleEditTarget] = useState<TeamMember | null>(null)
  const [newRole, setNewRole] = useState('')
  const [cancelTarget, setCancelTarget] = useState<MerchantInvitation | null>(null)

  const { data, isLoading, isError, refetch } = useTeamQuery(merchantId)
  const members = data?.data?.data ?? []

  const invitationsQuery = useInvitationsQuery(merchantId)

  // The endpoint returns every invitation ever sent, not just pending ones.
  const invitations = (invitationsQuery.data?.data?.data ?? []).filter((i) => i.status === 'PENDING')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ email: string; role: string }>()

  const inviteMutation = useInviteMemberMutation(merchantId, () => {
    setInviteOpen(false)
    reset()
  })

  const removeMutation = useRemoveMemberMutation(merchantId, () => setRemoveTarget(null))

  const updateRoleMutation = useUpdateMemberRoleMutation(merchantId, () => setRoleEditTarget(null))

  const cancelInvitationMutation = useCancelInvitationMutation(merchantId, () => setCancelTarget(null))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Management</h1>
          <p className="page-subtitle">Manage your team members and their roles.</p>
        </div>
        <button className="btn-primary" onClick={() => setInviteOpen(true)}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Invite Member
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : members.length === 0 ? (
        <EmptyState
          title="No team members yet"
          description="Invite your first team member to collaborate on campaigns."
          action={
            <button className="btn-primary" onClick={() => setInviteOpen(true)}>
              Invite Member
            </button>
          }
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
                <th className="table-th">Member</th>
                <th className="table-th">Role</th>
                <th className="table-th">Status</th>
                <th className="table-th">Joined</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {members.map((m) => (
                <tr key={m.id} className="table-tr">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                        {m.user.avatarUrl ? (
                          <img src={m.user.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          getInitials(m.user.firstName, m.user.lastName)
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {m.user.firstName} {m.user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{m.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td">
                    <span className="badge-blue">{TEAM_ROLE_LABELS[m.role] ?? m.role}</span>
                  </td>
                  <td className="table-td">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="table-td text-gray-500">
                    {m.joinedAt ? formatDate(m.joinedAt) : '—'}
                  </td>
                  <td className="table-td">
                    {m.role !== 'OWNER' && (
                      <div className="flex gap-2">
                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => { setRoleEditTarget(m); setNewRole(m.role) }}
                        >
                          Change Role
                        </button>
                        <button
                          className="btn-ghost btn-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setRemoveTarget(m)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!invitationsQuery.isLoading && invitations.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Pending Invitations</h2>
          <div className="table-container">
            <table className="table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">Email</th>
                  <th className="table-th">Role</th>
                  <th className="table-th">Expires</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="table-tr">
                    <td className="table-td text-gray-900">{inv.email}</td>
                    <td className="table-td">
                      <span className="badge-blue">{TEAM_ROLE_LABELS[inv.role] ?? inv.role}</span>
                    </td>
                    <td className="table-td text-gray-500">{formatDate(inv.expiresAt)}</td>
                    <td className="table-td">
                      <button
                        className="btn-ghost btn-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setCancelTarget(inv)}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite modal */}
      <Modal
        open={inviteOpen}
        onClose={() => { setInviteOpen(false); reset() }}
        title="Invite Team Member"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setInviteOpen(false); reset() }}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSubmit((d) => inviteMutation.mutate(d))}
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending && <Spinner size="sm" className="text-white" />}
              Send Invitation
            </button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Input
            label="Email address"
            type="email"
            required
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
            })}
          />
          <Select
            label="Role"
            required
            options={roleOptions}
            placeholder="Select a role"
            error={errors.role?.message}
            {...register('role', { required: 'Role is required' })}
          />
        </form>
      </Modal>

      {/* Remove confirm */}
      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget.id)}
        title="Remove Team Member"
        message={`Are you sure you want to remove ${removeTarget?.user.firstName} ${removeTarget?.user.lastName} from your team?`}
        confirmLabel="Remove"
        loading={removeMutation.isPending}
      />

      {/* Change role modal */}
      <Modal
        open={!!roleEditTarget}
        onClose={() => setRoleEditTarget(null)}
        title="Change Member Role"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setRoleEditTarget(null)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              disabled={updateRoleMutation.isPending || !newRole}
              onClick={() => roleEditTarget && updateRoleMutation.mutate({ memberId: roleEditTarget.id, role: newRole })}
            >
              {updateRoleMutation.isPending && <Spinner size="sm" className="text-white" />}
              Save
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-gray-600">
          <span className="font-medium text-gray-900">
            {roleEditTarget?.user.firstName} {roleEditTarget?.user.lastName}
          </span>
        </p>
        <Select
          label="Role"
          options={roleOptions}
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
        />
      </Modal>

      {/* Cancel invitation confirm */}
      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && cancelInvitationMutation.mutate(cancelTarget.id)}
        title="Cancel Invitation"
        message={`Cancel the pending invitation for ${cancelTarget?.email}?`}
        confirmLabel="Cancel Invitation"
        loading={cancelInvitationMutation.isPending}
      />
    </div>
  )
}
