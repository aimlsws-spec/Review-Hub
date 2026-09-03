import { StatusBadge, EmptyState, ErrorState, TableSkeleton, Pagination, Modal, Input, Select, Textarea, Spinner } from '@reviewhub/shared-ui'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { ITEMS_PER_PAGE, ROUTES } from '@/constants'
import { useBankAccountsQuery } from '@/hooks/useDocuments'
import { useCreateRefundMutation, useRefundsQuery } from '@/hooks/useRefunds'
import { useWalletQuery } from '@/hooks/useWallet'
import { useAuthStore } from '@/stores/auth.store'
import { formatCurrency, formatDateTime } from '@/utils'

interface RefundFormValues {
  amount: number
  bankAccountId: string
  reason?: string
}

export default function RefundsPage() {
  const merchantId = useAuthStore((s) => s.merchant?.id)
  const [page, setPage] = useState(1)
  const [requestOpen, setRequestOpen] = useState(false)

  const { data: walletData } = useWalletQuery(merchantId)
  const { data: banksData } = useBankAccountsQuery(merchantId)
  const { data: refundsData, isLoading, isError, refetch } = useRefundsQuery(merchantId, page, ITEMS_PER_PAGE)

  const wallet = walletData?.data?.data
  const banks = banksData?.data?.data ?? []
  const refunds = refundsData?.data?.data?.data ?? []
  const total = refundsData?.data?.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const availableBalance = Number(wallet?.availableBalance ?? 0)
  const verifiedBanks = banks.filter((b) => b.verificationStatus !== 'FAILED')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RefundFormValues>()

  const createRefundMutation = useCreateRefundMutation(merchantId, () => {
    setRequestOpen(false)
    reset()
  })

  const onSubmitRefund = (values: RefundFormValues) => {
    createRefundMutation.mutate({
      amount: Number(values.amount),
      bankAccountId: values.bankAccountId,
      reason: values.reason || undefined,
    })
  }

  if (!merchantId) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Refunds</h1>
            <p className="page-subtitle">Cash out your wallet balance to your bank account.</p>
          </div>
        </div>
        <EmptyState
          title="Set up your business profile first"
          description="Refunds are tied to your merchant wallet — create your profile to get started."
          action={<Link to={ROUTES.PROFILE} className="btn-primary btn-sm">Set up profile</Link>}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Refunds</h1>
          <p className="page-subtitle">Cash out your wallet balance to your bank account.</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            reset()
            setRequestOpen(true)
          }}
        >
          Request Refund
        </button>
      </div>

      <Modal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Request Refund"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setRequestOpen(false)} disabled={createRefundMutation.isPending}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSubmit(onSubmitRefund)}
              disabled={createRefundMutation.isPending || verifiedBanks.length === 0}
            >
              {createRefundMutation.isPending && <Spinner size="sm" className="text-white" />}
              Submit Request
            </button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          {verifiedBanks.length === 0 ? (
            <p className="text-sm text-gray-500">
              Add a bank account under <Link to={ROUTES.DOCUMENTS} className="text-primary-600 hover:underline">Documents</Link> before requesting a refund.
            </p>
          ) : (
            <>
              <Input
                label="Amount (₹)"
                type="number"
                required
                error={errors.amount?.message}
                {...register('amount', {
                  required: 'Amount is required',
                  valueAsNumber: true,
                  min: { value: 1, message: 'Amount must be greater than 0' },
                  max: { value: availableBalance, message: `Cannot exceed available balance of ${formatCurrency(availableBalance)}` },
                })}
              />
              <Select
                label="Bank account"
                required
                options={verifiedBanks.map((b) => ({ value: b.id, label: `${b.bankName} •••• ${b.accountNumber.slice(-4)}` }))}
                placeholder="Select bank account"
                error={errors.bankAccountId?.message}
                {...register('bankAccountId', { required: 'Bank account is required' })}
              />
              <Textarea
                label="Reason"
                hint="Optional"
                rows={3}
                {...register('reason')}
              />
              <p className="text-sm text-gray-500">
                Available balance: <span className="font-medium text-gray-900">{formatCurrency(availableBalance)}</span>
              </p>
            </>
          )}
        </form>
      </Modal>

      {/* Refund history */}
      <div>
        <h2 className="section-title mb-4">Refund History</h2>

        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : refunds.length === 0 ? (
          <EmptyState
            title="No refund requests yet"
            description="Requests to cash out your wallet balance will appear here."
            icon={
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            }
          />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">Amount</th>
                  <th className="table-th">Reason</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Requested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {refunds.map((refund) => (
                  <tr key={refund.id} className="table-tr">
                    <td className="table-td font-semibold text-gray-900">{formatCurrency(refund.amount)}</td>
                    <td className="table-td text-gray-500">
                      {refund.reason ?? '—'}
                      {refund.status === 'REJECTED' && refund.rejectionReason && (
                        <p className="mt-1 text-xs text-red-600">{refund.rejectionReason}</p>
                      )}
                    </td>
                    <td className="table-td">
                      <StatusBadge status={refund.status} />
                    </td>
                    <td className="table-td text-gray-500">
                      {formatDateTime(refund.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
