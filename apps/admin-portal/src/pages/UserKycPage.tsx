import { PageHeader, EmptyState, ErrorState, TableSkeleton, Pagination, StatusBadge, Select } from '@reviewhub/shared-ui'
import { useState } from 'react'

import { KycReviewModal } from '@/components/KycReviewModal'
import { ITEMS_PER_PAGE, KYC_DOCUMENT_TYPE_LABELS, KYC_STATUS_LABELS } from '@/constants'
import { useKycDocumentsQuery } from '@/hooks/useKyc'
import type { KycDocumentType, KycStatus } from '@/types'
import { formatDate } from '@/utils'

const STATUS_OPTIONS = Object.entries(KYC_STATUS_LABELS).map(([value, label]) => ({ value, label }))
const TYPE_OPTIONS = Object.entries(KYC_DOCUMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))

export default function UserKycPage() {
  const [page, setPage] = useState(1)
  // Reviewers come here to clear the queue, so it opens on what is waiting.
  const [status, setStatus] = useState<KycStatus | ''>('PENDING')
  const [documentType, setDocumentType] = useState<KycDocumentType | ''>('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [reviewId, setReviewId] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useKycDocumentsQuery({
    page,
    limit: ITEMS_PER_PAGE,
    status,
    documentType,
    search,
  })

  const documents = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const applySearch = () => {
    setPage(1)
    setSearch(searchInput.trim())
  }

  return (
    <div>
      <PageHeader title="KYC Reviews" subtitle="Verify the identity documents users upload before they can withdraw earnings." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="form-group flex-1 max-w-sm">
          <label className="label" htmlFor="kyc-search">Search</label>
          <input
            id="kyc-search"
            className="input"
            placeholder="Name, email, phone, or document number"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          />
        </div>
        <div className="w-44">
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            placeholder="All statuses"
            value={status}
            onChange={(e) => {
              setPage(1)
              setStatus(e.target.value as KycStatus | '')
            }}
          />
        </div>
        <div className="w-44">
          <Select
            label="Document"
            options={TYPE_OPTIONS}
            placeholder="All documents"
            value={documentType}
            onChange={(e) => {
              setPage(1)
              setDocumentType(e.target.value as KycDocumentType | '')
            }}
          />
        </div>
        <button className="btn-secondary" onClick={applySearch}>
          Apply
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : documents.length === 0 ? (
        <EmptyState
          title={status === 'PENDING' ? 'No documents waiting' : 'No documents found'}
          description={
            status === 'PENDING'
              ? 'Every uploaded document has been reviewed.'
              : 'Try adjusting your search or filters.'
          }
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">User</th>
                <th className="table-th">Document</th>
                <th className="table-th">Submitted</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.id} className="table-tr">
                  <td className="table-td">
                    <p className="font-medium text-gray-900">{doc.user.name}</p>
                    <p className="text-xs text-gray-500">{doc.user.email ?? doc.user.phone ?? '—'}</p>
                  </td>
                  <td className="table-td">
                    <p className="text-gray-900">{KYC_DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}</p>
                    <p className="font-mono text-xs text-gray-500">{doc.documentNumber ?? '—'}</p>
                  </td>
                  <td className="table-td text-gray-500">{formatDate(doc.submittedAt)}</td>
                  <td className="table-td">
                    <StatusBadge status={doc.status} label={KYC_STATUS_LABELS[doc.status]} />
                  </td>
                  <td className="table-td text-right">
                    <button className="btn-ghost btn-sm text-primary-600 hover:bg-primary-50" onClick={() => setReviewId(doc.id)}>
                      {doc.status === 'PENDING' || doc.status === 'UNDER_REVIEW' ? 'Review' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {reviewId && <KycReviewModal documentId={reviewId} onClose={() => setReviewId(null)} />}
    </div>
  )
}
