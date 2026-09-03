import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { merchantApi, type CreateRefundInput } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage } from '@/utils'

export function useRefundsQuery(merchantId: string | undefined, page: number, limit: number) {
  return useQuery({
    queryKey: [...QUERY_KEYS.REFUNDS, page],
    queryFn: () => merchantApi.getRefunds(merchantId!, { page, limit }),
    enabled: !!merchantId,
  })
}

export function useCreateRefundMutation(merchantId: string | undefined, onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateRefundInput) => merchantApi.createRefund(merchantId!, data),
    onSuccess: () => {
      toast.success('Refund request submitted')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REFUNDS })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WALLET })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
