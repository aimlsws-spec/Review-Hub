import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/stores/auth.store'
import {
  useDocumentsQuery,
  useBankAccountsQuery,
  useUploadDocumentMutation,
  useAddBankAccountMutation,
  useRemoveBankAccountMutation,
  useSetPrimaryBankAccountMutation,
} from '@/hooks/useDocuments'
import { DOCUMENT_TYPE_LABELS } from '@/constants'
import { Input, Select, Spinner, StatusBadge, EmptyState, ErrorState, Modal, ConfirmDialog } from '@reviewhub/shared-ui'
import { formatDate } from '@/utils'
import type { MerchantBankAccount } from '@/types'

const documentTypeOptions = Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))

interface UploadForm {
  documentType: string
  documentNumber: string
}

interface BankForm {
  bankName: string
  accountHolderName: string
  accountNumber: string
  ifscCode: string
  branch: string
  upiId: string
}

export default function DocumentsPage() {
  const merchantId = useAuthStore((s) => s.merchant?.id)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [bankOpen, setBankOpen] = useState(false)
  const [removeBank, setRemoveBank] = useState<MerchantBankAccount | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const { data: docsData, isLoading: docsLoading, isError: docsError, refetch: refetchDocs } = useDocumentsQuery(merchantId)
  const { data: banksData, isLoading: banksLoading } = useBankAccountsQuery(merchantId)

  const documents = docsData?.data?.data ?? []
  const banks = banksData?.data?.data ?? []

  const { register: regDoc, handleSubmit: handleDoc, reset: resetDoc, formState: { errors: docErrors } } = useForm<UploadForm>()
  const { register: regBank, handleSubmit: handleBank, reset: resetBank, formState: { errors: bankErrors } } = useForm<BankForm>()

  const uploadMutation = useUploadDocumentMutation(merchantId, selectedFile, () => {
    setUploadOpen(false)
    resetDoc()
    setSelectedFile(null)
  })

  const addBankMutation = useAddBankAccountMutation(merchantId, () => {
    setBankOpen(false)
    resetBank()
  })

  const removeBankMutation = useRemoveBankAccountMutation(merchantId, () => setRemoveBank(null))

  const setPrimaryMutation = useSetPrimaryBankAccountMutation(merchantId)

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">Upload KYC documents and manage bank accounts.</p>
        </div>
      </div>

      {/* KYC Documents */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="section-title">KYC Documents</h2>
            <p className="section-subtitle">Upload required verification documents.</p>
          </div>
          <button className="btn-primary btn-sm" onClick={() => setUploadOpen(true)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Document
          </button>
        </div>

        {docsLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-4 space-y-2">
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : docsError ? (
          <ErrorState onRetry={() => refetchDocs()} />
        ) : documents.length === 0 ? (
          <EmptyState
            title="No documents uploaded"
            description="Upload your KYC documents to get verified."
            action={
              <button className="btn-primary" onClick={() => setUploadOpen(true)}>
                Upload Document
              </button>
            }
            icon={
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <div key={doc.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                    </p>
                    {doc.documentNumber && (
                      <p className="text-xs text-gray-500 mt-0.5">{doc.documentNumber}</p>
                    )}
                  </div>
                  <StatusBadge status={doc.verificationStatus} />
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Uploaded {formatDate(doc.createdAt)}
                </p>
                {doc.rejectionReason && (
                  <p className="mt-2 text-xs text-red-600 bg-red-50 rounded p-2">
                    {doc.rejectionReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bank Accounts */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="section-title">Bank Accounts</h2>
            <p className="section-subtitle">Manage your linked bank accounts.</p>
          </div>
          <button className="btn-primary btn-sm" onClick={() => setBankOpen(true)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Bank Account
          </button>
        </div>

        {banksLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="card p-4 space-y-2">
                <div className="skeleton h-4 w-1/3" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : banks.length === 0 ? (
          <EmptyState
            title="No bank accounts"
            description="Add a bank account to receive payments."
            action={
              <button className="btn-primary" onClick={() => setBankOpen(true)}>
                Add Bank Account
              </button>
            }
            icon={
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            }
          />
        ) : (
          <div className="space-y-3">
            {banks.map((bank) => (
              <div key={bank.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                      <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{bank.bankName}</p>
                        {bank.isPrimary && <span className="badge-green">Primary</span>}
                        <StatusBadge status={bank.verificationStatus} />
                      </div>
                      <p className="text-xs text-gray-500">
                        {bank.accountHolderName} · ••••{bank.accountNumber.slice(-4)} · {bank.ifscCode}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!bank.isPrimary && (
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => setPrimaryMutation.mutate(bank.id)}
                        disabled={setPrimaryMutation.isPending}
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                      onClick={() => setRemoveBank(bank)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upload Document Modal */}
      <Modal
        open={uploadOpen}
        onClose={() => { setUploadOpen(false); resetDoc(); setSelectedFile(null) }}
        title="Upload Document"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setUploadOpen(false); resetDoc(); setSelectedFile(null) }}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleDoc((d) => uploadMutation.mutate(d))}
              disabled={uploadMutation.isPending || !selectedFile}
            >
              {uploadMutation.isPending && <Spinner size="sm" className="text-white" />}
              Upload
            </button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Select
            label="Document type"
            required
            options={documentTypeOptions}
            placeholder="Select document type"
            error={docErrors.documentType?.message}
            {...regDoc('documentType', { required: 'Document type is required' })}
          />
          <Input
            label="Document number"
            hint="Optional — e.g. PAN number, GST number"
            {...regDoc('documentNumber')}
          />
          <div className="form-group">
            <label className="label">
              File <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-primary-400 hover:bg-primary-50 transition-colors"
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
              aria-label="Click to select file"
            >
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                {selectedFile ? selectedFile.name : 'Click to select file'}
              </p>
              <p className="text-xs text-gray-400">PDF, JPG, PNG up to 10MB</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </form>
      </Modal>

      {/* Add Bank Modal */}
      <Modal
        open={bankOpen}
        onClose={() => { setBankOpen(false); resetBank() }}
        title="Add Bank Account"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setBankOpen(false); resetBank() }}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleBank((d) => addBankMutation.mutate(d))}
              disabled={addBankMutation.isPending}
            >
              {addBankMutation.isPending && <Spinner size="sm" className="text-white" />}
              Add Account
            </button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Bank name"
              required
              error={bankErrors.bankName?.message}
              {...regBank('bankName', { required: 'Required' })}
            />
            <Input
              label="Account holder name"
              required
              error={bankErrors.accountHolderName?.message}
              {...regBank('accountHolderName', { required: 'Required' })}
            />
            <Input
              label="Account number"
              required
              error={bankErrors.accountNumber?.message}
              {...regBank('accountNumber', { required: 'Required' })}
            />
            <Input
              label="IFSC code"
              required
              error={bankErrors.ifscCode?.message}
              {...regBank('ifscCode', { required: 'Required' })}
            />
            <Input label="Branch" {...regBank('branch')} />
            <Input label="UPI ID" hint="Optional" {...regBank('upiId')} />
          </div>
        </form>
      </Modal>

      {/* Remove bank confirm */}
      <ConfirmDialog
        open={!!removeBank}
        onClose={() => setRemoveBank(null)}
        onConfirm={() => removeBank && removeBankMutation.mutate(removeBank.id)}
        title="Remove Bank Account"
        message={`Remove ${removeBank?.bankName} account ending in ${removeBank?.accountNumber.slice(-4)}?`}
        confirmLabel="Remove"
        loading={removeBankMutation.isPending}
      />
    </div>
  )
}
