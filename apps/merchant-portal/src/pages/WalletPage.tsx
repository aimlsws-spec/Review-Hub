import { StatusBadge, EmptyState, ErrorState, CardSkeleton, TableSkeleton, Pagination, Modal, Input, Spinner } from '@reviewhub/shared-ui'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { TRANSACTION_TYPE_LABELS, ITEMS_PER_PAGE } from '@/constants'
import { useWalletQuery, useTransactionsQuery, useWalletMutations } from '@/hooks/useWallet'
import { useAuthStore } from '@/stores/auth.store'
import { formatCurrency, formatDateTime , cn } from '@/utils'

interface RechargeFormValues {
  amount: number
}

export default function WalletPage() {
  const merchantId = useAuthStore((s) => s.merchant?.id)
  const merchant = useAuthStore((s) => s.merchant)
  const [page, setPage] = useState(1)
  const [rechargeOpen, setRechargeOpen] = useState(false)

  const { data: walletData, isLoading: walletLoading } = useWalletQuery(merchantId)
  const { data: txData, isLoading: txLoading, isError, refetch } = useTransactionsQuery(merchantId, page, ITEMS_PER_PAGE)

  const wallet = walletData?.data?.data
  const transactions = txData?.data?.data?.data ?? []
  const total = txData?.data?.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RechargeFormValues>({ defaultValues: { amount: 5000 } })

  const { rechargeMutation } = useWalletMutations(merchantId, merchant, {
    onRechargeStart: () => setRechargeOpen(false),
  })

  const onSubmitRecharge = (values: RechargeFormValues) => {
    rechargeMutation.mutate(Number(values.amount))
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Wallet</h1>
          <p className="page-subtitle">Manage your campaign budget and transaction history.</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            reset({ amount: 5000 })
            setRechargeOpen(true)
          }}
        >
          Add Funds
        </button>
      </div>

      <Modal
        open={rechargeOpen}
        onClose={() => setRechargeOpen(false)}
        title="Add Funds"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setRechargeOpen(false)} disabled={rechargeMutation.isPending}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSubmit(onSubmitRecharge)}
              disabled={rechargeMutation.isPending}
            >
              {rechargeMutation.isPending && <Spinner size="sm" className="text-white" />}
              {rechargeMutation.isPending ? 'Redirecting…' : 'Proceed to Pay'}
            </button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Input
            label="Amount (₹)"
            type="number"
            required
            error={errors.amount?.message}
            {...register('amount', {
              required: 'Amount is required',
              valueAsNumber: true,
              min: { value: 100, message: 'Minimum recharge amount is ₹100' },
            })}
          />
          <p className="text-sm text-gray-500">
            You'll be redirected to Razorpay Checkout to complete the payment securely.
          </p>
        </form>
      </Modal>

      {/* Balance cards */}
      {walletLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : wallet ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="card p-5">
            <p className="text-sm text-gray-500">Available Balance</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatCurrency(wallet.availableBalance)}
            </p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-gray-500">Reserved Balance</p>
            <p className="mt-1 text-2xl font-bold text-yellow-600">
              {formatCurrency(wallet.reservedBalance)}
            </p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-gray-500">Total Top-up</p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {formatCurrency(wallet.totalTopUp)}
            </p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-gray-500">Total Spent</p>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {formatCurrency(wallet.totalSpent)}
            </p>
          </div>
        </div>
      ) : null}

      {/* Transactions */}
      <div>
        <h2 className="section-title mb-4">Transaction History</h2>

        {txLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : transactions.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            description="Your wallet transactions will appear here once you start campaigns."
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
                  <th className="table-th">Transaction ID</th>
                  <th className="table-th">Type</th>
                  <th className="table-th">Amount</th>
                  <th className="table-th">Balance After</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="table-tr">
                    <td className="table-td font-mono text-xs text-gray-500">
                      {tx.id.slice(0, 8)}…
                    </td>
                    <td className="table-td">
                      <span className={cn(
                        'badge',
                        tx.type === 'CREDIT' || tx.type === 'BONUS' || tx.type === 'REFERRAL'
                          ? 'badge-green'
                          : tx.type === 'DEBIT' || tx.type === 'WITHDRAWAL'
                          ? 'badge-red'
                          : 'badge-yellow',
                      )}>
                        {TRANSACTION_TYPE_LABELS[tx.type] ?? tx.type}
                      </span>
                    </td>
                    <td className={cn(
                      'table-td font-semibold',
                      tx.type === 'CREDIT' || tx.type === 'BONUS' ? 'text-green-600' : 'text-red-600',
                    )}>
                      {tx.type === 'CREDIT' || tx.type === 'BONUS' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="table-td">{formatCurrency(tx.balanceAfter)}</td>
                    <td className="table-td">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="table-td text-gray-500">
                      {formatDateTime(tx.createdAt)}
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
