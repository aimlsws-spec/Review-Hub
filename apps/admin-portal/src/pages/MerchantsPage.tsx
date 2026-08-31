import {
  PageHeader,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Skeleton,
  Pagination,
  Modal,
  StatusBadge,
  Input,
  Select,
  Textarea,
  Spinner,
} from '@reviewhub/shared-ui'
import { useState } from 'react'

import { ITEMS_PER_PAGE } from '@/constants'
import {
  useAllMerchantsQuery,
  useMerchantDetailQuery,
  useMerchantReviewMutation,
  usePendingMerchantsQuery,
  useViewMerchantDocumentMutation,
} from '@/hooks/useMerchants'
import type { Merchant, MerchantDetail } from '@/types'
import { cn, formatDate } from '@/utils'

type Tab = 'pending' | 'all'
type ReviewKind = 'approve' | 'reject' | 'request-documents'

const REVIEW_COPY: Record<ReviewKind, { title: string; label: string; required: boolean; placeholder: string }> = {
  approve: { title: 'Approve merchant', label: '', required: false, placeholder: '' },
  reject: { title: 'Reject merchant', label: 'Reason for rejection', required: true, placeholder: 'Explain why this merchant is being rejected...' },
  'request-documents': { title: 'Request additional documents', label: 'Message to merchant (optional)', required: false, placeholder: 'Please upload a clearer copy of your PAN card...' },
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING_VERIFICATION', label: 'Pending Verification' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'DEACTIVATED', label: 'Deactivated' },
]

function DocumentRow({ merchantId, doc }: { merchantId: string; doc: MerchantDetail['documents'][number] }) {
  const { mutate: viewDocument, isPending } = useViewMerchantDocumentMutation()

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3.5 py-2.5">
      <div>
        <p className="text-sm font-medium text-gray-900">{doc.documentType.replace(/_/g, ' ')}</p>
        {doc.documentNumber && <p className="text-xs text-gray-400">{doc.documentNumber}</p>}
        {doc.rejectionReason && <p className="mt-0.5 text-xs text-red-600">{doc.rejectionReason}</p>}
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={doc.verificationStatus} />
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => viewDocument({ merchantId, documentId: doc.id })}
          disabled={isPending}
        >
          {isPending ? <Spinner size="sm" /> : 'View'}
        </button>
      </div>
    </div>
  )
}

