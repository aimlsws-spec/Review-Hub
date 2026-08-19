import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { merchantApi } from '@/api/merchant.api'
import { useAuthStore } from '@/stores/auth.store'
import { QUERY_KEYS } from '@/constants'
import type { Merchant } from '@/types'

/** The merchant's own business profile (ProfilePage). */
export function useMerchantProfileQuery() {
  const merchantId = useAuthStore((s) => s.merchant?.id)
  return useQuery({
    queryKey: QUERY_KEYS.MERCHANT_PROFILE,
    queryFn: () => merchantApi.getProfile(),
    enabled: !!merchantId,
  })
}

export function useUpdateMerchantProfileMutation(onSuccess?: () => void) {
  const merchantId = useAuthStore((s) => s.merchant?.id)
  const setMerchant = useAuthStore((s) => s.setMerchant)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Partial<Merchant>) => merchantApi.updateProfile(merchantId!, input),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MERCHANT_PROFILE })
      toast.success('Profile updated')
      if (res.data?.data && setMerchant) setMerchant(res.data.data)
      onSuccess?.()
    },
    onError: () => toast.error('Failed to update profile'),
  })
}
