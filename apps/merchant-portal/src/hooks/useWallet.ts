import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { merchantApi } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage } from '@/utils'
import { loadRazorpayCheckout, openRazorpayCheckout } from '@/utils/razorpay'
import type { Merchant } from '@/types'

export function useWalletQuery(merchantId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.WALLET,
    queryFn: () => merchantApi.getWallet(merchantId!),
    enabled: !!merchantId,
  })
}

export function useTransactionsQuery(merchantId: string | undefined, page: number, limit: number) {
  return useQuery({
    queryKey: [...QUERY_KEYS.TRANSACTIONS, page],
    queryFn: () => merchantApi.getTransactions(merchantId!, { page, limit }),
    enabled: !!merchantId,
  })
}

interface RechargeVerifyInput {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

/**
 * Wallet recharge flow: creates a Razorpay order, opens the checkout widget, then
 * verifies the payment. The Razorpay orchestration itself lives in utils/razorpay.ts
 * (left untouched — payment code is sensitive); this hook only owns the data-fetching
 * or, cache-invalidation and mutation wiring around it.
 */
export function useWalletMutations(merchantId: string | undefined, merchant: Merchant | null | undefined, options?: {
  onRechargeStart?: () => void
}) {
  const queryClient = useQueryClient()

  const refreshWallet = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WALLET })
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSACTIONS })
  }

  const verifyMutation = useMutation({
    mutationFn: (data: RechargeVerifyInput) => merchantApi.verifyRecharge(merchantId!, data),
    onSuccess: () => {
      toast.success('Funds added to your wallet')
      refreshWallet()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const rechargeMutation = useMutation({
    mutationFn: (amount: number) => merchantApi.createRecharge(merchantId!, amount),
    onSuccess: async (res) => {
      const order = res.data.data
      try {
        await loadRazorpayCheckout()
      } catch {
        toast.error('Could not load the payment gateway. Please try again.')
        return
      }

      options?.onRechargeStart?.()
      openRazorpayCheckout({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        order_id: order.razorpayOrderId,
        name: 'VIRAL KAR',
        description: 'Wallet recharge',
        prefill: { name: merchant?.businessName, email: merchant?.email, contact: merchant?.phone },
        theme: { color: '#4f46e5' },
        handler: (response) =>
          verifyMutation.mutate({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          }),
        modal: { ondismiss: () => refreshWallet() },
      })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  return { verifyMutation, rechargeMutation, refreshWallet }
}
