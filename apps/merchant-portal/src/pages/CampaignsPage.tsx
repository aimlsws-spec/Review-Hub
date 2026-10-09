import { Input, Select, Textarea, Spinner, StatusBadge, EmptyState, ErrorState, Modal, ConfirmDialog, TableSkeleton, Pagination } from '@viralkar/shared-ui'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'

import type { CampaignFormInput } from '@/api/merchant.api'
import { CampaignBuilderModal } from '@/components/CampaignBuilderModal'
import { CampaignCoverField } from '@/components/CampaignCoverField'
import { CampaignTasksModal } from '@/components/CampaignTasksModal'
import { CampaignViewModal } from '@/components/CampaignViewModal'
import { BUDGET_SAFETY_NOTE, SubmitCampaignDialog } from '@/components/SubmitCampaignDialog'
import { WordingNotice } from '@/components/WordingNotice'
import { ITEMS_PER_PAGE, CAMPAIGN_TYPE_LABELS, CAMPAIGN_STATUS_LABELS, ENABLED_CAMPAIGN_TYPES, ROUTES } from '@/constants'
import { useCampaignCoverMutations, useCampaignsQuery, useCampaignMutations } from '@/hooks/useCampaigns'
import { useSubscriptionMutations, useSubscriptionQuery } from '@/hooks/useSubscription'
import { useWalletQuery } from '@/hooks/useWallet'
import { useWordingCheck } from '@/hooks/useWordingCheck'
import { useAuthStore } from '@/stores/auth.store'
import type { Campaign, CampaignDraft, CampaignStatus } from '@/types'
import { formatCurrency, uploadUrl } from '@/utils'
import { dateInputToIso, isoToDateInput, todayDateInput } from '@/utils/campaign-dates'

const campaignTypeOptions = ENABLED_CAMPAIGN_TYPES.map((value) => ({ value, label: CAMPAIGN_TYPE_LABELS[value] ?? value }))
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
  rewardAmount: 50,
  totalBudget: 5000,
}

