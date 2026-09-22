import { Modal, Spinner, StatusBadge, Textarea } from '@reviewhub/shared-ui'
import { useState } from 'react'

import { KYC_DOCUMENT_TYPE_LABELS, KYC_STATUS_LABELS } from '@/constants'
import { useApproveKycMutation, useKycDocumentQuery, useKycFileUrl, useRejectKycMutation } from '@/hooks/useKyc'
import type { KycDocument } from '@/types'
import { formatDateTime } from '@/utils'

const MIN_REASON_LENGTH = 5

/** A decision can only be made while the document is still waiting for one. */
const isAwaitingDecision = (doc: KycDocument) => doc.status === 'PENDING' || doc.status === 'UNDER_REVIEW'

type Mode = 'view' | 'confirm-approve' | 'reject'

interface KycReviewModalProps {
  documentId: string
  onClose: () => void
}

/**
 * Side-by-side view of a user's uploaded identity document and the details the reviewer must compare
 * it against, with approve / reject actions. Rejection requires a reason, because the user sees it.
 */
export function KycReviewModal({ documentId, onClose }: KycReviewModalProps) {
  const [mode, setMode] = useState<Mode>('view')
  const [reason, setReason] = useState('')

  const detailQuery = useKycDocumentQuery(documentId)
  const doc = detailQuery.data?.data.data
  const file = useKycFileUrl(documentId, !!doc?.hasFile)

  const { mutate: approve, isPending: approving } = useApproveKycMutation(onClose)
  const { mutate: reject, isPending: rejecting } = useRejectKycMutation(onClose)
  const busy = approving || rejecting

  const typeLabel = doc ? (KYC_DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType) : 'document'
  const trimmedReason = reason.trim()

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={doc ? `Review ${typeLabel}` : 'Review document'}
      footer={
        doc && isAwaitingDecision(doc) ? (
          mode === 'view' ? (
            <>
              <button className="btn-secondary" onClick={onClose}>
                Close
              </button>
              <button className="btn-danger" onClick={() => setMode('reject')}>
                Reject
              </button>
              <button className="btn-primary" onClick={() => setMode('confirm-approve')}>
                Approve
              </button>
            </>
          ) : mode === 'confirm-approve' ? (
            <>
              <button className="btn-secondary" onClick={() => setMode('view')} disabled={busy}>
                Back
              </button>
              <button className="btn-primary" onClick={() => approve(doc.id)} disabled={busy}>
                {approving && <Spinner size="sm" className="text-white" />}
                Confirm approval
              </button>
            </>
          ) : (
            <>
              <button className="btn-secondary" onClick={() => setMode('view')} disabled={busy}>
                Back
              </button>
              <button
                className="btn-danger"
                onClick={() => reject({ documentId: doc.id, reason: trimmedReason })}
                disabled={trimmedReason.length < MIN_REASON_LENGTH || busy}
              >
                {rejecting && <Spinner size="sm" className="text-white" />}
                Confirm rejection
              </button>
            </>
          )
        ) : (
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        )
      }
    >
      {detailQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : detailQuery.isError || !doc ? (
        <p className="py-8 text-center text-sm text-red-600">This document could not be loaded. It may have been removed.</p>
      ) : (
        <div className="space-y-5">
          <DocumentViewer
            hasFile={doc.hasFile}
            label={typeLabel}
            url={file.url}
            mimeType={file.mimeType}
            isLoading={file.isLoading}
            isError={file.isError}
          />

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Detail label="Name" value={doc.user.name} />
            <Detail label="Status" value={<StatusBadge status={doc.status} label={KYC_STATUS_LABELS[doc.status]} />} />
            <Detail label="Email" value={doc.user.email ?? '—'} />
            <Detail label="Phone" value={doc.user.phone ?? '—'} />
            <Detail label="Document" value={typeLabel} />
            <Detail label="Document number" value={<span className="font-mono">{doc.documentNumber ?? '—'}</span>} />
            <Detail label="Submitted" value={formatDateTime(doc.submittedAt)} />
            {doc.reviewedAt && <Detail label="Reviewed" value={formatDateTime(doc.reviewedAt)} />}
            {doc.rejectionReason && (
              <div className="col-span-2">
                <Detail label="Rejection reason" value={doc.rejectionReason} />
              </div>
            )}
          </dl>

          {mode === 'confirm-approve' && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
              Approve this {typeLabel} for {doc.user.name}? Make sure the number and name match the image.
              {doc.documentType === 'PAN' && ' An approved PAN allows this user to withdraw earnings.'}
            </p>
          )}

          {mode === 'reject' && (
            <Textarea
              label="Reason for rejection"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tell the user what to fix, e.g. the image is blurry or the number does not match."
              hint="The user will see this message."
            />
          )}
        </div>
      )}
    </Modal>
  )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-gray-900">{value}</dd>
    </div>
  )
}

interface DocumentViewerProps {
  hasFile: boolean
  label: string
  url: string | null
  mimeType: string
  isLoading: boolean
  isError: boolean
}

function DocumentViewer({ hasFile, label, url, mimeType, isLoading, isError }: DocumentViewerProps) {
  const frame = 'flex min-h-[16rem] items-center justify-center rounded-xl border border-gray-200 bg-gray-50'

  if (!hasFile) {
    return <div className={`${frame} text-sm text-gray-500`}>No file was uploaded with this document.</div>
  }
  if (isLoading) {
    return (
      <div className={frame}>
        <Spinner />
      </div>
    )
  }
  if (isError || !url) {
    return <div className={`${frame} text-sm text-red-600`}>The uploaded file could not be loaded.</div>
  }
  if (mimeType === 'application/pdf') {
    return <iframe title={`Uploaded ${label}`} src={url} className="h-96 w-full rounded-xl border border-gray-200" />
  }
  return (
    <div className={frame}>
      <img src={url} alt={`Uploaded ${label}`} className="max-h-96 max-w-full rounded-lg object-contain" />
    </div>
  )
}
