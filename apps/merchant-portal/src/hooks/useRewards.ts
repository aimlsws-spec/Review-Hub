import { useQuery } from '@tanstack/react-query'
import { merchantApi } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'

export function useMerchantRewardsQuery(merchantId: string | undefined, page: number, limit: number) {
  return useQuery({
    queryKey: [...QUERY_KEYS.MERCHANT_REWARDS, page],
    queryFn: () => merchantApi.getMerchantRewards(merchantId!, { page, limit }),
    enabled: !!merchantId,
  })
}