export default function CampaignsPage() {
  const merchantId = useAuthStore((s) => s.merchant?.id)

  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [featureTarget, setFeatureTarget] = useState<Campaign | null>(null)
  const featuredPrice = useSubscriptionQuery().data?.data.data.featured
  const { feature } = useSubscriptionMutations()
  const [editing, setEditing] = useState<Campaign | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Campaign | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null)
  const [tasksTarget, setTasksTarget] = useState<Campaign | null>(null)
  const [viewTarget, setViewTarget] = useState<Campaign | null>(null)
  const [submitTarget, setSubmitTarget] = useState<Campaign | null>(null)
  /** A cover picture chosen in the form, uploaded once the campaign is saved. */
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const { uploadCover, removeCover } = useCampaignCoverMutations()

  const { data, isLoading, isError, refetch } = useCampaignsQuery(merchantId, {
    page,
    limit: ITEMS_PER_PAGE,
    status: status || undefined,
  })

  const campaigns = data?.data?.data?.data ?? []
  const total = data?.data?.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CampaignFormInput>({ defaultValues: emptyForm })
  const walletData = useWalletQuery(editorOpen ? merchantId : undefined).data?.data?.data
  const walletBalance = walletData ? Number(walletData.availableBalance) : undefined
  const [title, shortDescription, description, startDate] = watch(['title', 'shortDescription', 'description', 'startAt'])
  const wordingCheck = useWordingCheck(editorOpen ? merchantId : undefined, { title, shortDescription, description })

  const openCreate = () => {
    setEditing(null)
    reset(emptyForm)
    setEditorOpen(true)
  }

  /** The builder only suggests; the merchant reviews and saves the draft in the normal form. */
  const useBuilderDraft = (draft: CampaignDraft) => {
    setBuilderOpen(false)
    setEditing(null)
    reset({
      ...emptyForm,
      title: draft.title,
      shortDescription: draft.shortDescription,
      description: draft.description,
      campaignType: draft.campaignType,
      rewardAmount: draft.rewardAmount,
      totalBudget: draft.totalBudget,
      maxParticipants: draft.maxParticipants,
      minimumFollowers: draft.minimumFollowers,
      startAt: isoToDateInput(draft.startAt),
      endAt: isoToDateInput(draft.endAt),
    })
    setEditorOpen(true)
  }

  const openEdit = (campaign: Campaign) => {
    setEditing(campaign)
    reset({
      title: campaign.title,
      shortDescription: campaign.shortDescription ?? '',
      description: campaign.description,
      campaignType: campaign.campaignType,
      rewardAmount: Number(campaign.rewardAmount),
      totalBudget: Number(campaign.totalBudget),
      maxParticipants: campaign.maxParticipants ?? undefined,
      startAt: isoToDateInput(campaign.startAt),
      endAt: isoToDateInput(campaign.endAt),
    })
    setEditorOpen(true)
  }

  /**
   * The form holds plain dates; the API takes moments. A start date means the start of that day and an end date the
   * end of it, in the merchant's time. An emptied date is sent as null on an edit, so it is cleared, not kept.
   */
  const submitCampaign = handleSubmit((form) => {
    const date = (value: string | null | undefined, edge: 'start' | 'end') =>
      value ? dateInputToIso(value, edge) : editing ? null : undefined
    // An empty number box reads as NaN, which would reach the API as null. Left out, it keeps the default. Only the
    // participant cap can be cleared on an edit (no cap); the edit form does not load the targeting fields at all.
    const number = (value: number | null | undefined) => (typeof value === 'number' && !Number.isNaN(value) ? value : undefined)
    // The type of campaign is set when it is created; an edit may not send it (the API refuses fields it does not
    // take). There is no reward type to send: every reward is paid as money into the user's wallet.
    const { campaignType, ...editable } = form
    // The cover needs the campaign's id, which a new campaign only has once it is saved, so it is uploaded after.
    const cover = coverFile
    const editingId = editing?.id
    saveMutation.mutate(
      {
        ...(editing ? editable : { ...editable, campaignType }),
        startAt: date(form.startAt, 'start'),
        endAt: date(form.endAt, 'end'),
        maxParticipants: number(form.maxParticipants) ?? (editing ? null : undefined),
        minimumAge: number(form.minimumAge),
        maximumAge: number(form.maximumAge),
        minimumFollowers: number(form.minimumFollowers),
      },
      {
        onSuccess: (response) => {
          const campaignId = editingId ?? response.data.data.id
          if (cover && campaignId) uploadCover.mutate({ campaignId, file: cover })
        },
      },
    )
  })

  const closeEditor = () => {
    setEditorOpen(false)
    setEditing(null)
    setCoverFile(null)
  }

  const { saveMutation, actionMutation, deleteMutation, duplicateMutation } = useCampaignMutations(merchantId, {
    editingId: editing?.id,
    onSaveSuccess: closeEditor,
    onActionSuccess: () => {
      setCancelTarget(null)
      setSubmitTarget(null)
    },
    onDeleteSuccess: () => setDeleteTarget(null),
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-subtitle">Create and manage your reward campaigns.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setBuilderOpen(true)}>
            Help me plan a campaign
          </button>
          <button className="btn-primary" onClick={openCreate}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Campaign
          </button>
        </div>
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
                    <div className="flex items-center gap-3">
                      {campaign.thumbnailUrl && (
                        <img src={uploadUrl(campaign.thumbnailUrl)} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{campaign.title}</p>
                        <p className="text-xs text-gray-400">
                          {CAMPAIGN_TYPE_LABELS[campaign.campaignType] ?? campaign.campaignType}
                          {campaign.startAt && ` · Starts ${formatShortDate(campaign.startAt)}`}
                          {campaign.endAt && ` · Ends ${formatShortDate(campaign.endAt)}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td">
                    {formatCurrency(campaign.rewardAmount)}
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
                      <button className="btn-ghost btn-sm" onClick={() => setViewTarget(campaign)}>View</button>
                      <button className="btn-ghost btn-sm" onClick={() => setTasksTarget(campaign)}>Tasks</button>
                      {!EDITABLE_STATUSES.includes(campaign.status) && (
                        <Link className="btn-ghost btn-sm" to={`${ROUTES.SUBMISSIONS}?campaignId=${campaign.id}`}>
                          Submissions
                        </Link>
                      )}
                      {EDITABLE_STATUSES.includes(campaign.status) && (
                        <button className="btn-ghost btn-sm" onClick={() => openEdit(campaign)}>Edit</button>
                      )}
                      {EDITABLE_STATUSES.includes(campaign.status) && (
                        <button
                          className="btn-ghost btn-sm text-primary-700 hover:bg-primary-50"
                          onClick={() => setSubmitTarget(campaign)}
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
                      {campaign.status === 'ACTIVE' && (
                        <button
                          className="btn-ghost btn-sm text-amber-700 hover:bg-amber-50"
                          title={campaign.featured && campaign.featuredUntil ? `Featured until ${new Date(campaign.featuredUntil).toLocaleDateString('en-IN')}` : undefined}
                          onClick={() => setFeatureTarget(campaign)}
                        >
                          {campaign.featured ? 'Extend feature' : 'Feature'}
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
                      <button
                        className="btn-ghost btn-sm"
                        title="Copy this campaign into a new draft"
                        disabled={duplicateMutation.isPending}
                        onClick={() => duplicateMutation.mutate(campaign.id)}
                      >
                        Duplicate
                      </button>
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

      {tasksTarget && <CampaignTasksModal campaign={tasksTarget} onClose={() => setTasksTarget(null)} />}

      {submitTarget && (
        <SubmitCampaignDialog
          campaign={submitTarget}
          submitting={actionMutation.isPending}
          onSubmit={() => actionMutation.mutate({ id: submitTarget.id, action: 'submit' })}
          onClose={() => setSubmitTarget(null)}
        />
      )}

      {viewTarget && (
        <CampaignViewModal
          campaign={viewTarget}
          onClose={() => setViewTarget(null)}
          onEdit={() => {
            setViewTarget(null)
            openEdit(viewTarget)
          }}
          onEditTasks={() => {
            setViewTarget(null)
            setTasksTarget(viewTarget)
          }}
        />
      )}

      {builderOpen && (
        <CampaignBuilderModal merchantId={merchantId} onClose={() => setBuilderOpen(false)} onUseDraft={useBuilderDraft} />
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
              <button className="btn-primary" onClick={submitCampaign} disabled={saveMutation.isPending}>
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
            <WordingNotice check={wordingCheck} />
            <CampaignCoverField
              savedPath={editing?.thumbnailUrl ?? null}
              file={coverFile}
              onChange={setCoverFile}
              removing={removeCover.isPending}
              onRemoveSaved={
                editing
                  ? () => removeCover.mutate(editing.id, { onSuccess: () => setEditing({ ...editing, thumbnailUrl: null }) })
                  : undefined
              }
            />
            <Select
              label="Campaign type"
              required
              options={campaignTypeOptions}
              disabled={!!editing}
              error={errors.campaignType?.message}
              {...register('campaignType', { required: true })}
            />
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
                hint={walletBalance === undefined ? undefined : `Your wallet: ${formatCurrency(walletBalance)} available`}
                {...register('totalBudget', { required: 'Required', valueAsNumber: true, min: { value: 1, message: 'Must be at least ₹1' } })}
              />
            </div>
            
            <p className="text-xs text-gray-500">
              You can save a draft with any budget. To submit it for review, your wallet needs to hold the full budget.{' '}
              {BUDGET_SAFETY_NOTE}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start date"
                type="date"
                hint="Leave blank to start as soon as it is activated"
                error={errors.startAt?.message}
                {...register('startAt')}
              />
              <Input
                label="End date"
                type="date"
                min={startDate || todayDateInput()}
                hint="Leave blank to run until the budget is used up"
                error={errors.endAt?.message}
                {...register('endAt', {
                  validate: (end, form) => {
                    if (!end) return true
                    if (end < todayDateInput()) return 'The end date can not be in the past'
                    if (form.startAt && end < form.startAt) return 'The end date must be on or after the start date'
                    return true
                  },
                })}
              />
            </div>

            <div className="pt-4 mt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Audience Targeting (Optional)</h4>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Minimum Age"
                  type="number"
                  hint="Leave blank for any"
                  {...register('minimumAge', { valueAsNumber: true })}
                />
                <Input
                  label="Maximum Age"
                  type="number"
                  hint="Leave blank for any"
                  {...register('maximumAge', { valueAsNumber: true })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Select
                  label="Target Gender"
                  options={[
                    { value: 'ALL', label: 'All Genders' },
                    { value: 'MALE', label: 'Male Only' },
                    { value: 'FEMALE', label: 'Female Only' },
                  ]}
                  {...register('targetGender')}
                />
                <Input
                  label="Min. Social Followers"
                  type="number"
                  hint="For influencer tasks"
                  {...register('minimumFollowers', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-gray-100">
              <Input
                label="Max participants"
                type="number"
                hint="Leave blank for unlimited"
                {...register('maxParticipants', { valueAsNumber: true })}
              />
            </div>
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
        open={!!featureTarget}
        onClose={() => setFeatureTarget(null)}
        onConfirm={() => featureTarget && feature.mutate(featureTarget.id, { onSuccess: () => setFeatureTarget(null) })}
        title="Feature campaign"
        message={
          featuredPrice
            ? `Show "${featureTarget?.title}" at the top of the listings for ${featuredPrice.days} days. If your plan has a featured slot free it is included; otherwise ${formatCurrency(featuredPrice.priceWithGst)} (GST included) is taken from your wallet.`
            : `Show "${featureTarget?.title}" at the top of the listings.`
        }
        confirmLabel="Feature"
        loading={feature.isPending}
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

/** "12 Oct 2026", for the dates under a campaign's title. */
function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
