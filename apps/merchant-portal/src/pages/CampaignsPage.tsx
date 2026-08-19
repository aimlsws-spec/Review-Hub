import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { CampaignFormInput } from '@/api/merchant.api'
import { useAuthStore } from '@/stores/auth.store'
import { useCampaignsQuery, useCampaignMutations } from '@/hooks/useCampaigns'
import { ITEMS_PER_PAGE, CAMPAIGN_TYPE_LABELS, CAMPAIGN_STATUS_LABELS, REWARD_TYPE_LABELS } from '@/constants'
import { Input, Select, Textarea, Spinner, StatusBadge, EmptyState, ErrorState, Modal, ConfirmDialog, TableSkeleton, Pagination } from '@reviewhub/shared-ui'
import { formatCurrency } from '@/utils'
import type { Campaign, CampaignStatus } from '@/types'

const campaignTypeOptions = Object.entries(CAMPAIGN_TYPE_LABELS).map(([value, label]) => ({ value, label }))
const rewardTypeOptions = Object.entries(REWARD_TYPE_LABELS).map(([value, label]) => ({ value, label }))
const statusFilterOptions = Object.entries(CAMPAIGN_STATUS_LABELS).map(([value, label]) => ({ value, label }))

const EDITABLE_STATUSES: CampaignStatus[] = ['DRAFT', 'CHANGES_REQUESTED']
const CANCELLABLE_STATUSES: CampaignStatus[] = ['DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'SCHEDULED', 'ACTIVE', 'PAUSED']
const DELETABLE_STATUSES: CampaignStatus[] = ['DRAFT', 'CANCELLED', 'REJECTED']

const emptyForm: CampaignFormInput = {
  title: '',
  shortDescription: '',
  description: '',
  campaignType: 'REVIEW',
  visibility: 'PUBLIC',
  rewardType: 'CASH',
  rewardAmount: 50,
  totalBudget: 5000,
}

export default function CampaignsPage() {
  const merchantId = useAuthStore((s) => s.merchant?.id)

  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Campaign | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Campaign | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null)

  const { data, isLoading, isError, refetch } = useCampaignsQuery(merchantId, {
    page,
    limit: ITEMS_PER_PAGE,
    status: status || undefined,
  })

  const campaigns = data?.data?.data?.data ?? []
  const total = data?.data?.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CampaignFormInput>({ defaultValues: emptyForm })

  const openCreate = () => {
    setEditing(null)
    reset(emptyForm)
    setEditorOpen(true)
  }

  const openEdit = (campaign: Campaign) => {
    setEditing(campaign)
    reset({
      title: campaign.title,
      shortDescription: campaign.shortDescription ?? '',
      description: campaign.description,
      campaignType: campaign.campaignType,
      rewardType: campaign.rewardType,
      rewardAmount: Number(campaign.rewardAmount),
      totalBudget: Number(campaign.totalBudget),
      maxParticipants: campaign.maxParticipants ?? undefined,
    })
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditing(null)
  }

  const { saveMutation, actionMutation, deleteMutation } = useCampaignMutations(merchantId, {
    editingId: editing?.id,
    onSaveSuccess: closeEditor,
    onActionSuccess: () => setCancelTarget(null),
    onDeleteSuccess: () => setDeleteTarget(null),
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-subtitle">Create and manage your reward campaigns.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Campaign
        </button>
      </div>

      <div className="mb-4 w-48">
        <Select
          options={statusFilterOptions}
          placeholder="All statuses"
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value)
          }}
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description="Create your first campaign to start collecting reviews and rewarding participants."
          action={<button className="btn-primary" onClick={openCreate}>New Campaign</button>}
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Campaign</th>
                <th className="table-th">Reward</th>
                <th className="table-th">Budget</th>
                <th className="table-th">Participants</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="table-tr">
                  <td className="table-td">
                    <p className="font-medium text-gray-900">{campaign.title}</p>
                    <p className="text-xs text-gray-400">{CAMPAIGN_TYPE_LABELS[campaign.campaignType] ?? campaign.campaignType}</p>
                  </td>
                  <td className="table-td">
                    {formatCurrency(campaign.rewardAmount)} <span className="text-gray-400">({REWARD_TYPE_LABELS[campaign.rewardType] ?? campaign.rewardType})</span>
                  </td>
                  <td className="table-td">
                    {formatCurrency(campaign.spentBudget)} <span className="text-gray-400">/ {formatCurrency(campaign.totalBudget)}</span>
                  </td>
                  <td className="table-td text-gray-500">
                    {campaign.currentParticipants}{campaign.maxParticipants ? ` / ${campaign.maxParticipants}` : ''}
                  </td>
                  <td className="table-td"><StatusBadge status={campaign.status} /></td>
                  <td className="table-td text-right">
                    <div className="flex justify-end gap-1.5">
                      {EDITABLE_STATUSES.includes(campaign.status) && (
                        <button className="btn-ghost btn-sm" onClick={() => openEdit(campaign)}>Edit</button>
                      )}
                      {EDITABLE_STATUSES.includes(campaign.status) && (
                        <button
                          className="btn-ghost btn-sm text-primary-700 hover:bg-primary-50"
                          onClick={() => actionMutation.mutate({ id: campaign.id, action: 'submit' })}
                        >
                          Submit
                        </button>
                      )}
                      {(campaign.status === 'APPROVED' || campaign.status === 'SCHEDULED') && (
                        <button
                          className="btn-ghost btn-sm text-green-700 hover:bg-green-50"
                          onClick={() => actionMutation.mutate({ id: campaign.id, action: 'activate' })}
                        >
                          Activate
                        </button>
                      )}
                      {campaign.status === 'ACTIVE' && (
                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => actionMutation.mutate({ id: campaign.id, action: 'pause' })}
                        >
                          Pause
                        </button>
                      )}
                      {campaign.status === 'PAUSED' && (
                        <button
                          className="btn-ghost btn-sm text-green-700 hover:bg-green-50"
                          onClick={() => actionMutation.mutate({ id: campaign.id, action: 'resume' })}
                        >
                          Resume
                        </button>
                      )}
                      {CANCELLABLE_STATUSES.includes(campaign.status) && (
                        <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => setCancelTarget(campaign)}>
                          Cancel
                        </button>
                      )}
                      {DELETABLE_STATUSES.includes(campaign.status) && (
                        <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(campaign)}>
                          Delete
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

      {editorOpen && (
        <Modal
          open
          onClose={closeEditor}
          title={editing ? 'Edit campaign' : 'New campaign'}
          size="xl"
          footer={
            <>
              <button className="btn-secondary" onClick={closeEditor} disabled={saveMutation.isPending}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmit((d) => saveMutation.mutate(d))} disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Spinner size="sm" className="text-white" />}
                {editing ? 'Save changes' : 'Create draft'}
              </button>
            </>
          }
        >
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <Input
              label="Title"
              required
              error={errors.title?.message}
              {...register('title', { required: 'Title is required', minLength: { value: 5, message: 'At least 5 characters' } })}
            />
            <Input
              label="Short description"
              hint="Shown in campaign listings"
              error={errors.shortDescription?.message}
              {...register('shortDescription')}
            />
            <Textarea
              label="Full description"
              required
              rows={4}
              error={errors.description?.message}
              {...register('description', { required: 'Description is required', minLength: { value: 20, message: 'At least 20 characters' } })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Campaign type"
                required
                options={campaignTypeOptions}
                disabled={!!editing}
                error={errors.campaignType?.message}
                {...register('campaignType', { required: true })}
              />
              <Select
                label="Reward type"
                options={rewardTypeOptions}
                {...register('rewardType')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Reward per participant (₹)"
                type="number"
                required
                error={errors.rewardAmount?.message}
                {...register('rewardAmount', { required: 'Required', valueAsNumber: true, min: { value: 1, message: 'Must be at least ₹1' } })}
              />
              <Input
                label="Total budget (₹)"
                type="number"
                required
                error={errors.totalBudget?.message}
                {...register('totalBudget', { required: 'Required', valueAsNumber: true, min: { value: 1, message: 'Must be at least ₹1' } })}
              />
            </div>
            <Input
              label="Max participants"
              type="number"
              hint="Leave blank for unlimited"
              {...register('maxParticipants', { valueAsNumber: true })}
            />
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && actionMutation.mutate({ id: cancelTarget.id, action: 'cancel' })}
        title="Cancel campaign"
        message={`Cancel "${cancelTarget?.title}"? This cannot be undone and any remaining budget will no longer be spent.`}
        confirmLabel="Cancel campaign"
        loading={actionMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete campaign"
        message={`Permanently delete "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />

      {!merchantId && (
        <p className="mt-4 text-center text-xs text-gray-400">
          Loading your merchant profile…
        </p>
      )}
    </div>
  )
}
