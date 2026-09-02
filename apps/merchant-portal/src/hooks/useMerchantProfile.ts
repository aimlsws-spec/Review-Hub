import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { merchantApi, type RegisterMerchantInput } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'
import { useAuthStore } from '@/stores/auth.store'
import type { Merchant } from '@/types'
import { getApiErrorMessage } from '@/utils'

/** The merchant's own business profile (ProfilePage). */
export function useMerchantProfileQuery() {
  const merchantId = useAuthStore((s) => s.merchant?.id)
  return useQuery({
    queryKey: QUERY_KEYS.MERCHANT_PROFILE,
    queryFn: () => merchantApi.getProfile(),
    enabled: !!merchantId,
  })
}

/** First-time setup: creates the merchant business profile behind the logged-in user. */
export function useRegisterMerchantMutation(onSuccess?: () => void) {
  const setMerchant = useAuthStore((s) => s.setMerchant)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: RegisterMerchantInput) => merchantApi.register(input),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MERCHANT_PROFILE })
      if (res.data?.data) setMerchant(res.data.data)
      toast.success('Merchant profile created')
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
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