export default function MerchantsPage() {
  const [tab, setTab] = useState<Tab>('pending')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reviewTarget, setReviewTarget] = useState<{ merchant: Merchant; kind: ReviewKind } | null>(null)
  const [note, setNote] = useState('')

  const pendingQuery = usePendingMerchantsQuery(tab === 'pending')

  const allQuery = useAllMerchantsQuery({ page, limit: ITEMS_PER_PAGE, status, search }, tab === 'all')

  const detailQuery = useMerchantDetailQuery(selectedId)

  const pending = pendingQuery.data?.data.data ?? []
  const allMerchants = allQuery.data?.data.data.data ?? []
  const allTotal = allQuery.data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(allTotal / ITEMS_PER_PAGE))
  const merchants = tab === 'pending' ? pending : allMerchants
  const isLoading = tab === 'pending' ? pendingQuery.isLoading : allQuery.isLoading
  const isError = tab === 'pending' ? pendingQuery.isError : allQuery.isError
  const refetch = tab === 'pending' ? pendingQuery.refetch : allQuery.refetch

  const detail = detailQuery.data?.data.data

  const { mutate: submitReview, isPending: reviewSubmitting } = useMerchantReviewMutation(() => {
    setReviewTarget(null)
    setNote('')
  })

  function openReview(merchant: Merchant, kind: ReviewKind) {
    setNote('')
    setReviewTarget({ merchant, kind })
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const copy = reviewTarget ? REVIEW_COPY[reviewTarget.kind] : null
  const canSubmit = reviewTarget ? (!copy!.required || note.trim().length >= 5) : false

  return (
    <div>
      <PageHeader title="Merchants" subtitle="Review merchant sign-ups, verify KYC documents, and manage merchant accounts." />

      <div className="mb-4 flex gap-1 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px', tab === 'pending' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700')}
        >
          Pending Verification
        </button>
        <button
          type="button"
          onClick={() => setTab('all')}
          className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px', tab === 'all' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700')}
        >
          All Merchants
        </button>
      </div>

      {tab === 'all' && (
        <form onSubmit={handleSearchSubmit} className="mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Input
              label="Search"
              placeholder="Business name, email, or phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="min-w-[200px]">
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1) }}
            />
          </div>
          <button type="submit" className="btn-secondary mb-1">Search</button>
        </form>
      )}

      {isLoading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : merchants.length === 0 ? (
        <EmptyState
          title={tab === 'pending' ? 'Nothing to review' : 'No merchants found'}
          description={tab === 'pending' ? 'No merchants are currently awaiting verification.' : 'Try adjusting your search or filters.'}
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          }
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Business</th>
                <th className="table-th">Contact</th>
                <th className="table-th">Verification</th>
                <th className="table-th">Status</th>
                {tab === 'pending' && <th className="table-th text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {merchants.map((merchant) => (
                <tr key={merchant.id} className="table-tr cursor-pointer" onClick={() => setSelectedId(merchant.id)}>
                  <td className="table-td">
                    <p className="font-medium text-gray-900">{merchant.businessName}</p>
                    <p className="text-xs text-gray-400">{formatDate(merchant.createdAt)}</p>
                  </td>
                  <td className="table-td text-gray-600">
                    <p>{merchant.email}</p>
                    <p className="text-xs text-gray-400">{merchant.phone}</p>
                  </td>
                  <td className="table-td"><StatusBadge status={merchant.verificationStatus} /></td>
                  <td className="table-td"><StatusBadge status={merchant.status} /></td>
                  {tab === 'pending' && (
                    <td className="table-td text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <button className="btn-ghost btn-sm text-green-700 hover:bg-green-50" onClick={() => openReview(merchant, 'approve')}>
                          Approve
                        </button>
                        <button className="btn-ghost btn-sm" onClick={() => openReview(merchant, 'request-documents')}>
                          Request Docs
                        </button>
                        <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => openReview(merchant, 'reject')}>
                          Reject
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {tab === 'all' && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
        </div>
      )}

      {/* Review modal (approve / reject / request documents) */}
      {reviewTarget && copy && (
        <Modal
          open
          onClose={() => setReviewTarget(null)}
          title={copy.title}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setReviewTarget(null)} disabled={reviewSubmitting}>
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={!canSubmit || reviewSubmitting}
                onClick={() => submitReview({ merchant: reviewTarget.merchant, kind: reviewTarget.kind, note })}
              >
                {reviewSubmitting && <Spinner size="sm" className="text-white" />}
                Confirm
              </button>
            </>
          }
        >
          <p className="mb-3 text-sm text-gray-600">
            <span className="font-medium text-gray-900">{reviewTarget.merchant.businessName}</span>
          </p>
          {copy.label && (
            <Textarea label={copy.label} rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder={copy.placeholder} />
          )}
        </Modal>
      )}

      {/* Merchant detail drawer/modal */}
      <Modal open={!!selectedId} onClose={() => setSelectedId(null)} title="Merchant Details" size="xl">
        {detailQuery.isLoading || !detail ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-base font-semibold text-gray-900">{detail.businessName}</p>
                {detail.legalBusinessName && <p className="text-sm text-gray-500">{detail.legalBusinessName}</p>}
              </div>
              <div className="flex gap-2">
                <StatusBadge status={detail.verificationStatus} />
                <StatusBadge status={detail.status} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><span className="text-gray-400">Email</span><p className="text-gray-900">{detail.email}</p></div>
              <div><span className="text-gray-400">Phone</span><p className="text-gray-900">{detail.phone}</p></div>
              <div><span className="text-gray-400">Business Type</span><p className="text-gray-900">{detail.businessType ?? '—'}</p></div>
              <div><span className="text-gray-400">Category</span><p className="text-gray-900">{detail.businessCategory ?? '—'}</p></div>
              <div><span className="text-gray-400">GST Number</span><p className="text-gray-900 font-mono text-xs">{detail.gstNumber ?? '—'}</p></div>
              <div><span className="text-gray-400">PAN Number</span><p className="text-gray-900 font-mono text-xs">{detail.panNumber ?? '—'}</p></div>
            </div>

            {detail.description && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Description</p>
                <p className="text-sm text-gray-700">{detail.description}</p>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">KYC Documents</p>
              {detail.documents.length === 0 ? (
                <p className="text-sm text-gray-400">No documents uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {detail.documents.map((doc) => (
                    <DocumentRow key={doc.id} merchantId={detail.id} doc={doc} />
                  ))}
                </div>
              )}
            </div>

            {detail.verificationStatus !== 'APPROVED' && (
              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button className="btn-secondary" onClick={() => openReview(detail, 'request-documents')}>Request Docs</button>
                <button className="btn-secondary text-red-600" onClick={() => openReview(detail, 'reject')}>Reject</button>
                <button className="btn-primary" onClick={() => openReview(detail, 'approve')}>Approve</button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
