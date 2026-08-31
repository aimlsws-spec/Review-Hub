import { useQuery } from '@tanstack/react-query'

import { merchantApi } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'
import type { CustomerStatus, CustomerType } from '@/types/customer'

interface CustomersQueryParams {
  page: number
  limit: number
  search?: string
  status?: CustomerStatus
  type?: CustomerType
}

export function useCustomersQuery(merchantId: string | undefined, params: CustomersQueryParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.CUSTOMERS, merchantId, params],
    queryFn: () => merchantApi.getCustomers(merchantId!, params),
    enabled: !!merchantId,
  })
}

export function useCustomerStatsQuery(merchantId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEYS.CUSTOMER_STATS, merchantId],
    queryFn: () => merchantApi.getCustomerStats(merchantId!),
    enabled: !!merchantId,
  })
}
